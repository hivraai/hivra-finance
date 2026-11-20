import { CORS, resourceMetadata } from '@/lib/mcp/metadata';

export const GET = (req: Request) => Response.json(resourceMetadata(req), { headers: CORS });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
