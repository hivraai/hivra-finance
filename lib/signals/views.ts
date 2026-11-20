// The signal screens: what each one reads from OptionWhales and the columns it shows.
// Shared by the pages (/signals/<view>), the AI analyst's tools and, later, the MCP server, so
// a screen, the agent and the MCP always describe the same numbers.
import 'server-only';
import { ow, parseOcc } from './optionwhales';

export type ColType = 'text' | 'ticker' | 'num' | 'money' | 'pct' | 'date' | 'side' | 'link';
export type Col = { key: string; type: ColType; filter?: boolean };
export type Tile = { key: string; value: number | string | null; type: ColType };
export type Row = Record<string, string | number | null>;
export type ViewData = { asOf: string | null; tiles: Tile[]; rows: Row[] };

export type ViewId = 'map' | 'whales' | 'gex' | 'volatility' | 'oi' | 'strategies'
    | 'darkpool' | 'earnings' | 'short-interest' | 'etf-flow' | 'congress' | 'insiders' | 'macro' | 'fda';

export type ViewDef = {
    id: ViewId;
    group: 'options' | 'signals';
    symbol?: string; // default ticker when the screen is per ticker
    sort: { key: string; dir: 'asc' | 'desc' };
    cols: Col[];
    load: (symbol: string) => Promise<ViewData>;
};

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const s = (v: unknown): string | null => (v == null || v === '' ? null : String(v));
const r2 = (v: unknown, d = 2) => { const x = n(v); return x == null ? null : Math.round(x * 10 ** d) / 10 ** d; };
const contract = (occ: string) => { const p = parseOcc(occ); return p ? `${p.right === 'call' ? 'C' : 'P'} ${p.strike} · ${p.expiry}` : occ; };
// Order side: buy / sell. Bias of an option order: buying calls or selling puts leans bullish,
// buying puts or selling calls leans bearish.
const orderSide = (d: unknown) => { const x = String(d ?? '').toLowerCase(); return x === 'buy' || x === 'purchase' ? 'buy' : x === 'sell' || x.startsWith('sale') ? 'sell' : null; };
const optionBias = (right: 'call' | 'put' | undefined, d: unknown) => { const o = orderSide(d); if (!right || !o) return null; return (right === 'call') === (o === 'buy') ? 'bullish' : 'bearish'; };
const lean = (side: unknown) => { const x = String(side ?? '').toLowerCase(); return x === 'buy' || x === 'bullish' || x === 'purchase' ? 'bullish' : x === 'sell' || x === 'bearish' || x.startsWith('sale') ? 'bearish' : x || null; };

async function session(): Promise<string> {
    const d = await ow<J>('directional/current', {}, 300);
    return String(d.session ?? new Date().toISOString().slice(0, 10));
}

const INSIDER_CODES: Record<string, string> = { P: 'buy', S: 'sell', A: 'grant', M: 'exercise', F: 'tax', G: 'gift', D: 'disposition', C: 'conversion' };
const ETFS = ['SPY', 'QQQ', 'IWM', 'DIA', 'TLT', 'GLD', 'XLF', 'XLE', 'XLK', 'SMH', 'HYG', 'EEM'];

export const VIEWS: ViewDef[] = [
    {
        id: 'map', group: 'options', sort: { key: 'score', dir: 'desc' },
        cols: [{ key: 'ticker', type: 'ticker' }, { key: 'bias', type: 'side', filter: true }, { key: 'score', type: 'money' }, { key: 'netNotional', type: 'money' }, { key: 'imbalance', type: 'num' }, { key: 'orders', type: 'num' }, { key: 'atmIv', type: 'pct' }, { key: 'price', type: 'money' }],
        async load() {
            const d = await ow<J>('directional/current', {}, 300);
            return {
                asOf: s(d.computed_at),
                tiles: [{ key: 'bullishTickers', value: n(d.bullish_count), type: 'num' }, { key: 'bearishTickers', value: n(d.bearish_count), type: 'num' }, { key: 'largeOrders', value: n(d.total_large_orders), type: 'num' }],
                rows: (d.data ?? []).map((x: J) => ({ ticker: x.ticker, bias: n(x.directional_score)! >= 0 ? 'bullish' : 'bearish', score: r2(x.directional_score, 0), netNotional: r2(x.net_notional, 0), imbalance: r2(x.imbalance_score), orders: n(x.large_order_count), atmIv: r2(x.atm_iv, 1), price: r2(x.underlying_price) })),
            };
        },
    },
    {
        id: 'whales', group: 'options', sort: { key: 'premium', dir: 'desc' },
        cols: [{ key: 'time', type: 'text' }, { key: 'ticker', type: 'ticker' }, { key: 'contract', type: 'text' }, { key: 'right', type: 'text', filter: true }, { key: 'orderType', type: 'text', filter: true }, { key: 'side', type: 'side', filter: true }, { key: 'bias', type: 'side', filter: true }, { key: 'confidence', type: 'pct' }, { key: 'contracts', type: 'num' }, { key: 'premium', type: 'money' }],
        async load() {
            const d = await ow<J>('abnormal-trades/current', { limit: 200 }, 300);
            return {
                asOf: s(d.updated_at), tiles: [],
                rows: (d.trades ?? []).map((x: J) => {
                    const p = parseOcc(x.option_ticker);
                    return { time: s(x.timestamp_et), ticker: x.ticker, contract: contract(x.option_ticker), right: p?.right ?? null, orderType: s(x.order_type), side: orderSide(x.direction), bias: optionBias(p?.right, x.direction), confidence: r2(n(x.direction_confidence)! * 100, 0), contracts: n(x.total_contracts), premium: r2(x.total_premium, 0) };
                }),
            };
        },
    },
    {
        id: 'gex', group: 'options', symbol: 'SPY', sort: { key: 'strike', dir: 'desc' },
        cols: [{ key: 'strike', type: 'money' }, { key: 'callGex', type: 'money' }, { key: 'putGex', type: 'money' }, { key: 'netGex', type: 'money' }, { key: 'callOi', type: 'num' }, { key: 'putOi', type: 'num' }],
        async load(sym) {
            const ses = await session();
            const [lv, g] = await Promise.all([ow<J>(`gex/${ses}/${sym}/levels`, {}, 900), ow<J>(`gex/${ses}/${sym}`, {}, 900)]);
            const spot = n(lv.spot) ?? n(g.summary?.spot) ?? 0;
            const near = (g.by_strike ?? []).filter((x: J) => spot <= 0 || Math.abs(n(x.strike)! - spot) / spot <= 0.15);
            return {
                asOf: s(lv.computed_at),
                tiles: [{ key: 'spot', value: r2(spot), type: 'money' }, { key: 'callWall', value: n(lv.call_wall?.strike), type: 'money' }, { key: 'gammaFlip', value: r2(lv.gamma_flip), type: 'money' }, { key: 'putWall', value: n(lv.put_wall?.strike), type: 'money' }, { key: 'maxPain', value: n(lv.max_pain), type: 'money' }, { key: 'netGex', value: r2(g.summary?.net_gex, 0), type: 'money' }],
                rows: near.map((x: J) => ({ strike: n(x.strike), callGex: r2(x.call_gex, 0), putGex: r2(x.put_gex, 0), netGex: r2(x.net_gex, 0), callOi: n(x.call_oi), putOi: n(x.put_oi) })),
            };
        },
    },
    {
        id: 'volatility', group: 'options', symbol: 'SPY', sort: { key: 'dte', dir: 'asc' },
        cols: [{ key: 'dte', type: 'num' }, { key: 'atmIv', type: 'pct' }],
        async load(sym) {
            const [rank, stats, term] = await Promise.all([ow<J>(`volatility/${sym}/iv-rank`, {}, 1800), ow<J>(`volatility/${sym}/stats`, {}, 1800), ow<J>(`volatility/${sym}/term-structure`, {}, 1800)]);
            return {
                asOf: s(term.ts) ?? s(rank.to),
                tiles: [{ key: 'iv', value: r2(n(rank.current)! * 100, 1), type: 'pct' }, { key: 'ivRank', value: r2(n(rank.iv_rank)! * 100, 0), type: 'pct' }, { key: 'ivPercentile', value: r2(n(rank.iv_percentile)! * 100, 0), type: 'pct' }, { key: 'ivMean', value: r2(n(stats.mean)! * 100, 1), type: 'pct' }, { key: 'zscore', value: r2(stats.zscore), type: 'num' }],
                rows: (term.term_structure ?? []).map((x: J) => ({ dte: n(x.dte), atmIv: r2(n(x.atm_iv)! * 100, 1) })),
            };
        },
    },
    {
        id: 'oi', group: 'options', sort: { key: 'change', dir: 'desc' },
        cols: [{ key: 'ticker', type: 'ticker' }, { key: 'list', type: 'text', filter: true }, { key: 'totalOi', type: 'num' }, { key: 'change', type: 'num' }, { key: 'callChange', type: 'num' }, { key: 'putChange', type: 'num' }, { key: 'pctChange', type: 'pct' }, { key: 'volume', type: 'num' }],
        async load() {
            const d = await ow<J>('oi/movers', { limit: 100 }, 900);
            const map = (list: string) => (x: J) => ({ ticker: x.ticker, list, totalOi: n(x.total_oi), change: n(x.total_oi_change), callChange: n(x.call_oi_change), putChange: n(x.put_oi_change), pctChange: r2(x.pct_change, 1), volume: n(x.total_volume) });
            return { asOf: s(d.as_of?.oi_date), tiles: [], rows: [...(d.top_gainers ?? []).map(map('gainers')), ...(d.top_losers ?? []).map(map('losers'))] };
        },
    },
    {
        id: 'strategies', group: 'options', sort: { key: 'notional', dir: 'desc' },
        cols: [{ key: 'time', type: 'text' }, { key: 'ticker', type: 'ticker' }, { key: 'structure', type: 'text', filter: true }, { key: 'side', type: 'side', filter: true }, { key: 'legs', type: 'text' }, { key: 'premiumType', type: 'text', filter: true }, { key: 'netPremium', type: 'money' }, { key: 'notional', type: 'money' }],
        async load() {
            const d = await ow<J>('options-flow/multi-leg', { limit: 200 }, 300);
            return {
                asOf: s(d.data?.as_of), tiles: [],
                rows: (d.packages ?? []).map((x: J) => ({
                    time: s(x.timestamp)?.slice(11, 16) ?? null, ticker: x.underlying, structure: s(x.structure)?.replace(/_/g, ' ') ?? null, side: lean(x.direction),
                    legs: (x.legs ?? []).map((l: J) => `${l.direction === 'buy' ? '+' : '−'}${l.size} ${l.option_type?.[0] ?? ''} ${l.strike} ${l.expiration}`).join(' / '),
                    premiumType: s(x.premium_type), netPremium: r2(x.net_premium, 0), notional: r2(x.gross_notional, 0),
                })),
            };
        },
    },
    {
        id: 'darkpool', group: 'signals', sort: { key: 'notional', dir: 'desc' },
        cols: [{ key: 'time', type: 'text' }, { key: 'ticker', type: 'ticker' }, { key: 'price', type: 'money' }, { key: 'size', type: 'num' }, { key: 'notional', type: 'money' }, { key: 'quote', type: 'text', filter: true }, { key: 'pctAdv', type: 'pct' }, { key: 'optionsRead', type: 'text', filter: true }, { key: 'venue', type: 'text', filter: true }],
        async load() {
            const [d, rk] = await Promise.all([ow<J>('darkpool/blocks', { limit: 300 }, 300), ow<J>('darkpool/ranking', { limit: 5 }, 900)]);
            return {
                asOf: s(d.as_of),
                tiles: [{ key: 'offExchangePct', value: r2(rk.market?.offexch_notional_pct, 1), type: 'pct' }, { key: 'offExchangeNotional', value: r2(rk.market?.trf_notional, 0), type: 'money' }, { key: 'topTicker', value: s(rk.ranking?.[0]?.ticker), type: 'ticker' }],
                rows: (d.blocks ?? []).map((x: J) => ({ time: s(x.ts_et), ticker: x.ticker, price: r2(x.price), size: n(x.size), notional: r2(x.notional, 0), quote: s(x.nbbo_label)?.replace(/_/g, ' ') ?? null, pctAdv: r2(x.pct_adv, 2), optionsRead: s(x.opt_confirm?.label)?.replace(/_/g, ' ') ?? null, venue: s(x.venue)?.replace(/^FINRA\//, '') ?? null })),
            };
        },
    },
    {
        id: 'earnings', group: 'signals', sort: { key: 'date', dir: 'asc' },
        cols: [{ key: 'date', type: 'date' }, { key: 'ticker', type: 'ticker' }, { key: 'company', type: 'text' }, { key: 'hour', type: 'text', filter: true }, { key: 'side', type: 'side', filter: true }, { key: 'intent', type: 'text', filter: true }, { key: 'epsEstimate', type: 'money' }, { key: 'netPremium', type: 'money' }, { key: 'orders', type: 'num' }],
        async load() {
            const d = await ow<J>('earnings/current', {}, 600);
            return {
                asOf: s(d.last_updated),
                tiles: [{ key: 'earningsCount', value: n(d.summary?.total_tickers), type: 'num' }, { key: 'bullishTickers', value: n(d.summary?.bullish), type: 'num' }, { key: 'bearishTickers', value: n(d.summary?.bearish), type: 'num' }],
                rows: (d.results ?? []).map((x: J) => ({ date: s(x.earningsDate), ticker: x.symbol, company: s(x.name), hour: s(x.hour), side: x.signal ? lean(x.signal) : null, intent: s(x.intentLabel), epsEstimate: r2(x.epsEstimate), netPremium: r2(x.netPremium, 0), orders: n(x.largeOrderCount) })),
            };
        },
    },
    {
        id: 'short-interest', group: 'signals', symbol: 'GME', sort: { key: 'date', dir: 'desc' },
        cols: [{ key: 'date', type: 'date' }, { key: 'shortInterest', type: 'num' }, { key: 'change', type: 'num' }, { key: 'avgVolume', type: 'num' }, { key: 'daysToCover', type: 'num' }],
        async load(sym) {
            const d = await ow<J>(`short/${sym}/interest`, { limit: 24 }, 3600);
            const recs: J[] = d.records ?? [];
            const rows = recs.map((x, i) => ({ date: s(x.settlement_date), shortInterest: n(x.short_interest), change: recs[i + 1] ? n(x.short_interest)! - n(recs[i + 1].short_interest)! : null, avgVolume: n(x.avg_daily_volume), daysToCover: r2(x.days_to_cover) }));
            return { asOf: rows[0]?.date ?? null, tiles: [{ key: 'shortInterest', value: rows[0]?.shortInterest ?? null, type: 'num' }, { key: 'daysToCover', value: rows[0]?.daysToCover ?? null, type: 'num' }, { key: 'change', value: rows[0]?.change ?? null, type: 'num' }], rows };
        },
    },
    {
        id: 'etf-flow', group: 'signals', sort: { key: 'netPremium', dir: 'desc' },
        cols: [{ key: 'ticker', type: 'ticker' }, { key: 'side', type: 'side', filter: true }, { key: 'netPremium', type: 'money' }, { key: 'netNotional', type: 'money' }, { key: 'score', type: 'money' }, { key: 'orders', type: 'num' }, { key: 'premium5d', type: 'money' }],
        async load() {
            const all = await Promise.all(ETFS.map((sym) => ow<J>('economic/etf-timeseries', { symbol: sym }, 900).then((d) => ({ sym, pts: (d.points ?? []) as J[] })).catch(() => ({ sym, pts: [] as J[] }))));
            const rows = all.filter((e) => e.pts.length).map(({ sym, pts }) => {
                const last = pts.at(-1)!;
                return { ticker: sym, side: n(last.directionalScore)! >= 0 ? 'bullish' : 'bearish', netPremium: r2(last.netPremium, 0), netNotional: r2(last.netNotional, 0), score: r2(last.directionalScore, 0), orders: n(last.largeOrderCount), premium5d: r2(pts.slice(-5).reduce((a, p) => a + (n(p.netPremium) ?? 0), 0), 0), session: s(last.session) };
            });
            return { asOf: rows.map((r) => r.session).sort().at(-1) ?? null, tiles: [], rows: rows.map(({ session: _s, ...r }) => r) }; // eslint-disable-line @typescript-eslint/no-unused-vars
        },
    },
    {
        id: 'congress', group: 'signals', sort: { key: 'disclosed', dir: 'desc' },
        cols: [{ key: 'disclosed', type: 'date' }, { key: 'traded', type: 'date' }, { key: 'member', type: 'text' }, { key: 'chamber', type: 'text', filter: true }, { key: 'ticker', type: 'ticker' }, { key: 'side', type: 'side', filter: true }, { key: 'amount', type: 'text', filter: true }, { key: 'source', type: 'link' }],
        async load() {
            const d = await ow<J>('congress/recent', { chamber: 'both', limit: 200 }, 1800);
            return {
                asOf: null, tiles: [],
                rows: (d.trades ?? []).map((x: J) => ({ disclosed: s(x.disclosure_date), traded: s(x.transaction_date), member: s(x.member), chamber: s(x.chamber), ticker: s(x.ticker), side: orderSide(x.transaction_type), amount: s(x.amount_range), source: s(x.source_url) })),
            };
        },
    },
    {
        id: 'insiders', group: 'signals', symbol: 'AAPL', sort: { key: 'filed', dir: 'desc' },
        cols: [{ key: 'filed', type: 'date' }, { key: 'traded', type: 'date' }, { key: 'insider', type: 'text', filter: true }, { key: 'role', type: 'text' }, { key: 'kind', type: 'text', filter: true }, { key: 'shares', type: 'num' }, { key: 'price', type: 'money' }, { key: 'value', type: 'money' }, { key: 'sharesAfter', type: 'num' }],
        async load(sym) {
            const d = await ow<J>(`insider/${sym}`, { limit: 100 }, 1800);
            return {
                asOf: null, tiles: [],
                rows: (d.transactions ?? []).map((x: J) => ({ filed: s(x.filing_date), traded: s(x.transaction_date), insider: s(x.owner), role: s(x.officer_title) ?? (x.is_officer ? 'Officer' : 'Director / owner'), kind: INSIDER_CODES[x.transaction_code] ?? s(x.transaction_code), shares: n(x.shares), price: r2(x.price), value: r2(x.value, 0), sharesAfter: n(x.shares_after) })),
            };
        },
    },
    {
        id: 'macro', group: 'signals', sort: { key: 'date', dir: 'asc' },
        cols: [{ key: 'date', type: 'date' }, { key: 'time', type: 'text' }, { key: 'event', type: 'text' }, { key: 'category', type: 'text', filter: true }, { key: 'impact', type: 'text', filter: true }, { key: 'actual', type: 'text' }, { key: 'consensus', type: 'text' }, { key: 'previous', type: 'text' }],
        async load() {
            const d = await ow<J>('economic/calendar', {}, 900);
            const next = d.summary?.nextCritical;
            return {
                asOf: s(d.meta?.refreshedAt),
                tiles: [{ key: 'events', value: n(d.summary?.totalEvents), type: 'num' }, { key: 'critical', value: n(d.summary?.criticalCount), type: 'num' }, { key: 'nextCritical', value: next ? `${next.eventName} · ${next.date} ${next.time ?? ''}`.trim() : null, type: 'text' }],
                rows: (d.events ?? []).map((x: J) => ({ date: s(x.date), time: s(x.time), event: s(x.eventName), category: s(x.category), impact: s(x.impactLevel)?.toLowerCase() ?? null, actual: s(x.actual), consensus: s(x.consensus), previous: s(x.previous) })),
            };
        },
    },
    {
        id: 'fda', group: 'signals', sort: { key: 'date', dir: 'asc' },
        cols: [{ key: 'date', type: 'date' }, { key: 'dateType', type: 'text', filter: true }, { key: 'ticker', type: 'ticker' }, { key: 'sponsor', type: 'text' }, { key: 'phase', type: 'text', filter: true }, { key: 'condition', type: 'text' }, { key: 'trial', type: 'text' }, { key: 'status', type: 'text', filter: true }, { key: 'source', type: 'link' }],
        async load() {
            const d = await ow<J>('fda/calendar', { days: 180, limit: 300 }, 3600);
            return {
                asOf: null, tiles: [],
                rows: (d.catalysts ?? []).map((x: J) => ({ date: s(x.catalyst_date), dateType: s(x.date_type)?.toLowerCase() ?? null, ticker: s(x.ticker), sponsor: s(x.sponsor), phase: s(x.phase)?.replace('PHASE', 'Phase ') ?? null, condition: s(x.condition), trial: s(x.title), status: s(x.status)?.replace(/_/g, ' ').toLowerCase() ?? null, source: s(x.source_url) })),
            };
        },
    },
];

export const viewById = (id: string) => VIEWS.find((v) => v.id === id);

export const cleanSymbol = (raw: unknown, fallback = 'SPY') => {
    const x = String(raw ?? '').trim().toUpperCase();
    return /^[A-Z][A-Z0-9.]{0,9}$/.test(x) ? x : fallback;
};
