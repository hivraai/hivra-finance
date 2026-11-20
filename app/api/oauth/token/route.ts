// Token endpoint: authorization_code (with PKCE) and refresh_token. Public clients, no secret.
import { exchangeCode, refreshGrant } from '@/lib/mcp/oauth';
import { CORS } from '@/lib/mcp/metadata';

async function params(req: Request): Promise<Record<string, string>> {
    const type = req.headers.get('content-type') ?? '';
    if (type.includes('application/json')) return Object.fromEntries(Object.entries(await req.json().catch(() => ({}))).map(([k, v]) => [k, String(v)]));
    return Object.fromEntries(new URLSearchParams(await req.text()));
}

const fail = (error: string) => Response.json({ error }, { status: 400, headers: { ...CORS, 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
    const p = await params(req);
    const headers = { ...CORS, 'Cache-Control': 'no-store' };
    if (p.grant_type === 'authorization_code') {
        if (!p.code || !p.client_id || !p.redirect_uri || !p.code_verifier) return fail('invalid_request');
        const out = await exchangeCode(p.code, p.client_id, p.redirect_uri, p.code_verifier);
        return out ? Response.json(out, { headers }) : fail('invalid_grant');
    }
    if (p.grant_type === 'refresh_token') {
        if (!p.refresh_token || !p.client_id) return fail('invalid_request');
        const out = await refreshGrant(p.refresh_token, p.client_id);
        return out ? Response.json(out, { headers }) : fail('invalid_grant');
    }
    return fail('unsupported_grant_type');
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
