'use server';

import { requireUserId } from '@/lib/better-auth/auth';
import { isRateLimited } from '@/lib/rate-limit';
import { getFullBars, isDatabentoSymbol } from '@/lib/databento';
import { OPTION_PARAMS, STOCK_PARAMS, cleanParams } from '@/lib/quant/backtest-presets';
import { backtestOptions, backtestStock, type BacktestReport, type OptionStrategy, type StockStrategy } from '@/lib/quant/backtest';

export type BacktestRequest = {
    symbol: string;
    kind: 'stock' | 'options';
    strategy: string;
    params: Record<string, number>;
    start?: string;
    capital?: number;
};


// Thin the equity curve for the browser (a 7-year daily run is ~1,700 points).
function thin(rep: BacktestReport, max = 500): BacktestReport {
    const n = rep.equity.length;
    if (n <= max) return rep;
    const step = n / max;
    const equity = Array.from({ length: max }, (_, i) => rep.equity[Math.floor(i * step)]);
    equity[max - 1] = rep.equity[n - 1];
    return { ...rep, equity };
}

export async function runBacktest(req: BacktestRequest): Promise<{ ok: true; report: BacktestReport } | { ok: false; error: string }> {
    const userId = await requireUserId();
    if (await isRateLimited(`backtest:${userId}`, 30, 600)) return { ok: false, error: 'Too many backtests. Wait a few minutes.' };
    const symbol = String(req.symbol ?? '').trim().toUpperCase();
    if (!isDatabentoSymbol(symbol)) return { ok: false, error: 'Enter a US stock or ETF ticker.' };
    const table = req.kind === 'options' ? OPTION_PARAMS : STOCK_PARAMS;
    if (!Object.hasOwn(table, req.strategy)) return { ok: false, error: 'Unknown strategy.' };
    const params = cleanParams(table[req.strategy], req.params);
    const capital = Math.min(Math.max(Number(req.capital) || 10_000, 1000), 10_000_000);

    let bars = await getFullBars(symbol).catch(() => []);
    if (req.start && /^\d{4}-\d{2}-\d{2}$/.test(req.start)) bars = bars.filter((b) => b.date >= req.start!);
    if (!bars.length) return { ok: false, error: `No price history for ${symbol}.` };
    try {
        const report = req.kind === 'options'
            ? backtestOptions(bars, { name: req.strategy, ...params } as OptionStrategy, { capital })
            : backtestStock(bars, { name: req.strategy, ...params } as StockStrategy, { capital });
        return { ok: true, report: thin(report) };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Backtest failed.' };
    }
}
