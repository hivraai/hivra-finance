import { describe, it, expect } from 'vitest';
import { appSymbolFromTradingView, formatSymbolForTradingView } from '@/lib/utils';

describe('TradingView widget clicks open our stock pages', () => {
    it('drops US exchanges', () => {
        expect(appSymbolFromTradingView('NASDAQ:AAPL')).toBe('AAPL');
        expect(appSymbolFromTradingView('NYSE:BRK.B')).toBe('BRK.B');
        expect(appSymbolFromTradingView('AMEX:SPY')).toBe('SPY');
    });
    it('round-trips international listings', () => {
        for (const s of ['SAP.DE', '7203.T', 'RELIANCE.BO', '0700.HK']) {
            expect(appSymbolFromTradingView(formatSymbolForTradingView(s))).toBe(s);
        }
    });
    it('India: NSE and BSE both resolve', () => {
        expect(appSymbolFromTradingView('NSE:RELIANCE')).toBe('RELIANCE.NS');
        expect(appSymbolFromTradingView('BSE:RELIANCE')).toBe('RELIANCE.BO');
    });
});
