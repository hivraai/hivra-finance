// HIVRA Finance MCP server (Streamable HTTP, stateless JSON-RPC). Claude and ChatGPT connect here
// after the member approves them ("Connect your AI"), by text or by voice in their apps.
// The tools are the AI analyst's own (lib/agent/tools.ts, which includes the market signals), so
// the analyst, the MCP and the screens always describe the same numbers. Plan gates are the same:
// market signals need Pro or Elite, new option chains need a paid plan.
import { TOOL_DEFS, runTool } from '@/lib/agent/tools';
import { getAccount } from '@/lib/agent/meter';
import { verifyAccess, appOrigin } from '@/lib/mcp/oauth';
import { CORS } from '@/lib/mcp/metadata';
import { isRateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 120;

const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

const TITLES: Record<string, string> = {
    get_technicals: 'Technicals', get_option_chain: 'Option chain', analyze_option_strategy: 'Analyze option strategy',
    backtest_stock: 'Backtest a stock rule', backtest_options: 'Backtest an options strategy', get_market_signals: 'Market signals',
};

const INSTRUCTIONS = `HIVRA Finance: research tools for US stocks, ETFs and options. Prices and option chains are end-of-day (say the data date). Market signals (whale orders, flow, GEX, IV rank, dark pool, earnings, short interest, ETF flow, congress and insider trades, FDA catalysts, macro calendar) need a Pro or Elite plan and cover recorded large orders, not the full tape. These tools never place trades. Present findings as research, not personal financial advice: options trading involves substantial risk of loss and past flow signals do not guarantee future results.`;

type Rpc = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };

const ok = (id: Rpc['id'], result: unknown) => ({ jsonrpc: '2.0', id: id ?? null, result });
const err = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function unauthorized(req: Request) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...CORS, 'content-type': 'application/json', 'WWW-Authenticate': `Bearer resource_metadata="${appOrigin(req)}/.well-known/oauth-protected-resource/api/mcp"` },
    });
}

async function handle(m: Rpc, ctx: { userId: string; paid: boolean }) {
    switch (m.method) {
        case 'initialize': {
            const asked = String(m.params?.protocolVersion ?? '');
            return ok(m.id, {
                protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[1],
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: 'hivra-finance', title: 'HIVRA Finance', version: '1.0.0' },
                instructions: INSTRUCTIONS,
            });
        }
        case 'ping': return ok(m.id, {});
        case 'tools/list':
            return ok(m.id, {
                tools: TOOL_DEFS.map((t) => ({
                    name: t.name, title: TITLES[t.name] ?? t.name, description: t.description, inputSchema: t.input_schema,
                    annotations: { title: TITLES[t.name] ?? t.name, readOnlyHint: true, destructiveHint: false, openWorldHint: false },
                })),
            });
        case 'tools/call': {
            const name = String(m.params?.name ?? '');
            if (!TOOL_DEFS.some((t) => t.name === name)) return err(m.id, -32602, `Unknown tool ${name}`);
            if (await isRateLimited(`mcp:${ctx.userId}`, 120, 3600)) {
                return ok(m.id, { content: [{ type: 'text', text: 'Too many requests this hour. Try again later.' }], isError: true });
            }
            try {
                const out = await runTool(name, (m.params?.arguments ?? {}) as Record<string, unknown>, { paid: ctx.paid });
                return ok(m.id, { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out });
            } catch (e) {
                return ok(m.id, { content: [{ type: 'text', text: e instanceof Error ? e.message : 'Tool failed' }], isError: true });
            }
        }
        default:
            return err(m.id, -32601, `Method not found: ${m.method}`);
    }
}

export async function POST(req: Request) {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
    const grant = await verifyAccess(bearer);
    if (!grant) return unauthorized(req);
    const account = await getAccount(grant.userId, grant.email);
    const ctx = { userId: grant.userId, paid: account.plan !== 'free' };

    const body = await req.json().catch(() => null) as Rpc | Rpc[] | null;
    if (!body) return Response.json(err(null, -32700, 'Parse error'), { status: 400, headers: CORS });
    const list = Array.isArray(body) ? body : [body];
    const replies = [];
    for (const m of list) {
        if (m.id === undefined || m.id === null) continue; // notifications (e.g. notifications/initialized) get no reply
        replies.push(await handle(m, ctx));
    }
    if (!replies.length) return new Response(null, { status: 202, headers: CORS });
    return Response.json(Array.isArray(body) ? replies : replies[0], { headers: CORS });
}

// No server-initiated stream: this server is stateless.
export const GET = () => new Response('Method Not Allowed', { status: 405, headers: { ...CORS, Allow: 'POST' } });
export const DELETE = () => new Response(null, { status: 405, headers: CORS });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
