// The AI meter: API cost × 5, in credits (1,000 credits = US$1), counted per user per month.
// Plans come from the Stripe webhook (database/models/billing.model.ts); bought credits top it up.
import 'server-only';
import { connectToDatabase } from '@/database/mongoose';
import { aiUsageModel } from '@/database/models/agent.model';
import { billingModel } from '@/database/models/billing.model';

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
// Monthly AI credits per plan (1,000 credits = US$1 of billed usage). Env overrides for tuning.
export const ALLOWANCE: Record<Plan, number> = {
    free: Number(process.env.AGENT_FREE_CREDITS ?? 2500),
    pro: Number(process.env.AGENT_PRO_CREDITS ?? 50000),
    elite: Number(process.env.AGENT_ELITE_CREDITS ?? 150000),
    unlimited: Number.POSITIVE_INFINITY,
};
// Backtest reports per month.
export const BACKTESTS: Record<Plan, number> = {
    free: Number(process.env.BACKTESTS_FREE ?? 3),
    pro: Number(process.env.BACKTESTS_PRO ?? 20),
    elite: Number.POSITIVE_INFINITY,
    unlimited: Number.POSITIVE_INFINITY,
};

const isTeam = (email: string | null | undefined) => {
    const team = (process.env.AGENT_UNLIMITED_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    return Boolean(email && team.includes(email.toLowerCase()));
};

export type Account = { plan: Plan; bonus: number; status?: string; periodEnd?: string; cancelAtPeriodEnd?: boolean; customer: boolean };

// The user's plan (set only by the Stripe webhook) and bought credits. The team is unlimited.
export async function getAccount(userId: string, email: string | null | undefined): Promise<Account> {
    const db = await connectToDatabase();
    const row = await billingModel(db).findOne({ userId }).lean();
    const paid = row?.plan === 'pro' || row?.plan === 'elite' ? row.plan : 'free';
    return {
        plan: isTeam(email) ? 'unlimited' : paid,
        bonus: Math.max(0, row?.bonusCredits ?? 0),
        status: row?.status,
        periodEnd: row?.currentPeriodEnd ? new Date(row.currentPeriodEnd).toISOString() : undefined,
        cancelAtPeriodEnd: row?.cancelAtPeriodEnd,
        customer: Boolean(row?.stripeCustomerId),
    };
}

// Monthly allowance plus bought credits: what the user can spend this month in total.
export const spendable = (a: Account) => ALLOWANCE[a.plan] + a.bonus;

export async function usage(userId: string): Promise<{ credits: number; backtests: number }> {
    const db = await connectToDatabase();
    const row = await aiUsageModel(db).findOne({ userId, month: monthKey() }).lean();
    return { credits: row?.credits ?? 0, backtests: row?.backtests ?? 0 };
}

export async function creditsUsed(userId: string): Promise<number> {
    return (await usage(userId)).credits;
}

// Meter one model call. Whatever goes past the monthly allowance comes out of the bought credits.
export async function record(userId: string, model: string, u: Usage, allowance = Number.POSITIVE_INFINITY): Promise<number> {
    const usd = costUsd(model, u);
    const credits = creditsFor(usd);
    const db = await connectToDatabase();
    const after = await aiUsageModel(db).findOneAndUpdate(
        { userId, month: monthKey() },
        { $inc: { credits, costUsd: usd, requests: 1, inputTokens: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), outputTokens: u.output_tokens } },
        { upsert: true, new: true },
    ).lean();
    const total = after?.credits ?? credits;
    const over = Math.min(credits, Math.max(0, total - allowance));
    if (over > 0) await billingModel(db).updateOne({ userId }, { $inc: { bonusCredits: -over } });
    return credits;
}

// Count one backtest against the month; false when the plan's limit is reached.
export async function takeBacktest(userId: string, plan: Plan): Promise<boolean> {
    const limit = BACKTESTS[plan];
    const db = await connectToDatabase();
    const Usage = aiUsageModel(db);
    await Usage.updateOne({ userId, month: monthKey() }, { $setOnInsert: { credits: 0 } }, { upsert: true });
    const filter = Number.isFinite(limit) ? { userId, month: monthKey(), backtests: { $not: { $gte: limit } } } : { userId, month: monthKey() };
    const r = await Usage.updateOne(filter, { $inc: { backtests: 1 } });
    return r.modifiedCount === 1;
}
