// Market-signal tools for the AI analyst. Written transport-neutral (name, description, JSON
// schema, run) so the MCP server can register the same definitions without a second copy.
// Every tool here is a paid feature: free plans get an error the model turns into "this needs Pro".
import 'server-only';
import { VIEWS, cleanSymbol, viewById, type Row, type ViewId } from './views';
import { SignalsUnavailable } from './optionwhales';

export const SIGNAL_VIEWS: Record<ViewId, string> = {
    map: 'market-wide directional options flow per ticker (bullish/bearish score, net notional, order count)',
    whales: 'the largest single option orders today (p99 blocks, sweeps, bursts) with side, premium and contract',
    gex: 'dealer gamma exposure for one ticker: call wall, put wall, gamma flip, max pain and GEX by strike (needs symbol)',
    volatility: 'implied volatility for one ticker: IV, IV rank, IV percentile and the term structure (needs symbol)',
    oi: 'tickers with the largest open-interest gains and losses since the previous day',
    strategies: 'multi-leg option packages traded today (spreads, condors, risk reversals) with direction and premium',
    darkpool: 'large off-exchange (dark pool) stock prints today, 15 minutes delayed, with options confirmation',
    earnings: 'upcoming and today\'s earnings with the options-flow read on each (signal, intent, net premium)',
    'short-interest': 'bi-weekly FINRA short interest and days to cover for one ticker (needs symbol)',
    'etf-flow': 'options flow on the major ETFs (SPY, QQQ, IWM, TLT, GLD, sector ETFs): net premium today and last 5 sessions',
    congress: 'recent stock trades disclosed by members of the US Congress (up to ~45 days late)',
    insiders: 'SEC Form 4 insider transactions for one ticker: buys, sells, grants (needs symbol)',
    fda: 'upcoming FDA and clinical-trial catalysts for biotech and pharma tickers (phase, condition, estimated date)',
    macro: 'the US economic calendar for the coming week with impact, consensus and previous values',
};

export const SIGNAL_TOOL_DEFS = [
    {
        name: 'get_market_signals',
        description: `Market signals from the options and stock tape (data through OptionWhales; recorded large orders only, not the full tape). Views: ${Object.entries(SIGNAL_VIEWS).map(([k, v]) => `${k} = ${v}`).join('; ')}. Optional "ticker" filters market-wide views to one ticker. Rows come sorted by the most relevant column.`,
        input_schema: {
            type: 'object',
            properties: {
                view: { type: 'string', enum: Object.keys(SIGNAL_VIEWS) },
                symbol: { type: 'string', description: 'Ticker for per-ticker views (gex, volatility, short-interest, insiders)' },
                ticker: { type: 'string', description: 'Only rows for this ticker (market-wide views)' },
                side: { type: 'string', enum: ['bullish', 'bearish'], description: 'Only bullish or bearish rows, where the view has a side' },
                limit: { type: 'integer', minimum: 1, maximum: 60 },
            },
            required: ['view'],
        },
    },
] as const;

const sortRows = (rows: Row[], key: string, dir: 'asc' | 'desc') => [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null) return 1; if (y == null) return -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return dir === 'asc' ? c : -c;
});

export async function runSignalTool(name: string, input: Record<string, unknown>, { paid }: { paid: boolean }) {
    if (name !== 'get_market_signals') throw new Error(`Unknown tool ${name}`);
    if (!paid) throw new Error('Market signals are a Pro feature. The user can upgrade on the Billing page.');
    const view = viewById(String(input.view ?? ''));
    if (!view) throw new Error(`Unknown view; use one of ${VIEWS.map((v) => v.id).join(', ')}`);
    const symbol = cleanSymbol(input.symbol, view.symbol ?? 'SPY');
    try {
        const data = await view.load(symbol);
        let rows = data.rows;
        const tk = input.ticker ? cleanSymbol(input.ticker, '') : '';
        if (tk) rows = rows.filter((r) => r.ticker === tk);
        if (input.side === 'bullish' || input.side === 'bearish') rows = rows.filter((r) => (r.bias ?? r.side) === input.side);
        const limit = Math.min(Math.max(Number(input.limit) || 25, 1), 60);
        return {
            view: view.id, symbol: view.symbol ? symbol : undefined, asOf: data.asOf,
            summary: Object.fromEntries(data.tiles.map((t) => [t.key, t.value])),
            totalRows: rows.length, rows: sortRows(rows, view.sort.key, view.sort.dir).slice(0, limit),
            note: 'Flow figures cover recorded large orders only. Not financial advice; past flow does not guarantee future results.',
        };
    } catch (e) {
        if (e instanceof SignalsUnavailable) throw new Error('Market signals are unavailable right now');
        throw e;
    }
}
