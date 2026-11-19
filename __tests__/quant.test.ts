import { describe, expect, it } from 'vitest';
import { rsi, sma, summarize, type Bar } from '@/lib/quant/indicators';
import { cdf, greeks, impliedVol, price } from '@/lib/quant/black-scholes';
import { analyze, preset, type Leg } from '@/lib/quant/strategy';
import { backtestOptions, backtestStock } from '@/lib/quant/backtest';

// Deterministic random walk with drift.
function bars(n = 400, start = 100, drift = 0.0004, seed = 7): Bar[] {
    let s = seed, p = start; const out: Bar[] = [];
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
    for (let i = 0; i < n; i++) {
        const o = p; p = p * (1 + drift + rnd() * 0.03);
        const d = new Date(Date.UTC(2023, 0, 2) + i * 864e5 * 1.4).toISOString().slice(0, 10);
        out.push({ date: d, open: o, high: Math.max(o, p) * 1.005, low: Math.min(o, p) * 0.995, close: p, volume: 1e6 + i });
    }
    return out;
}

describe('indicators', () => {
    it('sma and rsi', () => {
        expect(sma([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
        const up = Array.from({ length: 30 }, (_, i) => 100 + i);
        expect(rsi(up).at(-1)).toBe(100);
        const r = rsi(bars().map((b) => b.close)).at(-1)!;
        expect(r).toBeGreaterThan(0); expect(r).toBeLessThan(100);
    });
    it('summarize gives a full read', () => {
        const s = summarize(bars())!;
        expect(s.sma200).not.toBeNull();
        expect(['uptrend', 'downtrend', 'sideways']).toContain(s.trend);
        expect(s.range52w.high).toBeGreaterThanOrEqual(s.close * 0.99);
    });
});

describe('black-scholes', () => {
    it('matches the textbook value and put-call parity', () => {
        // Hull: S=42 K=40 r=10% vol=20% T=0.5 → call 4.76, put 0.81
        const inp = { spot: 42, strike: 40, years: 0.5, vol: 0.2, rate: 0.1 };
        expect(price('call', inp)).toBeCloseTo(4.76, 2);
        expect(price('put', inp)).toBeCloseTo(0.81, 2);
        const parity = price('call', inp) - price('put', inp) - (42 - 40 * Math.exp(-0.05));
        expect(Math.abs(parity)).toBeLessThan(1e-6);
        expect(cdf(0)).toBeCloseTo(0.5, 6);
    });
    it('greeks have the right signs and IV round-trips', () => {
        const inp = { spot: 100, strike: 100, years: 0.25, vol: 0.3, rate: 0.04 };
        const g = greeks('call', inp);
        expect(g.delta).toBeGreaterThan(0.5); expect(g.gamma).toBeGreaterThan(0); expect(g.theta).toBeLessThan(0);
        expect(greeks('put', inp).delta).toBeLessThan(0);
        const iv = impliedVol('put', price('put', inp), { spot: 100, strike: 100, years: 0.25, rate: 0.04 })!;
        expect(iv).toBeCloseTo(0.3, 4);
    });
});

describe('strategy analysis', () => {
    it('bull call spread: limited both ways, one breakeven', () => {
        const legs: Leg[] = [{ kind: 'option', right: 'call', strike: 100, qty: 1, premium: 5 }, { kind: 'option', right: 'call', strike: 110, qty: -1, premium: 2 }];
        const a = analyze(legs, 100);
        expect(a.maxProfit).toBeCloseTo(700, 0); expect(a.maxLoss).toBeCloseTo(300, 0);
        expect(a.breakevens).toEqual([103]);
    });
    it('long call is unlimited up, naked short call unlimited loss, iron condor limited', () => {
        expect(analyze([{ kind: 'option', right: 'call', strike: 100, qty: 1, premium: 3 }], 100).maxProfit).toBeNull();
        expect(analyze([{ kind: 'option', right: 'call', strike: 100, qty: -1, premium: 3 }], 100).maxLoss).toBeNull();
        const ic = analyze(preset('iron_condor', 100, 5, (r, k) => price(r, { spot: 100, strike: k, years: 0.1, vol: 0.3 }), 100), 100);
        expect(ic.maxProfit).toBeGreaterThan(0); expect(ic.maxLoss).toBeGreaterThan(0); expect(ic.breakevens.length).toBe(2);
    });
});

describe('backtests', () => {
    it('stock strategies run, buy & hold matches its benchmark', () => {
        const b = bars();
        const bh = backtestStock(b, { name: 'buy_hold' }, { costBps: 0 });
        expect(bh.metrics.totalReturnPct).toBeCloseTo(bh.benchmark.totalReturnPct, 6);
        const sc = backtestStock(b, { name: 'sma_cross', fast: 20, slow: 50 });
        expect(sc.equity.length).toBe(b.length);
        expect(sc.metrics.maxDrawdownPct).toBeLessThanOrEqual(0);
        for (const t of sc.trades) expect(t.exitDate >= t.entryDate).toBe(true);
    });
    it('options backtests are modelled and labelled', () => {
        const r = backtestOptions(bars(), { name: 'covered_call', otmPct: 5, days: 30 });
        expect(r.trades.length).toBeGreaterThan(5);
        expect(r.notes[0]).toMatch(/MODELLED/);
        expect(Number.isFinite(r.metrics.totalReturnPct)).toBe(true);
    });
});
