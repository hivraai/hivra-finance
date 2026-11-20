// OAuth 2.1 for the MCP server, so Claude and ChatGPT can connect a member's account:
// dynamic client registration → /oauth/authorize (the member approves) → code + PKCE (S256) →
// access + refresh token. Only SHA-256 hashes of codes and tokens are stored.
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { connectToDatabase } from '@/database/mongoose';

export const ACCESS_TTL_S = 30 * 24 * 3600;
const REFRESH_TTL_S = 180 * 24 * 3600;
const CODE_TTL_S = 600;

type Client = { _id: string; name: string; redirectUris: string[]; createdAt: Date };
type Code = { _id: string; clientId: string; userId: string; email: string; redirectUri: string; challenge: string; expiresAt: Date };
export type Grant = {
    _id: string; // hash of the access token
    refreshHash: string; clientId: string; clientName: string; userId: string; email: string;
    createdAt: Date; expiresAt: Date; refreshExpiresAt: Date; lastUsedAt: Date | null; revokedAt: Date | null;
};

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const token = (prefix: string) => `${prefix}_${randomBytes(32).toString('base64url')}`;

async function col<T extends { _id: string }>(name: string) {
    const db = (await connectToDatabase()).connection.db;
    if (!db) throw new Error('Database unavailable');
    return db.collection<T>(name);
}

export function appOrigin(req?: Request): string {
    const env = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
    if (env) return env.replace(/\/$/, '');
    return req ? new URL(req.url).origin : 'https://finance.hivra.ai';
}

// Claude and ChatGPT callbacks are https; localhost is allowed for local MCP clients.
const okRedirect = (u: string) => { try { const x = new URL(u); return x.protocol === 'https:' || (x.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(x.hostname)); } catch { return false; } };

export async function registerClient(name: unknown, redirectUris: unknown) {
    const uris = Array.isArray(redirectUris) ? redirectUris.map(String).filter(okRedirect).slice(0, 10) : [];
    if (!uris.length) return null;
    const client: Client = { _id: `cl_${randomBytes(16).toString('hex')}`, name: String(name ?? 'AI assistant').slice(0, 80), redirectUris: uris, createdAt: new Date() };
    await (await col<Client>('oauth_clients')).insertOne(client);
    return client;
}

export async function getClient(id: string) {
    return (await col<Client>('oauth_clients')).findOne({ _id: String(id) });
}

export async function createCode(p: { clientId: string; userId: string; email: string; redirectUri: string; challenge: string }) {
    const code = token('code');
    const c = await col<Code>('oauth_codes');
    c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => null);
    await c.insertOne({ _id: sha(code), ...p, expiresAt: new Date(Date.now() + CODE_TTL_S * 1000) });
    return code;
}

async function issue(clientId: string, clientName: string, userId: string, email: string) {
    const access = token('hf_at'), refresh = token('hf_rt');
    const now = Date.now();
    await (await col<Grant>('oauth_grants')).insertOne({
        _id: sha(access), refreshHash: sha(refresh), clientId, clientName, userId, email,
        createdAt: new Date(now), expiresAt: new Date(now + ACCESS_TTL_S * 1000), refreshExpiresAt: new Date(now + REFRESH_TTL_S * 1000),
        lastUsedAt: null, revokedAt: null,
    });
    return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_S, refresh_token: refresh };
}

export async function exchangeCode(code: string, clientId: string, redirectUri: string, verifier: string) {
    const c = await col<Code>('oauth_codes');
    const row = await c.findOneAndDelete({ _id: sha(code) }); // single use
    if (!row || row.expiresAt < new Date() || row.clientId !== clientId || row.redirectUri !== redirectUri) return null;
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (challenge !== row.challenge) return null;
    const client = await getClient(clientId);
    return issue(clientId, client?.name ?? 'AI assistant', row.userId, row.email);
}

// Refresh tokens rotate: the old grant is revoked and a new pair is issued.
export async function refreshGrant(refresh: string, clientId: string) {
    const g = await col<Grant>('oauth_grants');
    const row = await g.findOneAndUpdate({ refreshHash: sha(refresh), clientId, revokedAt: null, refreshExpiresAt: { $gt: new Date() } }, { $set: { revokedAt: new Date() } });
    if (!row) return null;
    return issue(row.clientId, row.clientName, row.userId, row.email);
}

export async function verifyAccess(bearer: string | null) {
    if (!bearer?.startsWith('hf_at_')) return null;
    const g = await col<Grant>('oauth_grants');
    const row = await g.findOne({ _id: sha(bearer), revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!row) return null;
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 5 * 60_000) g.updateOne({ _id: row._id }, { $set: { lastUsedAt: new Date() } }).catch(() => null);
    return row;
}

export async function listGrants(userId: string) {
    const g = await col<Grant>('oauth_grants');
    return g.find({ userId, revokedAt: null, refreshExpiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(50).toArray();
}

// Disconnect every live grant of that assistant for this member (refreshes created new rows).
export async function revokeClient(userId: string, clientId: string) {
    await (await col<Grant>('oauth_grants')).updateMany({ userId, clientId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
