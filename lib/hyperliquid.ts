// Hyperliquid perpetuals, read from its public info API (no key, no account). Free, unlike Databento.
// We only read market data and link out to Hyperliquid's own trade page: HIVRA never places orders,
// holds funds or earns a referral on it.
import 'server-only';

const INFO_URL = 'https://api.hyperliquid.xyz/info';
const TTL_MS = 30_000;

export type Perp = {
    coin: string;
    mark: number;
    prevDay: number;
    changePct: number;
    fundingHourly: number; // as a fraction, e.g. 0.0000125
    fundingAprPct: number; // hourly × 24 × 365, in %
    openInterestUsd: number;
    volume24hUsd: number;
    maxLeverage: number;
};

async function info<T>(body: Record<string, unknown>, timeoutMs = 8_000): Promise<T> {
    const res = await fetch(INFO_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Hyperliquid ${body.type}: HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

type Meta = { universe: { name: string; maxLeverage: number; isDelisted?: boolean }[] };
type Ctx = { markPx: string; prevDayPx: string; funding: string; openInterest: string; dayNtlVlm: string };

// One request for every perp, cached per instance for 30 s (and shared while in flight).
let cached: { at: number; perps: Perp[] } | null = null;
let inflight: Promise<Perp[]> | null = null;

export async function getPerps(): Promise<Perp[]> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.perps;
    inflight ??= (async () => {
        try {
            const [meta, ctxs] = await info<[Meta, Ctx[]]>({ type: 'metaAndAssetCtxs' });
            const perps: Perp[] = [];
            meta.universe.forEach((u, i) => {
                const c = ctxs[i];
                if (!c || u.isDelisted) return;
                const mark = Number(c.markPx), prevDay = Number(c.prevDayPx), funding = Number(c.funding);
                if (!(mark > 0)) return;
                perps.push({
                    coin: u.name, mark, prevDay,
                    changePct: prevDay > 0 ? ((mark - prevDay) / prevDay) * 100 : 0,
                    fundingHourly: funding,
                    fundingAprPct: funding * 24 * 365 * 100,
                    openInterestUsd: Number(c.openInterest) * mark,
                    volume24hUsd: Number(c.dayNtlVlm),
                    maxLeverage: u.maxLeverage,
                });
            });
            cached = { at: Date.now(), perps };
            return perps;
        } finally {
            inflight = null;
        }
    })();
    return inflight;
}

// BINANCE:BTCUSDT, BTC-USD, BTCUSD, SOL → the Hyperliquid coin (BTC, SOL; PEPE → kPEPE), or null.
export function coinFromSymbol(symbol: string): string | null {
    const s = symbol.toUpperCase().split(':').pop()!.replace(/[-_/]/g, '');
    const base = s.replace(/(USDT|USDC|USD|PERP)$/, '');
    return base && /^[A-Z0-9]{2,12}$/.test(base) ? base : null;
}

export async function findPerp(coinOrSymbol: string): Promise<Perp | null> {
    const coin = coinFromSymbol(coinOrSymbol);
    if (!coin) return null;
    const perps = await getPerps();
    return perps.find((p) => p.coin === coin) ?? perps.find((p) => p.coin === `k${coin}`) ?? null;
}

// Hourly funding over the last `hours` (max 500 points per call).
export async function getFundingHistory(coin: string, hours = 168): Promise<{ time: string; fundingHourly: number }[]> {
    const rows = await info<{ time: number; fundingRate: string }[]>({ type: 'fundingHistory', coin, startTime: Date.now() - hours * 3_600_000 });
    return rows.map((r) => ({ time: new Date(r.time).toISOString(), fundingHourly: Number(r.fundingRate) }));
}

// Hyperliquid's own trade page for the coin. Plain link: no referral code.
export const tradeUrl = (coin: string) => `https://app.hyperliquid.xyz/trade/${encodeURIComponent(coin)}`;
