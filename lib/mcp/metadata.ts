// OAuth discovery documents for the MCP server (RFC 9728 protected resource, RFC 8414 authorization server).
import { appOrigin } from './oauth';

export const SCOPES = ['finance'];

export function resourceMetadata(req: Request) {
    const o = appOrigin(req);
    return { resource: `${o}/api/mcp`, authorization_servers: [o], scopes_supported: SCOPES, bearer_methods_supported: ['header'], resource_name: 'HIVRA Finance' };
}

export function authServerMetadata(req: Request) {
    const o = appOrigin(req);
    return {
        issuer: o,
        authorization_endpoint: `${o}/oauth/authorize`,
        token_endpoint: `${o}/api/oauth/token`,
        registration_endpoint: `${o}/api/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: SCOPES,
    };
}

export const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version' };
