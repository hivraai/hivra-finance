// Option chain maths on top of raw quotes: mid, implied volatility and delta per contract,
// grouped by expiry, plus an at-the-money summary per expiry. Pure functions.
import { greeks, impliedVol, expectedMove, type Right } from './black-scholes';

export type RawQuote = { symbol: string; expiry: string; right: Right; strike: number; bid: number; ask: number };
export type ChainRow = RawQuote & { mid: number; iv: number | null; delta: number | null; years: number };
export type ExpirySummary = { expiry: string; days: number; atmStrike: number; atmIv: number | null; expectedMove: number | null; contracts: number };

const YEAR_MS = 365 * 864e5;

// Expiry at 16:00 New York ≈ 21:00 UTC (good to an hour, which is noise in a year fraction).
export function yearsTo(expiry: string, asOf: string | Date): number {
    return Math.max((Date.parse(`${expiry}T21:00:00Z`) - new Date(asOf).getTime()) / YEAR_MS, 0);
}

export function enrich(quotes: RawQuote[], spot: number, asOf: string, rate = 0.04): ChainRow[] {
    return quotes.map((q) => {
        const years = yearsTo(q.expiry, asOf);
        const mid = q.bid > 0 ? (q.bid + q.ask) / 2 : q.ask / 2;
        const iv = years > 0 && mid > 0 ? impliedVol(q.right, mid, { spot, strike: q.strike, years, rate }) : null;
        const delta = iv ? greeks(q.right, { spot, strike: q.strike, years, vol: iv, rate }).delta : null;
        return { ...q, mid, iv, delta, years };
    });
}

export function expiries(rows: ChainRow[], spot: number): ExpirySummary[] {
    const by = new Map<string, ChainRow[]>();
    for (const r of rows) by.set(r.expiry, [...(by.get(r.expiry) ?? []), r]);
    return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([expiry, rs]) => {
        const strikes = [...new Set(rs.map((r) => r.strike))];
        const atm = strikes.reduce((best, k) => (Math.abs(k - spot) < Math.abs(best - spot) ? k : best), strikes[0]);
        const atmIvs = rs.filter((r) => r.strike === atm && r.iv != null).map((r) => r.iv as number);
        const atmIv = atmIvs.length ? atmIvs.reduce((a, b) => a + b, 0) / atmIvs.length : null;
        const years = rs[0].years;
        return {
            expiry, days: Math.round(years * 365), atmStrike: atm, atmIv,
            expectedMove: atmIv != null ? expectedMove(spot, atmIv, years) : null,
            contracts: rs.length,
        };
    });
}

// Strikes nearest the money for one expiry: `n` on each side.
export function aroundAtm(rows: ChainRow[], expiry: string, spot: number, n = 8): ChainRow[] {
    const rs = rows.filter((r) => r.expiry === expiry);
    const strikes = [...new Set(rs.map((r) => r.strike))].sort((a, b) => a - b);
    const i = strikes.findIndex((k) => k >= spot);
    const pick = new Set(strikes.slice(Math.max((i < 0 ? strikes.length : i) - n, 0), (i < 0 ? strikes.length : i) + n));
    return rs.filter((r) => pick.has(r.strike)).sort((a, b) => a.strike - b.strike || a.right.localeCompare(b.right));
}

// Default expiry: the first one at least `minDays` out.
export function defaultExpiry(sums: ExpirySummary[], minDays = 7): string | null {
    return (sums.find((s) => s.days >= minDays) ?? sums.at(-1))?.expiry ?? null;
}
