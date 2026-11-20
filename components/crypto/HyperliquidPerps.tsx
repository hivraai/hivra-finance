import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ChangePill from '@/components/ChangePill';
import Panel from '@/components/Panel';
import { findPerp, getPerps, tradeUrl, type Perp } from '@/lib/hyperliquid';

const usd = (v: number) => {
    const a = Math.abs(v);
    if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
};
const price = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 2 : v >= 1 ? 4 : 6 });
const apr = (p: Perp) => `${p.fundingAprPct > 0 ? '+' : ''}${p.fundingAprPct.toFixed(1)}%`;
const coinLabel = (coin: string) => coin.replace(/^k(?=[A-Z])/, '1000');

function TradeLink({ coin, label, className = 'btn btn-ghost' }: { coin: string; label: string; className?: string }) {
    return (
        <a href={tradeUrl(coin)} target="_blank" rel="noopener noreferrer nofollow" className={className}>
            {label} <ExternalLink className="size-3.5" />
        </a>
    );
}

// The Crypto tab: Hyperliquid's most traded perpetuals with funding and open interest.
export async function HyperliquidPerpsTable({ count = 15 }: { count?: number }) {
    const t = await getTranslations('Hyperliquid');
    const perps = await getPerps().catch(() => null);
    if (!perps?.length) return <p className="search-list-indicator">{t('unavailable')}</p>;
    const rows = [...perps].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, count);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
                <thead>
                    <tr className="text-start text-faint">
                        <th className="px-3 py-2 text-start font-medium">{t('coin')}</th>
                        <th className="px-3 py-2 text-end font-medium">{t('mark')}</th>
                        <th className="px-3 py-2 text-end font-medium">{t('change24h')}</th>
                        <th className="px-3 py-2 text-end font-medium">{t('fundingApr')}</th>
                        <th className="px-3 py-2 text-end font-medium max-md:hidden">{t('openInterest')}</th>
                        <th className="px-3 py-2 text-end font-medium max-md:hidden">{t('volume24h')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <tr key={p.coin} className="border-t border-line/60 transition-colors hover:bg-hover/40">
                            <td className="px-3 py-2 font-semibold">{coinLabel(p.coin)} <span className="mono text-[11px] text-faint">{t('maxLev', { x: p.maxLeverage })}</span></td>
                            <td className="num px-3 py-2 text-end font-semibold">{price(p.mark)}</td>
                            <td className="px-3 py-2 text-end"><ChangePill value={p.changePct} /></td>
                            <td className={`num px-3 py-2 text-end ${p.fundingAprPct < 0 ? 'text-down' : 'text-up'}`}>{apr(p)}</td>
                            <td className="num px-3 py-2 text-end max-md:hidden">{usd(p.openInterestUsd)}</td>
                            <td className="num px-3 py-2 text-end max-md:hidden">{usd(p.volume24hUsd)}</td>
                            <td className="px-3 py-2 text-end">
                                <TradeLink coin={p.coin} label={t('trade')} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-ink hover:underline" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="px-3 py-2 text-[11.5px] text-faint">{t('source')} {t('disclaimer')}</p>
        </div>
    );
}

// A coin page (BINANCE:BTCUSDT …): the Hyperliquid perp for the same coin, with a link to trade it there.
export async function HyperliquidPanel({ symbol }: { symbol: string }) {
    const perp = await findPerp(symbol).catch(() => null);
    if (!perp) return null;
    const t = await getTranslations('Hyperliquid');
    const stats: [string, string, string?][] = [
        [t('mark'), price(perp.mark)],
        [t('fundingApr'), apr(perp), perp.fundingAprPct < 0 ? 'text-down' : 'text-up'],
        [t('openInterest'), usd(perp.openInterestUsd)],
        [t('volume24h'), usd(perp.volume24hUsd)],
    ];
    return (
        <Panel title={t('panelTitle', { coin: coinLabel(perp.coin) })} sub={t('panelSub')}>
            <div className="grid grid-cols-2 gap-3 p-1">
                {stats.map(([k, v, cls]) => (
                    <div key={k}>
                        <p className="text-[11.5px] text-faint">{k}</p>
                        <p className={`num text-[15px] font-semibold ${cls ?? ''}`}>{v}</p>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex flex-col gap-2">
                <TradeLink coin={perp.coin} label={t('tradeOn', { coin: coinLabel(perp.coin) })} className="btn btn-primary w-full justify-center" />
                <p className="text-[11.5px] text-faint">{t('source')} {t('disclaimer')}</p>
            </div>
        </Panel>
    );
}
