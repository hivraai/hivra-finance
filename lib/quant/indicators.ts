// Technical indicators on daily bars. Pure functions, no I/O.
// Arrays are oldest → newest; an indicator value is null until it has enough history.

export type Bar = { date: string; open: number; high: number; low: number; close: number; volume: number };

export function sma(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
    }
    return out;
}

export function ema(values: number[], period: number): (number | null)[] {
    const out: (number | null)[] = new Array(values.length).fill(null);
    if (values.length < period) return out;
    const k = 2 / (period + 1);
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
    }
    return out;
}

// Wilder's RSI.
export function rsi(closes: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = new Array(closes.length).fill(null);
    if (closes.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0) gain += d; else loss -= d;
    }
    gain /= period; loss /= period;
    const value = (g: number, l: number) => (l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l));
    out[period] = value(gain, loss);
    for (let i = period + 1; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1];
        gain = (gain * (period - 1) + Math.max(d, 0)) / period;
        loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
        out[i] = value(gain, loss);
    }
    return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
    const f = ema(closes, fast), s = ema(closes, slow);
    const line: (number | null)[] = closes.map((_, i) => (f[i] != null && s[i] != null ? (f[i] as number) - (s[i] as number) : null));
    const start = line.findIndex((v) => v != null);
    const sig: (number | null)[] = new Array(closes.length).fill(null);
    if (start >= 0) {
        const tail = ema(line.slice(start) as number[], signal);
        tail.forEach((v, j) => { sig[start + j] = v; });
    }
    const hist = line.map((v, i) => (v != null && sig[i] != null ? v - (sig[i] as number) : null));
    return { line, signal: sig, hist };
}

export function bollinger(closes: number[], period = 20, mult = 2) {
    const mid = sma(closes, period);
    const upper: (number | null)[] = [], lower: (number | null)[] = [];
    for (let i = 0; i < closes.length; i++) {
        const m = mid[i];
        if (m == null) { upper.push(null); lower.push(null); continue; }
        const win = closes.slice(i - period + 1, i + 1);
        const sd = Math.sqrt(win.reduce((a, v) => a + (v - m) ** 2, 0) / period);
        upper.push(m + mult * sd); lower.push(m - mult * sd);
    }
    return { mid, upper, lower };
}

export function atr(bars: Bar[], period = 14): (number | null)[] {
    const tr = bars.map((b, i) => (i === 0 ? b.high - b.low
        : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close))));
    const out: (number | null)[] = new Array(bars.length).fill(null);
    if (bars.length < period) return out;
    let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < bars.length; i++) { prev = (prev * (period - 1) + tr[i]) / period; out[i] = prev; }
    return out;
}

// Annualised close-to-close volatility over the last `period` returns.
export function historicalVol(closes: number[], period = 20): number | null {
    if (closes.length < period + 1) return null;
    const r: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    const v = r.reduce((a, x) => a + (x - m) ** 2, 0) / (r.length - 1);
    return Math.sqrt(v * 252);
}

// Swing levels: pivot highs/lows of the last ~6 months, nearest above and below the last close.
export function supportResistance(bars: Bar[], lookback = 126, wing = 3) {
    const recent = bars.slice(-lookback);
    const last = recent.at(-1)?.close ?? 0;
    const highs: number[] = [], lows: number[] = [];
    for (let i = wing; i < recent.length - wing; i++) {
        const win = recent.slice(i - wing, i + wing + 1);
        if (recent[i].high === Math.max(...win.map((b) => b.high))) highs.push(recent[i].high);
        if (recent[i].low === Math.min(...win.map((b) => b.low))) lows.push(recent[i].low);
    }
    const resistance = highs.filter((h) => h > last).sort((a, b) => a - b)[0] ?? null;
    const support = lows.filter((l) => l < last).sort((a, b) => b - a)[0] ?? null;
    return { support, resistance };
}

const last = <T,>(a: (T | null)[]) => a.at(-1) ?? null;
const prev = <T,>(a: (T | null)[]) => a.at(-2) ?? null;

export type TechnicalSummary = {
    asOf: string;
    close: number;
    changePct: number | null;
    rsi14: number | null;
    macd: { line: number | null; signal: number | null; hist: number | null; cross: 'bullish' | 'bearish' | null };
    sma20: number | null; sma50: number | null; sma200: number | null;
    trend: 'uptrend' | 'downtrend' | 'sideways';
    bollinger: { upper: number | null; lower: number | null; pctB: number | null };
    atr14: number | null;
    hv20: number | null;
    volumeVsAvg: number | null;
    range52w: { high: number; low: number; pctFromHigh: number };
    support: number | null; resistance: number | null;
    signals: string[];
};

export function summarize(bars: Bar[]): TechnicalSummary | null {
    if (bars.length < 30) return null;
    const closes = bars.map((b) => b.close);
    const c = closes.at(-1)!, p = closes.at(-2)!;
    const r = rsi(closes), m = macd(closes), bb = bollinger(closes);
    const s20 = last(sma(closes, 20)), s50 = last(sma(closes, 50)), s200 = last(sma(closes, 200));
    const vols = bars.map((b) => b.volume);
    const vAvg = last(sma(vols.slice(0, -1), 20));
    const year = bars.slice(-252);
    const hi = Math.max(...year.map((b) => b.high)), lo = Math.min(...year.map((b) => b.low));
    const { support, resistance } = supportResistance(bars);

    const ml = last(m.line), ms = last(m.signal), pl = prev(m.line), ps = prev(m.signal);
    const cross = ml != null && ms != null && pl != null && ps != null
        ? (pl <= ps && ml > ms ? 'bullish' : pl >= ps && ml < ms ? 'bearish' : null) : null;

    const trend = s50 != null && s200 != null
        ? (c > s50 && s50 > s200 ? 'uptrend' : c < s50 && s50 < s200 ? 'downtrend' : 'sideways')
        : s20 != null && s50 != null ? (c > s20 && s20 > s50 ? 'uptrend' : c < s20 && s20 < s50 ? 'downtrend' : 'sideways') : 'sideways';

    const bu = last(bb.upper), bl = last(bb.lower);
    const rsiNow = last(r);
    const signals: string[] = [];
    if (rsiNow != null && rsiNow >= 70) signals.push('RSI overbought (≥70)');
    if (rsiNow != null && rsiNow <= 30) signals.push('RSI oversold (≤30)');
    if (cross === 'bullish') signals.push('MACD bullish cross');
    if (cross === 'bearish') signals.push('MACD bearish cross');
    const s50p = prev(sma(closes, 50)), s200p = prev(sma(closes, 200));
    if (s50 != null && s200 != null && s50p != null && s200p != null) {
        if (s50p <= s200p && s50 > s200) signals.push('Golden cross (50 over 200)');
        if (s50p >= s200p && s50 < s200) signals.push('Death cross (50 under 200)');
    }
    if (bu != null && c > bu) signals.push('Close above upper Bollinger band');
    if (bl != null && c < bl) signals.push('Close below lower Bollinger band');
    if (vAvg && bars.at(-1)!.volume > 2 * vAvg) signals.push('Volume over 2× its 20-day average');
    if (c >= hi * 0.98) signals.push('Near 52-week high');
    if (c <= lo * 1.02) signals.push('Near 52-week low');

    return {
        asOf: bars.at(-1)!.date,
        close: c,
        changePct: p ? (c / p - 1) * 100 : null,
        rsi14: rsiNow,
        macd: { line: ml, signal: ms, hist: last(m.hist), cross },
        sma20: s20, sma50: s50, sma200: s200,
        trend,
        bollinger: { upper: bu, lower: bl, pctB: bu != null && bl != null && bu !== bl ? (c - bl) / (bu - bl) : null },
        atr14: last(atr(bars)),
        hv20: historicalVol(closes),
        volumeVsAvg: vAvg ? bars.at(-1)!.volume / vAvg : null,
        range52w: { high: hi, low: lo, pctFromHigh: (c / hi - 1) * 100 },
        support, resistance,
        signals,
    };
}
