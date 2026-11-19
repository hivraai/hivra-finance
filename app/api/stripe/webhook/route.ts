// Stripe → HIVRA Finance. The only writer of a user's plan and bought credits. Every handler is
// idempotent, so Stripe's retries and out-of-order deliveries land the same state.
import type Stripe from 'stripe';
import { creditSession, stripe, syncSubscription } from '@/lib/billing/stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response('Not configured', { status: 503 });
    const sig = req.headers.get('stripe-signature');
    if (!sig) return new Response('Missing signature', { status: 400 });
    const body = await req.text();
    let event: Stripe.Event;
    try {
        event = await stripe().webhooks.constructEventAsync(body, sig, secret);
    } catch {
        return new Response('Bad signature', { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const s = event.data.object;
                if (s.mode === 'payment') await creditSession(s);
                else if (s.mode === 'subscription' && s.subscription) {
                    await syncSubscription(await stripe().subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id));
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                // Re-read it: events can arrive out of order, the live object cannot.
                await syncSubscription(await stripe().subscriptions.retrieve(event.data.object.id).catch(() => event.data.object as Stripe.Subscription));
                break;
            case 'invoice.paid':
            case 'invoice.payment_failed': {
                const inv = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string } } };
                const subId = inv.parent?.subscription_details?.subscription ?? (typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id);
                if (subId) await syncSubscription(await stripe().subscriptions.retrieve(subId));
                break;
            }
        }
    } catch (e) {
        console.error('[stripe] webhook', event.type, event.id, e instanceof Error ? e.message : e);
        return new Response('Handler failed', { status: 500 }); // Stripe retries
    }
    return Response.json({ received: true });
}
