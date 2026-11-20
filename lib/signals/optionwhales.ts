// OptionWhales client (options flow, dark pool, GEX, volatility, OI, earnings, macro, congress,
// insiders, short interest, ETF flow). Server only: the key never reaches the browser.
// Every response is cached in Next's data cache and shared by all users, so one upstream call
// serves everyone for `revalidate` seconds. Budget: the Pro plan allows 60 calls a minute and
// 5,000 a day. Market-wide screens refresh at most every 5 minutes (~300 calls/day each at full
// use; the data is up to 15 min delayed anyway), per-ticker screens every 15-60 minutes per ticker.
// Kill switch: OPTIONWHALES_ENABLED=false turns every signal off without a deploy of code.
import 'server-only';

const BASE = 'https://api.optionwhales.io/v1';

export class SignalsUnavailable extends Error {}

export const signalsConfigured = () =>
    Boolean(process.env.OPTIONWHALES_API_KEY) && process.env.OPTIONWHALES_ENABLED !== 'false';

export async function ow<T = Record<string, unknown>>(path: string, params: Record<string, string | number | undefined> = {}, revalidate = 120): Promise<T> {
    if (!signalsConfigured()) throw new SignalsUnavailable('Market signals are not configured');
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
    const url = `${BASE}/${path}${qs.size ? `?${qs}` : ''}`;
    const res = await fetch(url, {
        headers: { 'X-API-Key': process.env.OPTIONWHALES_API_KEY! },
        next: { revalidate, tags: ['optionwhales'] },
        signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new SignalsUnavailable(`Signals source answered ${res.status}`);
    return res.json() as Promise<T>;
}

// "O:AAPL261120C00365000" → { underlying: 'AAPL', expiry: '2026-11-20', right: 'call', strike: 365 }
export function parseOcc(occ: string | null | undefined) {
    const m = /^(?:O:)?([A-Z.]+?)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(occ ?? '');
    if (!m) return null;
    return { underlying: m[1], expiry: `20${m[2]}-${m[3]}-${m[4]}`, right: m[5] === 'C' ? 'call' as const : 'put' as const, strike: Number(m[6]) / 1000 };
}
