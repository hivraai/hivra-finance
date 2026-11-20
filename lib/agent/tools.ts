// Tools the investing agent can call. Each one reads our own data (Databento) and our own maths
// (lib/quant), and returns compact JSON for the model. No tool places trades or moves money.
import 'server-only';
import { getChain, getFullBars, getRecentBars, isDatabentoSymbol } from '@/lib/databento';
import { summarize } from '@/lib/quant/indicators';
import { aroundAtm, defaultExpiry, enrich, expiries, yearsTo, type ChainRow } from '@/lib/quant/chain';
import { analyze, netPremium, payoffNow, positionGreeks, type Leg } from '@/lib/quant/strategy';
import { backtestOptions, backtestStock, type OptionStrategy, type StockStrategy } from '@/lib/quant/backtest';
import { OPTION_PARAMS, STOCK_PARAMS, cleanParams } from '@/lib/quant/backtest-presets';
import { SIGNAL_TOOL_DEFS, runSignalTool } from '@/lib/signals/tools';
import { findPerp, getFundingHistory, getPerps, tradeUrl, type Perp } from '@/lib/hyperliquid';

type Json = Record<string, unknown>;
const r2 = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d);

function sym(input: Json): string {
    const s = String(input.symbol ?? '').trim().toUpperCase();
    if (!isDatabentoSymbol(s)) throw new Error(`"${s}" is not a US stock or ETF ticker we cover`);
    return s;
}

async function loadChain(symbol: string, paid: boolean) {
    // Free plans: stored chains only (popular tickers, pre-loaded nightly); a new ticker is a paid Databento request.
    const [chain, bars] = await Promise.all([getChain(symbol, { fetch: paid }), getRecentBars(symbol)]);
    if (!chain && !paid) throw new Error(`The free plan covers option chains for the most traded tickers only; ${symbol} needs Pro`);
    if (!chain || !bars.length) throw new Error(`No option chain for ${symbol}`);
    // The stock's close on the chain's own day, so IV and delta match the quotes.
    const day = chain.asOf.slice(0, 10);
    const spot = (bars.find((b) => b.date === day) ?? bars.at(-1)!).close;
    const rows = enrich(chain.quotes, spot, chain.asOf);
    return { chain, spot, rows, sums: expiries(rows, spot) };
}

const rowOut = (r: ChainRow) => ({ k: r.strike, t: r.right[0], bid: r.bid, ask: r.ask, mid: r2(r.mid), iv: r2(r.iv != null ? r.iv * 100 : null, 1), delta: r2(r.delta) });

export const TOOL_DEFS = [
    {
        name: 'get_technicals',
        description: 'Daily technical picture of a US stock or ETF as of the last close: price, change, RSI(14), MACD, 20/50/200-day averages, trend, Bollinger %B, ATR, 20-day historical volatility, volume vs average, 52-week range, nearest support/resistance and notable signals.',
        input_schema: { type: 'object', properties: { symbol: { type: 'string', description: 'Ticker, e.g. AAPL' } }, required: ['symbol'] },
    },
    {
        name: 'get_option_chain',
        description: 'Option chain of a US stock or ETF as of the last close (OPRA). Without `expiry`: every expiry with days to go, at-the-money IV and expected move, plus the strikes around the money for the default expiry (first one 7+ days out). With `expiry` (YYYY-MM-DD): that expiry\'s strikes around the money. Rows: k=strike, t=c/p, bid, ask, mid, iv (%), delta.',
        input_schema: { type: 'object', properties: { symbol: { type: 'string' }, expiry: { type: 'string' }, strikes_each_side: { type: 'integer', minimum: 2, maximum: 25 } }, required: ['symbol'] },
    },
    {
        name: 'analyze_option_strategy',
        description: 'Price a multi-leg option position at last-close mids and return net premium (positive = credit), max profit, max loss (null = unlimited), breakevens and position Greeks (per position, theta per day). Legs use contracts of one expiry. Use get_option_chain first to pick real strikes. Also answers "what if": profit/loss and return on the money at risk if the stock is at given prices (target_prices; default -20% to +20%) at expiry or on an earlier date (on_date, options re-priced with Black-Scholes at their IV).',
        input_schema: {
            type: 'object',
            properties: {
                symbol: { type: 'string' },
                expiry: { type: 'string', description: 'YYYY-MM-DD' },
                legs: { type: 'array', items: { type: 'object', properties: { right: { type: 'string', enum: ['call', 'put'] }, strike: { type: 'number' }, qty: { type: 'integer', description: 'contracts, negative = sell' } }, required: ['right', 'strike', 'qty'] } },
                stock_shares: { type: 'integer', description: 'shares of the stock in the position, negative = short (e.g. 100 for a covered call)' },
                target_prices: { type: 'array', items: { type: 'number' }, description: 'stock prices to evaluate ("what if it is at 150"); default spot -20/-10/-5/0/+5/+10/+20%' },
                on_date: { type: 'string', description: 'YYYY-MM-DD to value the position before expiry; default = at expiry' },
            },
            required: ['symbol', 'expiry', 'legs'],
        },
    },
    {
        name: 'backtest_stock',
        description: 'Backtest a long-only rule on real daily prices since 2018 (signal on the close, filled at the next open, 5 bps per side) against buy & hold. Strategies and params: sma_cross {fast, slow}; rsi_reversion {period, buyBelow, sellAbove}; macd_trend {}; breakout {lookback, exitLookback}; bollinger_reversion {period}; buy_hold {}.',
        input_schema: { type: 'object', properties: { symbol: { type: 'string' }, strategy: { type: 'string', enum: ['sma_cross', 'rsi_reversion', 'macd_trend', 'breakout', 'bollinger_reversion', 'buy_hold'] }, params: { type: 'object' }, start: { type: 'string', description: 'YYYY-MM-DD, optional' } }, required: ['symbol', 'strategy'] },
    },
    {
        name: 'backtest_options',
        description: 'MODELLED options backtest on real daily stock prices since 2018: each cycle opens on a close at Black-Scholes prices (vol = 20-day historical vol × 1.1), holds to expiry and repeats. Not historical option quotes; say so. Strategies: covered_call, cash_secured_put, long_call, long_put {otmPct, days}; iron_condor {wingPct, widthPct, days}.',
        input_schema: { type: 'object', properties: { symbol: { type: 'string' }, strategy: { type: 'string', enum: ['covered_call', 'cash_secured_put', 'long_call', 'long_put', 'iron_condor'] }, params: { type: 'object' }, start: { type: 'string' } }, required: ['symbol', 'strategy'] },
    },
    {
        name: 'get_crypto_perps',
        description: 'Live crypto perpetual futures from Hyperliquid (public market data): mark price, 24h change, funding rate (hourly and annualised), open interest and 24h volume in USD, max leverage. With coin (e.g. BTC, ETH, SOL): that perp plus its last 7 days of hourly funding. Without coin: the top perps sorted by volume, open interest, or most positive / most negative funding. Read-only; the user trades on Hyperliquid itself (trade_url), never through HIVRA.',
        input_schema: { type: 'object', properties: { coin: { type: 'string', description: 'BTC, ETH, SOL …; omit for a ranking' }, sort: { type: 'string', enum: ['volume', 'open_interest', 'funding_high', 'funding_low'] }, limit: { type: 'number', description: '1-30, default 10' } } },
    },
    ...SIGNAL_TOOL_DEFS,
] as const;

const perpOut = (p: Perp) => ({
    coin: p.coin, mark: p.mark, change24hPct: r2(p.changePct), fundingHourlyPct: r2(p.fundingHourly * 100, 5), fundingAprPct: r2(p.fundingAprPct, 1),
    openInterestUsd: Math.round(p.openInterestUsd), volume24hUsd: Math.round(p.volume24hUsd), maxLeverage: p.maxLeverage, trade_url: tradeUrl(p.coin),
});

function reportOut(rep: ReturnType<typeof backtestStock>) {
    const m = (x: typeof rep.metrics) => ({
        totalReturnPct: r2(x.totalReturnPct, 1), cagrPct: r2(x.cagrPct, 1), maxDrawdownPct: r2(x.maxDrawdownPct, 1),
        sharpe: r2(x.sharpe), volatilityPct: r2(x.volatilityPct, 1), trades: x.trades, winRatePct: r2(x.winRatePct, 0),
        avgTradePct: r2(x.avgTradePct, 2), exposurePct: r2(x.exposurePct, 0),
    });
    return {
        strategy: rep.strategy, params: rep.params, start: rep.start, end: rep.end,
        strategyMetrics: m(rep.metrics), buyAndHold: m(rep.benchmark),
        lastTrades: rep.trades.slice(-5).map((t) => ({ in: t.entryDate, out: t.exitDate, pct: r2(t.returnPct, 1) })),
        notes: rep.notes,
    };
}

export async function runTool(name: string, input: Json, { paid = false }: { paid?: boolean } = {}): Promise<Json> {
    switch (name) {
        case 'get_technicals': {
            const symbol = sym(input);
            const s = summarize(await getRecentBars(symbol));
            if (!s) throw new Error(`No price history for ${symbol}`);
            return { symbol, ...JSON.parse(JSON.stringify(s, (_k, v) => (typeof v === 'number' ? r2(v, 3) : v))), note: 'Daily bars, consolidated US tape (Databento), split-adjusted by detection.' };
        }
        case 'get_option_chain': {
            const symbol = sym(input);
            const { chain, spot, rows, sums } = await loadChain(symbol, paid);
            const expiry = typeof input.expiry === 'string' && sums.some((s) => s.expiry === input.expiry) ? input.expiry : defaultExpiry(sums);
            const n = Math.min(Math.max(Number(input.strikes_each_side) || 8, 2), 25);
            return {
                symbol, spot, asOf: chain.asOf,
                expiries: input.expiry ? undefined : sums.slice(0, 24).map((s) => ({ expiry: s.expiry, days: s.days, atmIvPct: r2(s.atmIv != null ? s.atmIv * 100 : null, 1), expectedMove: r2(s.expectedMove) })),
                expiry, rows: expiry ? aroundAtm(rows, expiry, spot, n).map(rowOut) : [],
            };
        }
        case 'analyze_option_strategy': {
            const symbol = sym(input);
            const { spot, rows, chain } = await loadChain(symbol, paid);
            const expiry = String(input.expiry ?? '');
            const legsIn = Array.isArray(input.legs) ? (input.legs as Json[]).slice(0, 8) : [];
            const legs: Leg[] = legsIn.map((l) => {
                const right = l.right === 'put' ? 'put' : 'call';
                const strike = Number(l.strike), qty = Math.trunc(Number(l.qty));
                const row = rows.find((r) => r.expiry === expiry && r.right === right && r.strike === strike);
                if (!row) throw new Error(`No ${right} at ${strike} for ${expiry} in the chain`);
                return { kind: 'option', right, strike, qty, premium: row.mid, vol: row.iv ?? undefined, years: yearsTo(expiry, chain.asOf) };
            });
            const shares = Math.trunc(Number(input.stock_shares) || 0);
            if (shares) legs.push({ kind: 'stock', qty: shares, price: spot });
            if (!legs.length) throw new Error('No legs');
            const a = analyze(legs, spot), g = positionGreeks(legs, spot);
            const net = netPremium(legs);
            // "What if": P/L if the stock is at each price on on_date (default expiry).
            const full = yearsTo(expiry, chain.asOf);
            const onDate = typeof input.on_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.on_date) && input.on_date < expiry ? input.on_date : expiry;
            const left = onDate === expiry ? 0 : Math.max(yearsTo(expiry, onDate), 0);
            const shifted: Leg[] = legs.map((l) => (l.kind === 'option' ? { ...l, years: Math.min(left, full) } : l));
            const risk = a.maxLoss != null && a.maxLoss > 0 ? a.maxLoss : net < 0 ? -net : null;
            const asked = Array.isArray(input.target_prices) ? (input.target_prices as unknown[]).map(Number).filter((n) => n > 0).slice(0, 15) : [];
            const prices = asked.length ? asked : [-20, -10, -5, 0, 5, 10, 20].map((m) => spot * (1 + m / 100));
            const whatIf = {
                valuedOn: onDate, atExpiry: onDate === expiry,
                rows: prices.map((p) => { const pl = payoffNow(shifted, p); return { stockPrice: r2(p), movePct: r2(((p - spot) / spot) * 100, 1), profitLoss: r2(pl), returnOnRiskPct: risk ? r2((pl / risk) * 100, 0) : null }; }),
            };
            return {
                symbol, spot, expiry, legs: legsIn, netPremium: r2(netPremium(legs)),
                maxProfit: r2(a.maxProfit), maxLoss: r2(a.maxLoss), breakevens: a.breakevens,
                greeks: { delta: r2(g.delta, 1), gamma: r2(g.gamma, 3), thetaPerDay: r2(g.theta), vegaPerVolPoint: r2(g.vega), rho: r2(g.rho) },
                whatIf,
                note: 'Priced at last-close mids; real fills land between bid and ask. Max profit null = unlimited, max loss null = unlimited. whatIf before expiry uses today\'s implied volatility; real prices will differ. Not financial advice.',
            };
        }
        case 'backtest_stock': {
            const symbol = sym(input);
            const name_ = String(input.strategy);
            if (!Object.hasOwn(STOCK_PARAMS, name_)) throw new Error('Unknown strategy');
            let bars = await getFullBars(symbol);
            if (typeof input.start === 'string') bars = bars.filter((b) => b.date >= (input.start as string));
            const strat = { name: name_, ...cleanParams(STOCK_PARAMS[name_], input.params) } as StockStrategy;
            return { symbol, ...reportOut(backtestStock(bars, strat)) };
        }
        case 'backtest_options': {
            const symbol = sym(input);
            const name_ = String(input.strategy);
            if (!Object.hasOwn(OPTION_PARAMS, name_)) throw new Error('Unknown strategy');
            let bars = await getFullBars(symbol);
            if (typeof input.start === 'string') bars = bars.filter((b) => b.date >= (input.start as string));
            const strat = { name: name_, ...cleanParams(OPTION_PARAMS[name_], input.params) } as OptionStrategy;
            return { symbol, ...reportOut(backtestOptions(bars, strat)) };
        }
        case 'get_market_signals':
            return runSignalTool(name, input, { paid });
        case 'get_crypto_perps': {
            const note = 'Source: Hyperliquid, live. Positive funding = longs pay shorts. Perpetuals are leveraged; not financial advice.';
            if (typeof input.coin === 'string' && input.coin.trim()) {
                const p = await findPerp(input.coin);
                if (!p) throw new Error(`Hyperliquid has no perpetual for ${input.coin}`);
                const hist = await getFundingHistory(p.coin).catch(() => []);
                const avg = hist.length ? hist.reduce((a, h) => a + h.fundingHourly, 0) / hist.length : null;
                return { ...perpOut(p), funding7d: { samples: hist.length, avgAprPct: avg == null ? null : r2(avg * 24 * 365 * 100, 1), last24: hist.slice(-24).map((h) => ({ t: h.time.slice(5, 16), aprPct: r2(h.fundingHourly * 24 * 365 * 100, 1) })) }, note };
            }
            const key = { volume: (p: Perp) => -p.volume24hUsd, open_interest: (p: Perp) => -p.openInterestUsd, funding_high: (p: Perp) => -p.fundingHourly, funding_low: (p: Perp) => p.fundingHourly }[String(input.sort)] ?? ((p: Perp) => -p.volume24hUsd);
            const limit = Math.min(Math.max(Math.trunc(Number(input.limit)) || 10, 1), 30);
            // Funding rankings skip thin markets, where a tiny book can post an extreme rate.
            const perps = (await getPerps()).filter((p) => !String(input.sort).startsWith('funding') || p.volume24hUsd >= 1_000_000);
            return { sort: input.sort ?? 'volume', perps: perps.sort((a, b) => key(a) - key(b)).slice(0, limit).map(perpOut), note };
        }
        default:
            throw new Error(`Unknown tool ${name}`);
    }
}
