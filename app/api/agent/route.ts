// The investing agent: a conversation with Claude that can read our technicals, option chains,
// strategy maths and backtests. Streams NDJSON events to the browser:
//   {type:'thread', id} {type:'text', text} {type:'tool', name, input} {type:'done', credits, used, allowance}
//   {type:'error', message}
// Every model call is metered (API cost × 5, in credits) against the user's monthly allowance.
import Anthropic from '@anthropic-ai/sdk';
import { Types } from 'mongoose';
import { getSession } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { agentThreadModel } from '@/database/models/agent.model';
import { ALLOWANCE, creditsUsed, planFor, record } from '@/lib/agent/meter';
import { TOOL_DEFS, runTool } from '@/lib/agent/tools';
import { isRateLimited } from '@/lib/rate-limit';
import { displayItems } from '@/lib/agent/display';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MODEL = 'claude-opus-5-5';
const MAX_STEPS = 10;

const SYSTEM = `You are the HIVRA Finance analyst: an AI research assistant for stocks, ETFs and options.

What you can do: read daily technicals, option chains as of the last close (bid, ask, mid, implied volatility, delta), price multi-leg option strategies (max profit and loss, breakevens, Greeks), and backtest stock rules on real daily prices since 2018 and option strategies with a Black-Scholes model. You can search the web for news.

How to work:
- Call the tools for any number you quote. Never invent prices, strikes, IV or results.
- Say the data date ("as of the 18 Nov close"). Chains and prices are end-of-day, not live.
- When you suggest an option trade, check it with analyze_option_strategy on real strikes and give the net premium, max profit, max loss and breakevens.
- Modelled option backtests are estimates, not historical option quotes. Say so when you use one.
- Be direct and concrete: lead with the answer, then the numbers that support it, in short paragraphs or a compact table.
- If a tool fails, retry it once silently; if it fails again, say that data is unavailable. Do not narrate retries or tool mechanics.
- Reply in the language the user writes in.
- You are research software, not a broker or an adviser. You never place trades. You may give a view and the trade-offs; end investment ideas with one short line that this is not personal financial advice. Do not repeat that line more than once per reply.`;

const json = (o: unknown) => JSON.stringify(o) + '\n';

export async function GET(req: Request) {
    const session = await getSession();
    if (!session?.user) return Response.json({ error: 'Sign in' }, { status: 401 });
    const userId = session.user.id;
    const db = await connectToDatabase();
    const Thread = agentThreadModel(db);
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
        if (!Types.ObjectId.isValid(id)) return Response.json({ error: 'Not found' }, { status: 404 });
        const t = await Thread.findOne({ _id: id, userId }).lean();
        if (!t) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ id, title: t.title, symbol: t.symbol, items: displayItems(t.messages as Anthropic.MessageParam[]) });
    }
    const plan = planFor(session.user.email);
    const [threads, used] = await Promise.all([
        Thread.find({ userId }, { title: 1, symbol: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(30).lean(),
        creditsUsed(userId),
    ]);
    return Response.json({
        threads: threads.map((t) => ({ id: String(t._id), title: t.title, symbol: t.symbol, updatedAt: t.updatedAt })),
        used, allowance: Number.isFinite(ALLOWANCE[plan]) ? ALLOWANCE[plan] : null, plan,
    });
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.user) return Response.json({ error: 'Sign in' }, { status: 401 });
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'The AI is not configured yet' }, { status: 503 });
    const userId = session.user.id;

    const body = await req.json().catch(() => ({})) as { threadId?: string; message?: string; symbol?: string };
    const message = String(body.message ?? '').trim().slice(0, 4000);
    if (!message) return Response.json({ error: 'Empty message' }, { status: 400 });
    const symbol = typeof body.symbol === 'string' && /^[A-Z][A-Z0-9.]{0,9}$/.test(body.symbol) ? body.symbol : undefined;

    if (await isRateLimited(`agent:${userId}`, 20, 600)) return Response.json({ error: 'Too many questions in a short time. Try again in a few minutes.' }, { status: 429 });

    const plan = planFor(session.user.email);
    const allowance = ALLOWANCE[plan];
    const usedBefore = await creditsUsed(userId);
    if (usedBefore >= allowance) {
        return Response.json({ error: 'You have used this month\'s AI credits. Upgrade to Pro for more.', used: usedBefore, allowance }, { status: 402 });
    }

    const db = await connectToDatabase();
    const Thread = agentThreadModel(db);
    let thread = body.threadId && Types.ObjectId.isValid(body.threadId) ? await Thread.findOne({ _id: body.threadId, userId }) : null;
    if (!thread) thread = new Thread({ userId, title: message.slice(0, 70), symbol, messages: [] });

    const messages = [...(thread.messages as Anthropic.MessageParam[])];
    const context = symbol ? `[The user is looking at ${symbol}.]\n` : '';
    messages.push({ role: 'user', content: context + message });

    const client = new Anthropic();
    const tools = [
        ...TOOL_DEFS.map((t) => t as unknown as Anthropic.Tool),
        { type: 'web_search_20260209', name: 'web_search', max_uses: 3 } as unknown as Anthropic.Tool,
    ];

    const stream = new ReadableStream({
        async start(controller) {
            const send = (o: unknown) => controller.enqueue(new TextEncoder().encode(json(o)));
            let credits = 0;
            try {
                await thread.save();
                send({ type: 'thread', id: String(thread._id) });
                for (let step = 0; step < MAX_STEPS; step++) {
                    const s = client.messages.stream({
                        model: MODEL,
                        max_tokens: 16000,
                        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
                        tools,
                        messages,
                    });
                    s.on('text', (text) => send({ type: 'text', text }));
                    const msg = await s.finalMessage();
                    credits += await record(userId, MODEL, msg.usage as Parameters<typeof record>[2]);
                    messages.push({ role: 'assistant', content: msg.content as Anthropic.ContentBlockParam[] });

                    if (msg.stop_reason === 'pause_turn') continue;
                    if (msg.stop_reason === 'refusal') { send({ type: 'text', text: '\n\nI can’t help with that one.' }); break; }
                    if (msg.stop_reason !== 'tool_use') {
                        if (msg.stop_reason === 'max_tokens') send({ type: 'text', text: '\n\n(The answer was cut off. Ask me to continue.)' });
                        break;
                    }
                    const results: Anthropic.ToolResultBlockParam[] = [];
                    for (const b of msg.content) {
                        if (b.type !== 'tool_use') continue;
                        send({ type: 'tool', name: b.name, input: b.input });
                        try {
                            const out = await runTool(b.name, (b.input ?? {}) as Record<string, unknown>);
                            results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out) });
                        } catch (e) {
                            results.push({ type: 'tool_result', tool_use_id: b.id, content: e instanceof Error ? e.message : 'Tool failed', is_error: true });
                        }
                    }
                    messages.push({ role: 'user', content: results });
                    if (step === MAX_STEPS - 1) send({ type: 'text', text: '\n\n(I stopped after many steps. Ask me to continue.)' });
                }
                thread.messages = messages;
                thread.creditsUsed = (thread.creditsUsed ?? 0) + credits;
                thread.markModified('messages');
                await thread.save();
                send({ type: 'done', credits, used: usedBefore + credits, allowance: Number.isFinite(allowance) ? allowance : null });
            } catch (e) {
                console.error('[agent]', e);
                send({ type: 'error', message: 'The AI hit an error. Try again.' });
            } finally {
                controller.close();
            }
        },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
