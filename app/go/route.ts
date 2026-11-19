// TradingView widgets link symbols here (?tvwidgetsymbol=NASDAQ:AAPL) so a click stays on
// HIVRA Finance and opens our own stock page instead of tradingview.com.
import { NextResponse } from 'next/server';
import { appSymbolFromTradingView } from '@/lib/utils';

export function GET(req: Request) {
    const url = new URL(req.url);
    const raw = url.searchParams.get('tvwidgetsymbol') ?? url.searchParams.get('symbol') ?? '';
    if (!/^[A-Za-z0-9:._!&-]{1,40}$/.test(raw)) return NextResponse.redirect(new URL('/dashboard', url));
    const symbol = appSymbolFromTradingView(raw);
    return NextResponse.redirect(new URL(`/stocks/${encodeURIComponent(symbol)}`, url));
}
