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
import { after } from 'next/server';
import type { Bar } from '@/lib/quant/indicators';
import { connectToDatabase } from '@/database/mongoose';
import { optionChainModel } from '@/database/models/option-chain.model';

const BASE = 'https://hist.databento.com/v0';
export const databentoConfigured = () => Boolean(process.env.DATABENTO_API_KEY);

const SYMBOL = /^[A-Z][A-Z0-9.]{0,9}$/;
export const isDatabentoSymbol = (s: string) => SYMBOL.test(s);

function authHeader() {
    return 'Basic ' + Buffer.from(`${process.env.DATABENTO_API_KEY}:`).toString('base64');
}

async function call(path: string, params: Record<string, string>, timeoutMs = 25_000, abort?: AbortSignal): Promise<string> {
    const qs = new URLSearchParams(params).toString();
    const get = path.startsWith('metadata.');
    const res = await fetch(get ? `${BASE}/${path}?${qs}` : `${BASE}/${path}`, {
        method: get ? 'GET' : 'POST',
        headers: { Authorization: authHeader(), ...(get ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }) },
        body: get ? undefined : qs,
        cache: 'no-store',
        signal: abort ? AbortSignal.any([AbortSignal.timeout(timeoutMs), abort]) : AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Databento ${path} ${res.status}: ${text.slice(0, 200)}`);
    return text;
}

// Last available timestamp of a dataset (free call), so requests never ask past it.
// Full ISO timestamp (OPRA's end is intraday); slice(0, 10) where a date is wanted.
const datasetEndTs = unstable_cache(async (dataset: string): Promise<string> => {
    try {
        const j = JSON.parse(await call('metadata.get_dataset_range', { dataset }, 5_000)) as { end?: string };
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

function toChain(symbol: string, csv: string, asOf: string): Chain {
    const latest = new Map<string, ChainQuote>();
    for (const r of parseCsv(csv)) {
        const p = parseOcc(r.symbol ?? '');
        if (!p) continue;
        const bid = +(r.bid_px_00 ?? r.bid_px ?? 0), ask = +(r.ask_px_00 ?? r.ask_px ?? 0);
        if (!(ask > 0)) continue;
        latest.set(p.symbol, { ...p, bid: bid > 0 ? bid : 0, ask, bidSize: +(r.bid_sz_00 ?? 0), askSize: +(r.ask_sz_00 ?? 0) });
    }
    return { underlying: symbol, asOf, quotes: [...latest.values()].sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike) };
}

// Databento's latency for the same request swings from ~3 s to over 40 s, so two equivalent
// snapshots of the close race (the last 1-minute CBBO and the last 1-second CBBO) and the first
// complete answer wins; the other is aborted. Costs about a cent per ticker per day.
async function chainAt(symbol: string, date: string): Promise<Chain> {
    const close = closeUtc(date);
    const base = { dataset: 'OPRA.PILLAR', symbols: `${symbol}.OPT`, stype_in: 'parent', encoding: 'csv', pretty_px: 'true', pretty_ts: 'true', map_symbols: 'true' };
    const stop = new AbortController();
    const shapes = [
        { ...base, schema: 'cbbo-1m', start: new Date(close.getTime() - 60_000).toISOString(), end: close.toISOString() },
        { ...base, schema: 'cbbo-1s', start: new Date(close.getTime() - 2_000).toISOString(), end: new Date(close.getTime() - 1_000).toISOString() },
    ];
    try {
        return await Promise.any(shapes.map(async (params) => {
            const chain = toChain(symbol, await call('timeseries.get_range', params, 55_000, stop.signal), close.toISOString());
            if (!chain.quotes.length) throw new Error('empty chain');
            return chain;
        }));
    } catch (e) {
        throw e instanceof AggregateError ? new Error(e.errors.map((x) => (x instanceof Error ? x.message : String(x))).join(' | ')) : e;
    } finally {
        stop.abort();
    }
}

// Trading days whose close the dataset already covers, newest first (weekends skipped).
function candidateDays(endTs: number, n = 6): string[] {
    const out: string[] = [];
    const d = new Date(endTs);
    for (let i = 0; out.length < n && i < 14; i++) {
        const date = d.toISOString().slice(0, 10);
        if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && closeUtc(date).getTime() <= endTs) out.push(date);
        d.setUTCDate(d.getUTCDate() - 1);
    }
    return out;
}

async function fetchAndStore(symbol: string, day: string): Promise<Chain> {
    const chain = await chainAt(symbol, day);
    const db = await connectToDatabase();
    await optionChainModel(db).updateOne({ symbol, day }, { $set: { asOf: chain.asOf, quotes: chain.quotes } }, { upsert: true })
        .catch((e) => console.warn('[databento] store chain', symbol, day, e instanceof Error ? e.message : e));
    return chain;
}

const refreshing = new Set<string>();

// The chain as of the most recent close with data. Stored in Mongo per ticker per day (a closed
// day never changes). A visitor never waits on Databento when any recent close is stored: the
// stored one is served at once and the newer close is fetched in the background
// (stale-while-revalidate). Only a ticker never seen before waits, and then tries at most the two
// newest closes.
export async function getChain(symbol: string): Promise<Chain | null> {
    if (!databentoConfigured() || !isDatabentoSymbol(symbol)) return null;
    const days = candidateDays(Date.parse(await datasetEndTs('OPRA.PILLAR')));
    if (!days.length) return null;
    const db = await connectToDatabase();
    const stored = await optionChainModel(db).findOne({ symbol, day: { $in: days } }).sort({ day: -1 }).lean();
    if (stored) {
        if (stored.day !== days[0] && !refreshing.has(symbol)) {
            refreshing.add(symbol);
            const job = () => fetchAndStore(symbol, days[0])
                .catch((e) => console.warn('[databento] refresh chain', symbol, days[0], e instanceof Error ? e.message : e))
                .finally(() => refreshing.delete(symbol));
            try { after(job); } catch { void job(); } // outside a request (scripts, tests)
        }
        return { underlying: symbol, asOf: stored.asOf, quotes: stored.quotes };
    }
    for (const day of days.slice(0, 2)) {
        try {
            return await fetchAndStore(symbol, day);
        } catch (e) {
            console.warn('[databento] chain', symbol, day, e instanceof Error ? e.message : e);
        }
    }
    return null;
}

// For the pre-load job: make sure the newest close is stored (waits for Databento if needed).
export async function ensureLatestChain(symbol: string): Promise<string> {
    const days = candidateDays(Date.parse(await datasetEndTs('OPRA.PILLAR')));
    if (!days.length) return 'no days';
    const db = await connectToDatabase();
    if (await optionChainModel(db).exists({ symbol, day: days[0] })) return `${days[0]} stored`;
    const c = await fetchAndStore(symbol, days[0]);
    return `${days[0]} fetched · ${c.quotes.length}`;
}

// Tickers kept warm so most visitors never wait on Databento (lib/inngest prewarm job).
export const POPULAR_CHAINS = ['AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'AMZN', 'MSFT', 'META', 'GOOGL', 'AMD', 'NFLX', 'PLTR', 'IWM', 'COIN', 'MSTR', 'AVGO', 'SMCI', 'UBER', 'JPM', 'BAC', 'INTC', 'SOFI', 'HOOD', 'BABA', 'DIS'];
