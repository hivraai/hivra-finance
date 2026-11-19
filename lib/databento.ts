// Market data from Databento's historical HTTP API (https://databento.com/docs/api-reference-historical).
// Server only: the key never reaches the browser. Results are cached in Next's data cache, shared by
// every user, so one ticker costs one request per refresh window, not one per visitor.
//
// Daily stock bars: XNAS.ITCH (Nasdaq venue, from 2018-05) up to 2024-06, then EQUS.SUMMARY
// (consolidated, from 2024-07). Prices are NOT split-adjusted by Databento; adjustSplits() below
// rescales history across clean split ratios.
// Option chain: OPRA.PILLAR cbbo-1m, the last minute before the close.
import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Bar } from '@/lib/quant/indicators';

const BASE = 'https://hist.databento.com/v0';
export const databentoConfigured = () => Boolean(process.env.DATABENTO_API_KEY);

const SYMBOL = /^[A-Z][A-Z0-9.]{0,9}$/;
export const isDatabentoSymbol = (s: string) => SYMBOL.test(s);

function authHeader() {
    return 'Basic ' + Buffer.from(`${process.env.DATABENTO_API_KEY}:`).toString('base64');
}

async function call(path: string, params: Record<string, string>, timeoutMs = 25_000): Promise<string> {
    const qs = new URLSearchParams(params).toString();
    const get = path.startsWith('metadata.');
    const res = await fetch(get ? `${BASE}/${path}?${qs}` : `${BASE}/${path}`, {
        method: get ? 'GET' : 'POST',
        headers: { Authorization: authHeader(), ...(get ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }) },
        body: get ? undefined : qs,
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Databento ${path} ${res.status}: ${text.slice(0, 200)}`);
    return text;
}

// Last available timestamp of a dataset (free call), so requests never ask past it.
// Full ISO timestamp (OPRA's end is intraday); slice(0, 10) where a date is wanted.
const datasetEndTs = unstable_cache(async (dataset: string): Promise<string> => {
    try {
        const j = JSON.parse(await call('metadata.get_dataset_range', { dataset }, 12_000)) as { end?: string };
        if (j.end) return j.end;
    } catch (e) {
        console.warn('[databento] dataset range', dataset, e instanceof Error ? e.message : e);
    }
    // Fallback: today's 00:00 UTC. Daily bars run to the previous session; the chain walks back from there.
    return new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
}, ['databento-dataset-end-v2'], { revalidate: 3600 });
const datasetEnd = async (dataset: string) => (await datasetEndTs(dataset)).slice(0, 10);

function parseCsv(text: string): Record<string, string>[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const head = lines[0].split(',');
    return lines.slice(1).map((l) => {
        const cells = l.split(',');
        return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
    });
}

async function ohlcv(dataset: string, symbol: string, start: string, end: string): Promise<Bar[]> {
    if (start >= end) return [];
    const csv = await call('timeseries.get_range', {
        dataset, schema: 'ohlcv-1d', symbols: symbol, stype_in: 'raw_symbol',
        start, end, encoding: 'csv', pretty_px: 'true', pretty_ts: 'true', map_symbols: 'true',
    }, 45_000);
    return parseCsv(csv).map((r) => ({
        date: r.ts_event.slice(0, 10),
        open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume,
    })).filter((b) => b.close > 0);
}

// Rescale bars before a split so indicators do not see a fake crash or jump. A split shows as an
// overnight gap whose ratio sits within 6% of a clean split ratio (2:1, 3:1 … or 1:2, 1:10 …); the
// price moves too on the day (AAPL's 4:1 in Aug 2020: 3.66× to a premarket open, 3.88× close to close).
const RATIOS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50];
export function adjustSplits(bars: Bar[]): Bar[] {
    const out = bars.map((b) => ({ ...b }));
    for (let i = out.length - 1; i > 0; i--) {
        // Open-to-close and close-to-close gaps; the open can be a thin premarket print. >1 = forward split.
        const gaps = [out[i - 1].close / out[i].open, out[i - 1].close / out[i].close];
        let factor = 0;
        for (const r of RATIOS) {
            for (const gap of gaps) {
                if (Math.abs(gap / r - 1) < 0.06) factor = r;
                else if (Math.abs(gap * r - 1) < 0.06) factor = 1 / r;
            }
        }
        if (!factor) continue;
        for (let j = 0; j < i; j++) {
            const b = out[j];
            b.open /= factor; b.high /= factor; b.low /= factor; b.close /= factor; b.volume *= factor;
        }
    }
    return out;
}

const EQUS_START = '2024-07-01';
const XNAS_START = '2018-05-01';

// Recent history for the stock page (EQUS, ~2.4 years: enough for the 200-day average).
export const getRecentBars = unstable_cache(async (symbol: string): Promise<Bar[]> => {
    if (!databentoConfigured() || !isDatabentoSymbol(symbol)) return [];
    const end = await datasetEnd('EQUS.SUMMARY');
    return adjustSplits(await ohlcv('EQUS.SUMMARY', symbol, EQUS_START, end));
}, ['databento-recent-bars-v2'], { revalidate: 6 * 3600 });

// Full history for backtests: Nasdaq venue 2018-05 → 2024-06, consolidated after.
export const getFullBars = unstable_cache(async (symbol: string): Promise<Bar[]> => {
    if (!databentoConfigured() || !isDatabentoSymbol(symbol)) return [];
    const [eqEnd, old] = await Promise.all([
        datasetEnd('EQUS.SUMMARY'),
        // No catch: a failed request must not be cached as "history starts in 2024".
        ohlcv('XNAS.ITCH', symbol, XNAS_START, EQUS_START),
    ]);
    const recent = await ohlcv('EQUS.SUMMARY', symbol, EQUS_START, eqEnd);
    const seen = new Set(recent.map((b) => b.date));
    return adjustSplits([...old.filter((b) => !seen.has(b.date)), ...recent].sort((a, b) => a.date.localeCompare(b.date)));
}, ['databento-full-bars-v2'], { revalidate: 12 * 3600 });

// ── Option chain ─────────────────────────────────────────────────────────────

export type ChainQuote = { symbol: string; expiry: string; right: 'call' | 'put'; strike: number; bid: number; ask: number; bidSize: number; askSize: number };
export type Chain = { underlying: string; asOf: string; quotes: ChainQuote[] };

// OCC symbol: root padded to 6, YYMMDD, C/P, strike × 1000 in 8 digits. "AAPL  271217C00280000".
export function parseOcc(occ: string): Omit<ChainQuote, 'bid' | 'ask' | 'bidSize' | 'askSize'> | null {
    const m = /^(.{1,6}?)\s*(\d{6})([CP])(\d{8})$/.exec(occ.trim().length > 15 ? occ : '');
    if (!m) return null;
    const [, , ymd, cp, k] = m;
    return {
        symbol: occ,
        expiry: `20${ymd.slice(0, 2)}-${ymd.slice(2, 4)}-${ymd.slice(4, 6)}`,
        right: cp === 'C' ? 'call' : 'put',
        strike: +k / 1000,
    };
}

// US market close in UTC for a date (16:00 New York, DST aware).
function closeUtc(date: string): Date {
    const probe = new Date(`${date}T20:00:00Z`);
    const ny = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(probe);
    const offset = 20 - Number(ny); // 4 in summer, 5 in winter
    return new Date(`${date}T${String(16 + offset).padStart(2, '0')}:00:00Z`);
}

async function chainAt(symbol: string, date: string): Promise<Chain> {
    const close = closeUtc(date);
    const start = new Date(close.getTime() - 60_000).toISOString();
    const csv = await call('timeseries.get_range', {
        dataset: 'OPRA.PILLAR', schema: 'cbbo-1m', symbols: `${symbol}.OPT`, stype_in: 'parent',
        start, end: close.toISOString(), encoding: 'csv', pretty_px: 'true', pretty_ts: 'true', map_symbols: 'true',
    }, 40_000);
    const latest = new Map<string, ChainQuote>();
    for (const r of parseCsv(csv)) {
        const p = parseOcc(r.symbol ?? '');
        if (!p) continue;
        const bid = +(r.bid_px_00 ?? r.bid_px ?? 0), ask = +(r.ask_px_00 ?? r.ask_px ?? 0);
        if (!(ask > 0)) continue;
        latest.set(p.symbol, { ...p, bid: bid > 0 ? bid : 0, ask, bidSize: +(r.bid_sz_00 ?? 0), askSize: +(r.ask_sz_00 ?? 0) });
    }
    return { underlying: symbol, asOf: close.toISOString(), quotes: [...latest.values()].sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike) };
}

// The chain as of the most recent close with data. Walks back up to 5 days over weekends/holidays.
export const getChain = unstable_cache(async (symbol: string): Promise<Chain | null> => {
    if (!databentoConfigured() || !isDatabentoSymbol(symbol)) return null;
    const endTs = Date.parse(await datasetEndTs('OPRA.PILLAR'));
    const d = new Date(endTs);
    let tried = 0; // the most recent close gets a second try
    for (let i = 0; i < 6; i++) {
        const date = d.toISOString().slice(0, 10);
        const close = closeUtc(date);
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && close.getTime() <= endTs) {
            const attempt = () => chainAt(symbol, date).catch((e) => { console.warn('[databento] chain', symbol, date, e instanceof Error ? e.message : e); return null; });
            const c = (await attempt()) ?? (tried === 0 ? await attempt() : null);
            tried++;
            if (c && c.quotes.length) return c;
        }
        d.setUTCDate(d.getUTCDate() - 1);
    }
    return null;
}, ['databento-chain-v1'], { revalidate: 6 * 3600 });
