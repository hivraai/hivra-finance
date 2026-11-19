// Default parameters per backtest strategy, shared by the form, the server action and the agent.
export const STOCK_PARAMS: Record<string, Record<string, number>> = {
    sma_cross: { fast: 50, slow: 200 },
    rsi_reversion: { period: 14, buyBelow: 30, sellAbove: 55 },
    macd_trend: {},
    breakout: { lookback: 55, exitLookback: 20 },
    bollinger_reversion: { period: 20 },
    buy_hold: {},
};

export const OPTION_PARAMS: Record<string, Record<string, number>> = {
    covered_call: { otmPct: 5, days: 30 },
    cash_secured_put: { otmPct: 5, days: 30 },
    long_call: { otmPct: 0, days: 60 },
    long_put: { otmPct: 0, days: 60 },
    iron_condor: { wingPct: 5, widthPct: 5, days: 30 },
};

// Only the strategy's own keys, each a finite number (default when missing), clamped to [0, 1000].
export function cleanParams(defaults: Record<string, number>, given: unknown): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, d] of Object.entries(defaults)) {
        const v = Number((given as Record<string, unknown> | undefined)?.[k]);
        out[k] = Number.isFinite(v) ? Math.max(0, Math.min(v, 1000)) : d;
    }
    return out;
}
