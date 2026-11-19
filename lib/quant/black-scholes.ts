// Black-Scholes-Merton for European options with a continuous dividend yield.
// Written for HIVRA Finance from the textbook model (Hull, Options, Futures and Other Derivatives). Pure functions.

export type Right = 'call' | 'put';
export type BsInput = { spot: number; strike: number; years: number; vol: number; rate?: number; dividend?: number };

const SQRT2PI = Math.sqrt(2 * Math.PI);
export const pdf = (x: number) => Math.exp(-0.5 * x * x) / SQRT2PI;

// Standard normal CDF (Abramowitz-Stegun 7.1.26 via erf), |error| < 1.5e-7.
export function cdf(x: number): number {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

function d1d2({ spot, strike, years, vol, rate = 0, dividend = 0 }: BsInput) {
    const sv = vol * Math.sqrt(years);
    const d1 = (Math.log(spot / strike) + (rate - dividend + 0.5 * vol * vol) * years) / sv;
    return { d1, d2: d1 - sv };
}

const intrinsic = (right: Right, spot: number, strike: number) => Math.max(right === 'call' ? spot - strike : strike - spot, 0);

export function price(right: Right, input: BsInput): number {
    const { spot, strike, years, vol, rate = 0, dividend = 0 } = input;
    if (years <= 0 || vol <= 0) return intrinsic(right, spot, strike);
    const { d1, d2 } = d1d2(input);
    const df = Math.exp(-rate * years), qf = Math.exp(-dividend * years);
    return right === 'call'
        ? spot * qf * cdf(d1) - strike * df * cdf(d2)
        : strike * df * cdf(-d2) - spot * qf * cdf(-d1);
}

export type Greeks = { delta: number; gamma: number; theta: number; vega: number; rho: number };

// theta per calendar day, vega and rho per 1 percentage point.
export function greeks(right: Right, input: BsInput): Greeks {
    const { spot, strike, years, vol, rate = 0, dividend = 0 } = input;
    if (years <= 0 || vol <= 0) {
        const itm = right === 'call' ? spot > strike : spot < strike;
        return { delta: itm ? (right === 'call' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }
    const { d1, d2 } = d1d2(input);
    const df = Math.exp(-rate * years), qf = Math.exp(-dividend * years), sq = Math.sqrt(years);
    const gamma = (qf * pdf(d1)) / (spot * vol * sq);
    const vega = (spot * qf * pdf(d1) * sq) / 100;
    if (right === 'call') {
        const theta = (-(spot * qf * pdf(d1) * vol) / (2 * sq) - rate * strike * df * cdf(d2) + dividend * spot * qf * cdf(d1)) / 365;
        return { delta: qf * cdf(d1), gamma, theta, vega, rho: (strike * years * df * cdf(d2)) / 100 };
    }
    const theta = (-(spot * qf * pdf(d1) * vol) / (2 * sq) + rate * strike * df * cdf(-d2) - dividend * spot * qf * cdf(-d1)) / 365;
    return { delta: qf * (cdf(d1) - 1), gamma, theta, vega, rho: (-strike * years * df * cdf(-d2)) / 100 };
}

// Implied volatility by bisection (robust where Newton diverges on deep ITM/OTM). Null when the price is
// below intrinsic or above what any volatility can produce.
export function impliedVol(right: Right, marketPrice: number, input: Omit<BsInput, 'vol'>): number | null {
    const { spot, strike, years, rate = 0, dividend = 0 } = input;
    if (!(marketPrice > 0) || years <= 0) return null;
    const floor = Math.max(right === 'call'
        ? spot * Math.exp(-dividend * years) - strike * Math.exp(-rate * years)
        : strike * Math.exp(-rate * years) - spot * Math.exp(-dividend * years), 0);
    if (marketPrice < floor - 1e-9) return null;
    let lo = 1e-4, hi = 5;
    if (price(right, { ...input, vol: hi }) < marketPrice) return null;
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (price(right, { ...input, vol: mid }) > marketPrice) hi = mid; else lo = mid;
        if (hi - lo < 1e-6) break;
    }
    return (lo + hi) / 2;
}

// One-standard-deviation expected move by expiry from an implied (or historical) volatility.
export const expectedMove = (spot: number, vol: number, years: number) => spot * vol * Math.sqrt(Math.max(years, 0));
