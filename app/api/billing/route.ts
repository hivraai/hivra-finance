// POST {action:'checkout', item} → Stripe Checkout URL; POST {action:'portal'} → Customer portal URL.
import { getSession } from '@/lib/better-auth/auth';
import { connectToDatabase } from '@/database/mongoose';
import { billingModel } from '@/database/models/billing.model';
import { APP_URL, ITEMS, billingConfigured, customerFor, stripe, type ItemKey } from '@/lib/billing/stripe';
import { isRateLimited } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.user) return Response.json({ error: 'Sign in' }, { status: 401 });
    if (!billingConfigured()) return Response.json({ error: 'Payments are not switched on yet.' }, { status: 503 });
    const { id: userId, email } = session.user;
    if (await isRateLimited(`billing:${userId}`, 20, 600)) return Response.json({ error: 'Too many tries. Wait a few minutes.' }, { status: 429 });
    const body = await req.json().catch(() => ({})) as { action?: string; item?: string };

    const db = await connectToDatabase();
    const row = await billingModel(db).findOne({ userId }).lean();
    const portal = async () => {
        const customer = await customerFor(userId, email);
        const p = await stripe().billingPortal.sessions.create({
            customer, return_url: `${APP_URL}/billing`,
            ...(process.env.STRIPE_PORTAL_CONFIG ? { configuration: process.env.STRIPE_PORTAL_CONFIG } : {}),
        });
        return Response.json({ url: p.url });
    };

    if (body.action === 'portal') return portal();
    if (body.action !== 'checkout' || !body.item || !Object.hasOwn(ITEMS, body.item)) return Response.json({ error: 'Unknown item' }, { status: 400 });

    const item = ITEMS[body.item as ItemKey];
    const price = process.env[item.env];
    if (!price) return Response.json({ error: 'This item is not on sale yet.' }, { status: 503 });
    // Already subscribed: plan changes go through the portal (proration, no second subscription).
    if (item.mode === 'subscription' && row?.plan && row.plan !== 'free') return portal();

    const customer = await customerFor(userId, email);
    const meta = { userId, item: body.item, ...('credits' in item ? { credits: String(item.credits) } : {}) };
    const s = await stripe().checkout.sessions.create({
        mode: item.mode,
        customer,
        client_reference_id: userId,
        line_items: [{ price, quantity: 1 }],
        allow_promotion_codes: true,
        metadata: meta,
        ...(item.mode === 'subscription' ? { subscription_data: { metadata: { userId } } } : { payment_intent_data: { metadata: meta } }),
        success_url: `${APP_URL}/checkout/success?item=${body.item}`,
        cancel_url: `${APP_URL}/billing`,
    });
    return Response.json({ url: s.url });
}
