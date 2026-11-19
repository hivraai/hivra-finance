import { Suspense } from "react";
import { CandlestickChart } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockHeader, { StockHeaderSkeleton } from "@/components/stocks/StockHeader";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import StockChart from "@/components/stocks/StockChart";
import Panel from "@/components/Panel";
import TechnicalsPanel from "@/components/stocks/TechnicalsPanel";
import AgentChat from "@/components/agent/AgentChat";
import {
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { getCompanyProfile, getStockMetrics } from '@/lib/actions/finnhub.actions';
import type { Locale } from '@/i18n/config';
import { hasFinnhubCompanyData } from '@/lib/markets';
import { formatSymbolForTradingView, isChartEmbeddable, tradingViewSymbolUrl } from '@/lib/utils';

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

async function Sentiment({ symbol }: { symbol: string }) {
    const [insight, t] = await Promise.all([getStockSentimentInsights(symbol), getTranslations('StockPage')]);
    if (!insight) return null;
    return (
        <Panel title={t('sentimentTitle')} sub={t('sentimentSub')}>
            <StockSentimentCard insight={insight} />
        </Panel>
    );
}

async function DividendYield({ symbol }: { symbol: string }) {
    // Outside the US we can't tell "no dividend" from "no data", so show nothing rather than a misleading dash
    if (!hasFinnhubCompanyData(symbol)) return null;
    const [dividendYield, t] = await Promise.all([getStockMetrics(symbol), getTranslations('StockPage')]);
    return (
        <Panel title={t('dividendYieldTitle')}>
            <p className="text-2xl font-semibold text-white">
                {dividendYield !== null ? `${dividendYield.toFixed(2)}%` : "—"}
            </p>
        </Panel>
    );
}

// TradingView's financials and profile widgets only know companies: for a crypto pair, a currency pair or a
// fund (BTC is the Grayscale Bitcoin trust, an ETF) they render a blank white "no data" card. US listings ask
// Finnhub, whose profile is empty for ETFs and funds; non-US listings keep the panels (their exchanges are covered).
async function isCompany(symbol: string): Promise<boolean> {
    if (/^(BINANCE|COINBASE|KRAKEN|BITSTAMP|BYBIT|OKX|FX|FX_IDC|OANDA|CRYPTO|INDEX|TVC|CBOE|CME|COMEX|NYMEX|CBOT|ICE):/i.test(symbol)) return false;
    if (!hasFinnhubCompanyData(symbol)) return !symbol.includes(':');
    const profile = await getCompanyProfile(symbol);
    return Boolean(profile?.name && profile?.finnhubIndustry);
}

async function FinancialsPanel({ symbol, tvSymbol, locale }: { symbol: string; tvSymbol: string; locale: Locale }) {
    const [company, t] = await Promise.all([isCompany(symbol), getTranslations('StockPage')]);
    if (!company) return null;
    return (
        <Panel title={t('financialsTitle')} sub={t('financialsSub')}>
            <TradingViewWidget scriptUrl={`${scriptUrl}financials.js`} config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol, locale)} height={500} />
        </Panel>
    );
}

async function ProfilePanel({ symbol, tvSymbol, locale }: { symbol: string; tvSymbol: string; locale: Locale }) {
    const [company, t] = await Promise.all([isCompany(symbol), getTranslations('StockPage')]);
    if (!company) return null;
    return (
        <Panel title={t('profileTitle')} sub={t('profileSub')}>
            <TradingViewWidget scriptUrl={`${scriptUrl}symbol-profile.js`} config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol, locale)} height={440} />
        </Panel>
    );
}

// Charts come straight from TradingView (live, no quota); only the header waits on Finnhub, and it streams.
export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol: rawSymbol } = await params;
    const symbol = decodeURIComponent(rawSymbol).toUpperCase();
    const tvSymbol = formatSymbolForTradingView(symbol);
    const [t, locale] = await Promise.all([getTranslations('StockPage'), getLocale()]);

    return (
        <>
            <Suspense fallback={<StockHeaderSkeleton />}>
                <StockHeader symbol={symbol} />
            </Suspense>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
                <div className="flex min-w-0 flex-col gap-3">
                    {isChartEmbeddable(tvSymbol) ? (
                        <StockChart tvSymbol={tvSymbol} scriptUrl={`${scriptUrl}advanced-chart.js`} />
                    ) : (
                        // TradingView refuses this exchange's chart in embeds; say so instead of showing its error
                        <Panel title={t('chartTitle')} sub={t('chartUnavailableSub')}>
                            <div className="empty-state py-14">
                                <span className="empty-icon"><CandlestickChart className="size-5" /></span>
                                <h3>{t('chartUnavailableTitle')}</h3>
                                <p className="max-w-80 text-[13px]">
                                    {t('chartUnavailableBody', { exchange: tvSymbol.split(':')[0] })}
                                </p>
                                <a href={tradingViewSymbolUrl(tvSymbol)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-2">
                                    {t('openOnTradingView')}
                                </a>
                            </div>
                        </Panel>
                    )}
                    <Suspense fallback={null}>
                        <FinancialsPanel symbol={symbol} tvSymbol={tvSymbol} locale={locale} />
                    </Suspense>
                </div>

                <div className="flex min-w-0 flex-col gap-3">
                    <Panel title={t('aiTitle')} sub={t('aiSub')}>
                        <AgentChat symbol={symbol} compact />
                    </Panel>
                    <Suspense fallback={null}>
                        <TechnicalsPanel symbol={symbol} />
                    </Suspense>
                    <Suspense fallback={null}>
                        <DividendYield symbol={symbol} />
                    </Suspense>
                    <Suspense fallback={null}>
                        <Sentiment symbol={symbol} />
                    </Suspense>
                    <Suspense fallback={null}>
                        <ProfilePanel symbol={symbol} tvSymbol={tvSymbol} locale={locale} />
                    </Suspense>
                </div>
            </div>
        </>
    );
}
