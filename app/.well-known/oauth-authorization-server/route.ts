import { CORS, authServerMetadata } from '@/lib/mcp/metadata';

export const GET = (req: Request) => Response.json(authServerMetadata(req), { headers: CORS });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
