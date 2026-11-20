// Validates an /oauth/authorize request. Never redirects to a URI the client did not register.
import 'server-only';
import { getClient } from './oauth';

export type AuthorizeRequest = { clientId: string; clientName: string; redirectUri: string; challenge: string; state: string };

export async function parseAuthorize(q: URLSearchParams): Promise<AuthorizeRequest | { error: string }> {
    const clientId = q.get('client_id') ?? '';
    const redirectUri = q.get('redirect_uri') ?? '';
    const client = clientId ? await getClient(clientId) : null;
    if (!client) return { error: 'Unknown application. Remove the connector and add it again.' };
    if (!client.redirectUris.includes(redirectUri)) return { error: 'This application asked to return to an address it did not register.' };
    if (q.get('response_type') !== 'code') return { error: 'Unsupported response type.' };
    const challenge = q.get('code_challenge') ?? '';
    if (!challenge || (q.get('code_challenge_method') ?? 'S256') !== 'S256') return { error: 'PKCE (S256) is required.' };
    return { clientId, clientName: client.name, redirectUri, challenge, state: q.get('state') ?? '' };
}

export function withParams(uri: string, p: Record<string, string>) {
    const u = new URL(uri);
    for (const [k, v] of Object.entries(p)) if (v) u.searchParams.set(k, v);
    return u.toString();
}

export const RETURN_COOKIE = 'hf_oauth_return';
