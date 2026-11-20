// Dynamic client registration (RFC 7591): Claude / ChatGPT register themselves before the member approves.
import { registerClient } from '@/lib/mcp/oauth';
import { CORS } from '@/lib/mcp/metadata';
import { clientIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
    if (await isRateLimited(`oauth-register:${await clientIp()}`, 30, 3600)) return Response.json({ error: 'too_many_requests' }, { status: 429, headers: CORS });
    const body = await req.json().catch(() => ({})) as { client_name?: string; redirect_uris?: string[] };
    const client = await registerClient(body.client_name, body.redirect_uris);
    if (!client) return Response.json({ error: 'invalid_redirect_uri' }, { status: 400, headers: CORS });
    return Response.json({
        client_id: client._id, client_name: client.name, redirect_uris: client.redirectUris,
        grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none',
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    }, { status: 201, headers: CORS });
}
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
