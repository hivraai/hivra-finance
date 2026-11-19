// Backtests on daily bars. Pure functions, no I/O.
//
// Stocks: long-only rules, signal on the close, filled at the NEXT day's open (no look-ahead), with a
// per-trade cost in basis points. Compared with buy & hold over the same days.
// Options: MODELLED, not historical quotes. Each cycle opens on the close at Black-Scholes prices with
// volatility = 20-day historical volatility × an IV premium, holds to expiry, and settles at intrinsic.
// Real fills, skew and spreads differ; reports say so.
import { bollinger, historicalVol, macd, rsi, sma, type Bar } from './indicators';
import { price as bsPrice, type Right } from './black-scholes';

export type Trade = { entryDate: string; entryPrice: number; exitDate: string; exitPrice: number; returnPct: number; days: number };
export type Metrics = {
    totalReturnPct: number; cagrPct: number; maxDrawdownPct: number; sharpe: number | null; volatilityPct: number;
    trades: number; winRatePct: number | null; avgTradePct: number | null; exposurePct: number;
};
export type BacktestReport = {
    strategy: string; params: Record<string, number>; start: string; end: string; startingCapital: number;
    equity: { date: string; value: number; benchmark: number }[];
    metrics: Metrics; benchmark: Metrics; trades: Trade[]; notes: string[];
};

export type StockStrategy =
    | { name: 'sma_cross'; fast: number; slow: number }
    | { name: 'rsi_reversion'; period: number; buyBelow: number; sellAbove: number }
    | { name: 'macd_trend' }
    | { name: 'breakout'; lookback: number; exitLookback: number }
    | { name: 'bollinger_reversion'; period: number }
    | { name: 'buy_hold' };

// true = want to be long after this bar's close.
function positions(bars: Bar[], s: StockStrategy): boolean[] {
    const c = bars.map((b) => b.close);
    const want: boolean[] = new Array(bars.length).fill(false);
    switch (s.name) {
        case 'buy_hold': return want.fill(true);
        case 'sma_cross': {
            const f = sma(c, s.fast), sl = sma(c, s.slow);
            return c.map((_, i) => f[i] != null && sl[i] != null && (f[i] as number) > (sl[i] as number));
        }
        case 'macd_trend': {
            const m = macd(c);
            return c.map((_, i) => m.line[i] != null && m.signal[i] != null && (m.line[i] as number) > (m.signal[i] as number));
        }
        case 'rsi_reversion': {
            const r = rsi(c, s.period); let inPos = false;
            for (let i = 0; i < c.length; i++) {
                if (r[i] != null) { if (!inPos && (r[i] as number) < s.buyBelow) inPos = true; else if (inPos && (r[i] as number) > s.sellAbove) inPos = false; }
                want[i] = inPos;
            }
            return want;
        }
        case 'bollinger_reversion': {
            const bb = bollinger(c, s.period); let inPos = false;
            for (let i = 0; i < c.length; i++) {
                if (bb.lower[i] != null) { if (!inPos && c[i] < (bb.lower[i] as number)) inPos = true; else if (inPos && c[i] > (bb.mid[i] as number)) inPos = false; }
                want[i] = inPos;
            }
            return want;
        }
        case 'breakout': {
            let inPos = false;
            for (let i = 0; i < c.length; i++) {
                if (i >= s.lookback) {
                    const hi = Math.max(...bars.slice(i - s.lookback, i).map((b) => b.high));
                    const lo = Math.min(...bars.slice(i - s.exitLookback, i).map((b) => b.low));
                    if (!inPos && c[i] > hi) inPos = true; else if (inPos && c[i] < lo) inPos = false;
                }
                want[i] = inPos;
            }
            return want;
        }
    }
}

export function metrics(values: number[], dates: string[], trades: Trade[], exposure: number): Metrics {
    const start = values[0], end = values.at(-1)!;
    const years = Math.max((Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / (365.25 * 864e5), 1 / 365);
    const rets: number[] = [];
    for (let i = 1; i < values.length; i++) rets.push(values[i] / values[i - 1] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
    const sd = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(rets.length - 1, 1));
    let peak = values[0], mdd = 0;
    for (const v of values) { peak = Math.max(peak, v); mdd = Math.min(mdd, v / peak - 1); }
    const wins = trades.filter((t) => t.returnPct > 0).length;
    return {
        totalReturnPct: (end / start - 1) * 100,
        cagrPct: ((end / start) ** (1 / years) - 1) * 100,
        maxDrawdownPct: mdd * 100,
        sharpe: sd > 0 ? (mean / sd) * Math.sqrt(252) : null,
        volatilityPct: sd * Math.sqrt(252) * 100,
        trades: trades.length,
        winRatePct: trades.length ? (wins / trades.length) * 100 : null,
        avgTradePct: trades.length ? trades.reduce((a, t) => a + t.returnPct, 0) / trades.length : null,
        exposurePct: exposure * 100,
    };
}

export function backtestStock(bars: Bar[], strategy: StockStrategy, opts: { capital?: number; costBps?: number } = {}): BacktestReport {
    if (bars.length < 60) throw new Error('Not enough history to backtest (need at least 60 trading days).');
    const capital = opts.capital ?? 10_000, cost = (opts.costBps ?? 5) / 10_000;
    const want = positions(bars, strategy);
    let cash = capital, shares = 0, entry: { date: string; price: number; i: number } | null = null, daysIn = 0;
    const trades: Trade[] = [], equity: BacktestReport['equity'] = [];
    const bh = capital / bars[0].open;

    for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        // Act at today's open on yesterday's signal.
        const signal = i > 0 ? want[i - 1] : strategy.name === 'buy_hold';
        if (signal && shares === 0) {
            shares = (cash * (1 - cost)) / b.open; cash = 0; entry = { date: b.date, price: b.open, i };
        } else if (!signal && shares > 0 && entry) {
            cash = shares * b.open * (1 - cost);
            trades.push({ entryDate: entry.date, entryPrice: entry.price, exitDate: b.date, exitPrice: b.open, returnPct: (b.open / entry.price * (1 - cost) ** 2 - 1) * 100, days: i - entry.i });
            shares = 0; entry = null;
        }
        if (shares > 0) daysIn++;
        equity.push({ date: b.date, value: cash + shares * b.close, benchmark: bh * b.close });
    }
    const lastBar = bars.at(-1)!;
    if (shares > 0 && entry) trades.push({ entryDate: entry.date, entryPrice: entry.price, exitDate: lastBar.date, exitPrice: lastBar.close, returnPct: (lastBar.close / entry.price * (1 - cost) - 1) * 100, days: bars.length - 1 - entry.i });

    const dates = equity.map((e) => e.date);
    const { name, ...params } = strategy;
    return {
        strategy: name, params: params as Record<string, number>, start: bars[0].date, end: lastBar.date, startingCapital: capital,
        equity,
        metrics: metrics(equity.map((e) => e.value), dates, trades, daysIn / bars.length),
        benchmark: metrics(equity.map((e) => e.benchmark), dates, [], 1),
        trades,
        notes: [`Signals on the close, filled at the next open, ${opts.costBps ?? 5} bps per side.`, 'Long only. Past results do not predict future returns.'],
    };
}

// ── Modelled options ─────────────────────────────────────────────────────────

export type OptionStrategy =
    | { name: 'covered_call'; otmPct: number; days: number }
    | { name: 'cash_secured_put'; otmPct: number; days: number }
    | { name: 'long_call'; otmPct: number; days: number }
    | { name: 'long_put'; otmPct: number; days: number }
    | { name: 'iron_condor'; wingPct: number; widthPct: number; days: number };

type Spec = { right: Right; strikeMul: number; qty: number }; // qty per 100 shares of notional

function legsFor(s: OptionStrategy): { legs: Spec[]; stock: boolean } {
    switch (s.name) {
        case 'covered_call': return { legs: [{ right: 'call', strikeMul: 1 + s.otmPct / 100, qty: -1 }], stock: true };
        case 'cash_secured_put': return { legs: [{ right: 'put', strikeMul: 1 - s.otmPct / 100, qty: -1 }], stock: false };
        case 'long_call': return { legs: [{ right: 'call', strikeMul: 1 + s.otmPct / 100, qty: 1 }], stock: false };
        case 'long_put': return { legs: [{ right: 'put', strikeMul: 1 - s.otmPct / 100, qty: 1 }], stock: false };
        case 'iron_condor': {
            const a = s.wingPct / 100, w = s.widthPct / 100;
            return { legs: [
                { right: 'put', strikeMul: 1 - a - w, qty: 1 }, { right: 'put', strikeMul: 1 - a, qty: -1 },
                { right: 'call', strikeMul: 1 + a, qty: -1 }, { right: 'call', strikeMul: 1 + a + w, qty: 1 },
            ], stock: false };
        }
    }
}

export function backtestOptions(bars: Bar[], s: OptionStrategy, opts: { capital?: number; ivPremium?: number; rate?: number } = {}): BacktestReport {
    if (bars.length < 80) throw new Error('Not enough history to backtest options (need at least 80 trading days).');
    const capital = opts.capital ?? 10_000, ivMul = opts.ivPremium ?? 1.1, rate = opts.rate ?? 0.04;
    const { legs, stock } = legsFor(s);
    const closes = bars.map((b) => b.close);
    const hold = Math.max(5, Math.round(s.days * 252 / 365));
    let value = capital; const equity: BacktestReport['equity'] = [], trades: Trade[] = [];
    const bh = capital / bars[21].close;
    let i = 21; // need 20 returns for the volatility
    for (let k = 0; k < 21; k++) equity.push({ date: bars[k].date, value: capital, benchmark: capital });
    while (i < bars.length - 1) {
        const open = bars[i], spot = open.close;
        const vol = Math.max((historicalVol(closes.slice(0, i + 1), 20) ?? 0.3) * ivMul, 0.05);
        const end = Math.min(i + hold, bars.length - 1);
        const years = s.days / 365;
        // Size: units of 100 shares the capital covers (by spot for stock/puts, by risk for spreads).
        const units = Math.max(Math.floor(value / (spot * 100)), 0) || value / (spot * 100);
        const premium = legs.reduce((sum, l) => sum + bsPrice(l.right, { spot, strike: spot * l.strikeMul, years, vol, rate }) * l.qty, 0); // per share, + = paid
        for (let d = i + 1; d <= end; d++) {
            const sp = bars[d].close, left = Math.max((end - d) * 365 / 252, 0) / 365;
            const mark = legs.reduce((sum, l) => sum + (left > 0 ? bsPrice(l.right, { spot: sp, strike: spot * l.strikeMul, years: left, vol, rate }) : Math.max(l.right === 'call' ? sp - spot * l.strikeMul : spot * l.strikeMul - sp, 0)) * l.qty, 0);
            const pnl = ((stock ? sp - spot : 0) + mark - premium) * 100 * units;
            equity.push({ date: bars[d].date, value: value + pnl, benchmark: bh * sp });
        }
        const exit = equity.at(-1)!.value;
        trades.push({ entryDate: open.date, entryPrice: premium, exitDate: bars[end].date, exitPrice: (exit - value) / (100 * units || 1), returnPct: (exit / value - 1) * 100, days: end - i });
        value = exit;
        if (value <= 0) break;
        i = end;
    }
    const dates = equity.map((e) => e.date);
    const { name, ...params } = s;
    return {
        strategy: name, params: params as Record<string, number>, start: bars[0].date, end: bars.at(-1)!.date, startingCapital: capital,
        equity,
        metrics: metrics(equity.map((e) => e.value), dates, trades, 1),
        benchmark: metrics(equity.map((e) => e.benchmark), dates, [], 1),
        trades,
        notes: [
            'MODELLED: option prices are Black-Scholes estimates, not historical quotes.',
            `Volatility = 20-day historical volatility × ${ivMul}; no skew, no bid/ask spread, no early assignment.`,
            'Each cycle opens on a close and settles at expiry. Past results do not predict future returns.',
        ],
    };
}

