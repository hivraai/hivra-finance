// Stripe for HIVRA Finance: checkout, portal and the webhook's writers. The catalogue itself
// (prices, portal configuration, webhook endpoint) is created by scripts/stripe-setup.mjs.
import 'server-only';
import Stripe from 'stripe';
import { connectToDatabase } from '@/database/mongoose';
import { billingModel } from '@/database/models/billing.model';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://finance.hivra.ai';

let client: Stripe | null = null;
export function stripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
    return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}
export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_ELITE);

// What can be bought. Credit packs carry their credit count here, not from the browser.
export const ITEMS = {
    pro: { env: 'STRIPE_PRICE_PRO', mode: 'subscription' as const, plan: 'pro' as const },
    elite: { env: 'STRIPE_PRICE_ELITE', mode: 'subscription' as const, plan: 'elite' as const },
    credits_10k: { env: 'STRIPE_PRICE_CREDITS_10K', mode: 'payment' as const, credits: 10_000 },
    credits_25k: { env: 'STRIPE_PRICE_CREDITS_25K', mode: 'payment' as const, credits: 25_000 },
    credits_50k: { env: 'STRIPE_PRICE_CREDITS_50K', mode: 'payment' as const, credits: 50_000 },
};
export type ItemKey = keyof typeof ITEMS;

export function planForPrice(priceId: string | null | undefined): 'pro' | 'elite' | null {
    if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
    if (priceId && priceId === process.env.STRIPE_PRICE_ELITE) return 'elite';
    return null;
}

// The user's Stripe customer, created on first checkout and remembered on their billing row.
export async function customerFor(userId: string, email: string): Promise<string> {
    const db = await connectToDatabase();
    const Billing = billingModel(db);
    const row = await Billing.findOne({ userId }).lean();
    // A customer saved in the other Stripe mode (test before going live) does not exist here: make a new one.
    if (row?.stripeCustomerId) {
        try {
            const c = await stripe().customers.retrieve(row.stripeCustomerId);
            if (!('deleted' in c && c.deleted)) return c.id;
        } catch (e) {
            if ((e as { code?: string }).code !== 'resource_missing') throw e;
        }
    }
    const live = (process.env.STRIPE_SECRET_KEY ?? '').includes('_live_');
    const c = await stripe().customers.create({ email, metadata: { userId, app: 'hivra-finance' } }, { idempotencyKey: `hf-customer-${live ? 'live' : 'test'}-${userId}` });
    await Billing.updateOne({ userId }, { $set: { stripeCustomerId: c.id, email }, $setOnInsert: { plan: 'free', bonusCredits: 0 } }, { upsert: true });
    return c.id;
}

const PAID = new Set(['active', 'trialing', 'past_due']); // past_due keeps the plan while Stripe retries the card

// Mirror one subscription onto the billing row. Idempotent: every webhook for it lands the same state.
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
    const db = await connectToDatabase();
    const Billing = billingModel(db);
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const userId = sub.metadata?.userId || (await Billing.findOne({ stripeCustomerId: customerId }).lean())?.userId;
    if (!userId) { console.warn('[stripe] subscription with no user', sub.id, customerId); return; }
    const item = sub.items.data[0];
    const plan = planForPrice(item?.price?.id);
    const periodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end
        ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    const active = PAID.has(sub.status) && plan != null;
    const current = await Billing.findOne({ userId }).lean();
    // A second, older subscription ending must not wipe the plan of the one that is live.
    if (!active && current?.subscriptionId && current.subscriptionId !== sub.id) return;
    await Billing.updateOne({ userId }, {
        $set: {
            stripeCustomerId: customerId,
            subscriptionId: sub.id,
            plan: active ? plan : 'free',
            status: sub.status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        },
        $setOnInsert: { bonusCredits: 0 },
    }, { upsert: true });
}

// A paid credit pack: add its credits once per checkout session.
export async function creditSession(session: Stripe.Checkout.Session): Promise<void> {
    if (session.mode !== 'payment' || session.payment_status !== 'paid') return;
    const userId = session.metadata?.userId, credits = Number(session.metadata?.credits);
    if (!userId || !(credits > 0)) { console.warn('[stripe] credit session missing metadata', session.id); return; }
    const db = await connectToDatabase();
    const Billing = billingModel(db);
    await Billing.updateOne({ userId }, { $setOnInsert: { plan: 'free', bonusCredits: 0, creditedSessions: [] } }, { upsert: true });
    await Billing.updateOne({ userId, creditedSessions: { $ne: session.id } }, { $inc: { bonusCredits: credits }, $push: { creditedSessions: session.id } });
}
