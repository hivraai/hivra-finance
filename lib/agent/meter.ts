// The AI meter: API cost × 5, in credits (1,000 credits = US$1), counted per user per month.
// Plans: Free has a small monthly allowance; Pro and Elite get more once checkout ships.
import 'server-only';
import { connectToDatabase } from '@/database/mongoose';
import { aiUsageModel } from '@/database/models/agent.model';

export const MARKUP = 5;
export const CREDITS_PER_USD = 1000;

// US$ per million tokens (platform pricing, 2026-11).
const PRICES: Record<string, { in: number; out: number; cacheRead: number; cacheWrite: number }> = {
    'claude-opus-5-5': { in: 4, out: 20, cacheRead: 0.2, cacheWrite: 5 },
    'claude-sonnet-5-5': { in: 2, out: 10, cacheRead: 0.1, cacheWrite: 2.5 },
};
const WEB_SEARCH_USD = 0.01; // per search

export type Usage = {
    input_tokens: number; output_tokens: number;
    cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null;
    server_tool_use?: { web_search_requests?: number | null } | null;
};

export function costUsd(model: string, u: Usage): number {
    const p = PRICES[model] ?? PRICES['claude-opus-5-5'];
    return (u.input_tokens * p.in + u.output_tokens * p.out
        + (u.cache_read_input_tokens ?? 0) * p.cacheRead + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) / 1e6
        + (u.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_USD;
}

export const creditsFor = (usd: number) => Math.ceil(usd * MARKUP * CREDITS_PER_USD);

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);

export type Plan = 'free' | 'pro' | 'elite' | 'unlimited';
export const ALLOWANCE: Record<Plan, number> = {
    free: Number(process.env.AGENT_FREE_CREDITS ?? 2500),
    pro: Number(process.env.AGENT_PRO_CREDITS ?? 25000),
    elite: Number(process.env.AGENT_ELITE_CREDITS ?? 100000),
    unlimited: Number.POSITIVE_INFINITY,
};

// Until Stripe checkout ships everyone is Free, except the team (AGENT_UNLIMITED_EMAILS, comma separated).
export function planFor(email: string | null | undefined): Plan {
    const team = (process.env.AGENT_UNLIMITED_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    return email && team.includes(email.toLowerCase()) ? 'unlimited' : 'free';
}

export async function creditsUsed(userId: string): Promise<number> {
    const db = await connectToDatabase();
    const row = await aiUsageModel(db).findOne({ userId, month: monthKey() }).lean();
    return row?.credits ?? 0;
}

export async function record(userId: string, model: string, u: Usage): Promise<number> {
    const usd = costUsd(model, u);
    const credits = creditsFor(usd);
    const db = await connectToDatabase();
    await aiUsageModel(db).updateOne(
        { userId, month: monthKey() },
        { $inc: { credits, costUsd: usd, requests: 1, inputTokens: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), outputTokens: u.output_tokens } },
        { upsert: true },
    );
    return credits;
}
