// Multi-leg option strategies: payoff at expiry, value before expiry, breakevens, max profit/loss.
// Pure functions. One option contract = 100 shares.
import { greeks as bsGreeks, price as bsPrice, type Greeks, type Right } from './black-scholes';

export type Leg =
    | { kind: 'option'; right: Right; strike: number; qty: number; premium: number; vol?: number; years?: number }
    | { kind: 'stock'; qty: number; price: number }; // qty in shares, negative = short

export const MULTIPLIER = 100;

export function payoffAtExpiry(legs: Leg[], spot: number): number {
    let total = 0;
    for (const l of legs) {
        if (l.kind === 'stock') total += (spot - l.price) * l.qty;
        else {
            const intrinsic = Math.max(l.right === 'call' ? spot - l.strike : l.strike - spot, 0);
            total += (intrinsic - l.premium) * l.qty * MULTIPLIER;
        }
    }
    return total;
}

// Mark-to-model value today (Black-Scholes) minus what was paid, for the "before expiry" curve.
export function payoffNow(legs: Leg[], spot: number, rate = 0.04): number {
    let total = 0;
    for (const l of legs) {
        if (l.kind === 'stock') total += (spot - l.price) * l.qty;
        else {
            const v = l.vol && l.years ? bsPrice(l.right, { spot, strike: l.strike, years: l.years, vol: l.vol, rate }) : Math.max(l.right === 'call' ? spot - l.strike : l.strike - spot, 0);
            total += (v - l.premium) * l.qty * MULTIPLIER;
        }
    }
    return total;
}

export function netPremium(legs: Leg[]): number {
    return legs.reduce((s, l) => s + (l.kind === 'option' ? -l.premium * l.qty * MULTIPLIER : 0), 0); // + = credit received
}

export function positionGreeks(legs: Leg[], spot: number, rate = 0.04): Greeks {
    const g = { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    for (const l of legs) {
        if (l.kind === 'stock') { g.delta += l.qty; continue; }
        if (!l.vol || !l.years) continue;
        const x = bsGreeks(l.right, { spot, strike: l.strike, years: l.years, vol: l.vol, rate });
        const m = l.qty * MULTIPLIER;
        g.delta += x.delta * m; g.gamma += x.gamma * m; g.theta += x.theta * m; g.vega += x.vega * m; g.rho += x.rho * m;
    }
    return g;
}

export type Analysis = {
    points: { spot: number; expiry: number; now: number }[];
    breakevens: number[];
    maxProfit: number | null; // null = unlimited
    maxLoss: number | null;   // null = unlimited (as a positive number when limited)
};

export function analyze(legs: Leg[], spot: number, opts: { range?: number; steps?: number; rate?: number } = {}): Analysis {
    const range = opts.range ?? 0.4, steps = opts.steps ?? 200;
    const strikes = legs.flatMap((l) => (l.kind === 'option' ? [l.strike] : []));
    const lo = Math.max(0, Math.min(spot * (1 - range), ...strikes.map((k) => k * 0.8)));
    const hi = Math.max(spot * (1 + range), ...strikes.map((k) => k * 1.2));
    const points = Array.from({ length: steps + 1 }, (_, i) => {
        const s = lo + ((hi - lo) * i) / steps;
        return { spot: s, expiry: payoffAtExpiry(legs, s), now: payoffNow(legs, s, opts.rate) };
    });

    // Breakevens: sign changes of the expiry payoff, refined linearly.
    const breakevens: number[] = [];
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        if ((a.expiry < 0 && b.expiry >= 0) || (a.expiry > 0 && b.expiry <= 0)) {
            breakevens.push(a.spot + ((0 - a.expiry) * (b.spot - a.spot)) / (b.expiry - a.expiry));
        }
    }

    // Slope beyond the highest strike decides if the upside is unlimited; the downside ends at spot 0.
    const netShares = legs.reduce((s, l) => s + (l.kind === 'stock' ? l.qty : l.right === 'call' ? l.qty * MULTIPLIER : 0), 0);
    const far = Math.max(...strikes, spot) * 10;
    const candidates = [0, ...strikes, far].map((s) => payoffAtExpiry(legs, s));
    const maxProfit = netShares > 0 ? null : Math.max(...candidates, ...points.map((p) => p.expiry));
    const minVal = Math.min(...candidates, ...points.map((p) => p.expiry));
    const maxLoss = netShares < 0 ? null : -Math.min(minVal, 0);

    return { points, breakevens: breakevens.map((b) => Math.round(b * 100) / 100), maxProfit, maxLoss };
}

// Common strategies around an at-the-money strike K with a strike step w.
export type PresetName = 'long_call' | 'long_put' | 'covered_call' | 'cash_secured_put' | 'bull_call_spread' | 'bear_put_spread'
    | 'long_straddle' | 'long_strangle' | 'iron_condor' | 'iron_butterfly';

export function preset(name: PresetName, k: number, w: number, priceOf: (right: Right, strike: number) => number, spot: number): Leg[] {
    const o = (right: Right, strike: number, qty: number): Leg => ({ kind: 'option', right, strike, qty, premium: priceOf(right, strike) });
    switch (name) {
        case 'long_call': return [o('call', k, 1)];
        case 'long_put': return [o('put', k, 1)];
        case 'covered_call': return [{ kind: 'stock', qty: 100, price: spot }, o('call', k + w, -1)];
        case 'cash_secured_put': return [o('put', k - w, -1)];
        case 'bull_call_spread': return [o('call', k, 1), o('call', k + w, -1)];
        case 'bear_put_spread': return [o('put', k, 1), o('put', k - w, -1)];
        case 'long_straddle': return [o('call', k, 1), o('put', k, 1)];
        case 'long_strangle': return [o('call', k + w, 1), o('put', k - w, 1)];
        case 'iron_condor': return [o('put', k - 2 * w, 1), o('put', k - w, -1), o('call', k + w, -1), o('call', k + 2 * w, 1)];
        case 'iron_butterfly': return [o('put', k - w, 1), o('put', k, -1), o('call', k, -1), o('call', k + w, 1)];
    }
}
