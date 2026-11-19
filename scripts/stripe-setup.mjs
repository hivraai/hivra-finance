// Creates HIVRA Finance's Stripe catalogue, customer portal and webhook in the account behind
// STRIPE_SECRET_KEY (.env.local), then writes the IDs back to .env.local. Safe to re-run: prices
// are found by lookup_key, the webhook by URL. Refuses to touch an account not named HIVRA Finance.
//   node scripts/stripe-setup.mjs            (dry run: shows what exists / would be created)
//   node scripts/stripe-setup.mjs --apply
import { readFileSync, writeFileSync } from 'node:fs';

const ENV = '.env.local';
const APPLY = process.argv.includes('--apply');
const WEBHOOK_URL = 'https://finance.hivra.ai/api/stripe/webhook';
const EVENTS = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
    'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'];

const envText = readFileSync(ENV, 'utf8');
const key = /^STRIPE_SECRET_KEY=(.*)$/m.exec(envText)?.[1]?.trim().replace(/^"|"$/g, '');
if (!key) throw new Error('STRIPE_SECRET_KEY missing in .env.local');

async function stripe(method, path, params) {
    const body = params ? new URLSearchParams(flatten(params)).toString() : undefined;
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
        method, body,
        headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`${method} ${path}: ${j.error?.message}`);
    return j;
}
function flatten(obj, prefix = '', out = []) {
    for (const [k, v] of Object.entries(obj)) {
        const name = prefix ? `${prefix}[${k}]` : k;
        if (v == null) continue;
        if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? flatten(x, `${name}[${i}]`, out) : out.push([`${name}[${i}]`, String(x)])));
        else if (typeof v === 'object') flatten(v, name, out);
        else out.push([name, String(v)]);
    }
    return out;
}

const account = await stripe('GET', 'account');
const name = account.settings?.dashboard?.display_name || account.business_profile?.name || '';
const mode = key.startsWith('sk_live') || key.startsWith('rk_live') ? 'LIVE' : 'TEST';
console.log(`Account: ${name} (${account.id}) · ${mode}`);
if (!/hivra finance/i.test(name)) throw new Error('Not the HIVRA Finance account; stopping.');

const PLAN = [
    { env: 'STRIPE_PRICE_PRO', lookup: 'hf_pro_monthly', product: 'HIVRA Finance Pro', amount: 9900, recurring: true, desc: 'Options desk, strategy builder, AI analyst (50,000 credits a month), 20 backtests a month.' },
    { env: 'STRIPE_PRICE_ELITE', lookup: 'hf_elite_monthly', product: 'HIVRA Finance Elite', amount: 19900, recurring: true, desc: 'Everything in Pro, AI analyst (150,000 credits a month), unlimited backtests.' },
    { env: 'STRIPE_PRICE_CREDITS_10K', lookup: 'hf_credits_10k', product: 'HIVRA Finance AI credits', amount: 1000, credits: 10000, nick: '10,000 credits' },
    { env: 'STRIPE_PRICE_CREDITS_25K', lookup: 'hf_credits_25k', product: 'HIVRA Finance AI credits', amount: 2500, credits: 25000, nick: '25,000 credits' },
    { env: 'STRIPE_PRICE_CREDITS_50K', lookup: 'hf_credits_50k', product: 'HIVRA Finance AI credits', amount: 5000, credits: 50000, nick: '50,000 credits' },
];

const existing = await stripe('GET', `prices?limit=100&active=true&${PLAN.map((p, i) => `lookup_keys[${i}]=${p.lookup}`).join('&')}`);
const byLookup = Object.fromEntries(existing.data.map((p) => [p.lookup_key, p]));
const products = (await stripe('GET', 'products?limit=100&active=true')).data;
const out = {};

for (const p of PLAN) {
    if (byLookup[p.lookup]) { out[p.env] = byLookup[p.lookup].id; console.log(`exists  ${p.lookup} → ${out[p.env]}`); continue; }
    if (!APPLY) { console.log(`create  ${p.lookup} (${p.product}, $${p.amount / 100}${p.recurring ? '/mo' : ''})`); continue; }
    let product = products.find((x) => x.name === p.product);
    if (!product) {
        product = await stripe('POST', 'products', { name: p.product, description: p.desc ?? 'Top-up credits for the HIVRA Finance AI analyst. 1,000 credits = US$1.', metadata: { app: 'hivra-finance' } });
        products.push(product);
    }
    const price = await stripe('POST', 'prices', {
        product: product.id, currency: 'usd', unit_amount: p.amount, lookup_key: p.lookup, nickname: p.nick ?? p.product,
        ...(p.recurring ? { recurring: { interval: 'month' } } : {}),
        metadata: { app: 'hivra-finance', ...(p.credits ? { credits: p.credits } : { plan: p.lookup.split('_')[1] }) },
        tax_behavior: 'exclusive',
    });
    out[p.env] = price.id;
    console.log(`created ${p.lookup} → ${price.id}`);
}

// Customer portal: cancel at period end, switch Pro ↔ Elite, card and invoices.
const portals = (await stripe('GET', 'billing_portal/configurations?limit=20&active=true')).data;
let portal = portals.find((c) => c.metadata?.app === 'hivra-finance');
if (portal) { out.STRIPE_PORTAL_CONFIG = portal.id; console.log(`exists  portal → ${portal.id}`); }
else if (!APPLY) console.log('create  customer portal configuration');
else if (out.STRIPE_PRICE_PRO && out.STRIPE_PRICE_ELITE) {
    const pro = await stripe('GET', `prices/${out.STRIPE_PRICE_PRO}`), elite = await stripe('GET', `prices/${out.STRIPE_PRICE_ELITE}`);
    portal = await stripe('POST', 'billing_portal/configurations', {
        business_profile: { headline: 'HIVRA Finance: manage your plan', privacy_policy_url: 'https://finance.hivra.ai/terms', terms_of_service_url: 'https://finance.hivra.ai/terms' },
        default_return_url: 'https://finance.hivra.ai/billing',
        features: {
            customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true, mode: 'at_period_end', cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'unused', 'other'] } },
            subscription_update: { enabled: true, default_allowed_updates: ['price'], proration_behavior: 'create_prorations', products: [{ product: pro.product, prices: [pro.id] }, { product: elite.product, prices: [elite.id] }] },
        },
        metadata: { app: 'hivra-finance' },
    });
    out.STRIPE_PORTAL_CONFIG = portal.id;
    console.log(`created portal → ${portal.id}`);
}

// Webhook. Stripe shows the signing secret only when the endpoint is created.
const hooks = (await stripe('GET', 'webhook_endpoints?limit=100')).data;
const hook = hooks.find((h) => h.url === WEBHOOK_URL);
let secret = null;
if (hook) console.log(`exists  webhook → ${hook.id} (${hook.status}); its secret is already in .env.local or must be revealed in the dashboard`);
else if (!APPLY) console.log(`create  webhook ${WEBHOOK_URL}`);
else {
    const h = await stripe('POST', 'webhook_endpoints', { url: WEBHOOK_URL, enabled_events: EVENTS, description: 'HIVRA Finance: plans and credits', metadata: { app: 'hivra-finance' } });
    secret = h.secret;
    console.log(`created webhook → ${h.id}`);
}

if (APPLY) {
    let text = readFileSync(ENV, 'utf8');
    const set = (k, v) => { text = new RegExp(`^${k}=.*$`, 'm').test(text) ? text.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : `${text.replace(/\s*$/, '')}\n${k}=${v}\n`; };
    for (const [k, v] of Object.entries(out)) set(k, v);
    if (secret) set('STRIPE_WEBHOOK_SECRET', secret);
    writeFileSync(ENV, text);
    console.log(`.env.local updated: ${[...Object.keys(out), ...(secret ? ['STRIPE_WEBHOOK_SECRET (hidden)'] : [])].join(', ')}`);
}
