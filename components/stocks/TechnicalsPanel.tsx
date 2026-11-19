// Our own technicals, from Databento daily bars and lib/quant. Replaces TradingView's widget,
// which refuses many symbols ("Permission denied").
import { getTranslations } from 'next-intl/server';
import Panel from '@/components/Panel';
import { getRecentBars } from '@/lib/databento';
import { summarize, type Bar } from '@/lib/quant/indicators';
import { cn } from '@/lib/utils';

const fmt = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const above = (c: number, v: number | null) => (v == null ? '' : c >= v ? 'text-up' : 'text-down');

export default async function TechnicalsPanel({ symbol }: { symbol: string }) {
    const t = await getTranslations('Technicals');
    const bars: Bar[] = await getRecentBars(symbol).catch(() => []);
    const s = summarize(bars);
    if (!s) {
        return (
            <Panel title={t('title')}>
                <p className="text-[13px] text-muted-foreground">{t('none')}</p>
            </Panel>
        );
    }
    const d = s.close < 10 ? 4 : 2;
    const trendTone = s.trend === 'uptrend' ? 'text-up' : s.trend === 'downtrend' ? 'text-down' : 'text-muted-foreground';
    const rsiTone = s.rsi14 == null ? '' : s.rsi14 >= 70 ? 'text-down' : s.rsi14 <= 30 ? 'text-up' : '';
    const hist = s.macd.hist;
    const rows: [string, string, string?][] = [
        [t('rsi'), fmt(s.rsi14, 1), rsiTone],
        [t('macd'), hist == null ? '—' : `${fmt(hist, 3)} ${hist >= 0 ? '▲' : '▼'}`, hist == null ? '' : hist >= 0 ? 'text-up' : 'text-down'],
        [t('sma20'), fmt(s.sma20, d), above(s.close, s.sma20)],
        [t('sma50'), fmt(s.sma50, d), above(s.close, s.sma50)],
        [t('sma200'), fmt(s.sma200, d), above(s.close, s.sma200)],
        [t('bollinger'), s.bollinger.pctB == null ? '—' : `${fmt(s.bollinger.pctB * 100, 0)}%`],
        [t('atr'), fmt(s.atr14, d)],
        [t('hv'), s.hv20 == null ? '—' : `${fmt(s.hv20 * 100, 1)}%`],
        [t('volume'), s.volumeVsAvg == null ? '—' : `${fmt(s.volumeVsAvg, 1)}×`],
        [t('support'), fmt(s.support, d)],
        [t('resistance'), fmt(s.resistance, d)],
        [t('range52'), `${fmt(s.range52w.low, d)} – ${fmt(s.range52w.high, d)}`],
    ];
    return (
        <Panel title={t('title')} sub={t('sub', { date: s.asOf })}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
                <span className={cn('text-lg font-semibold', trendTone)}>{t(`trend.${s.trend}`)}</span>
                <span className="num text-[13px] text-muted-foreground">{t('fromHigh', { pct: fmt(s.range52w.pctFromHigh, 1) })}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                {rows.map(([k, v, tone]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className={cn('num', tone)}>{v}</dd>
                    </div>
                ))}
            </dl>
            {s.signals.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                    {s.signals.map((x) => <li key={x} className="rounded-full bg-hover px-2 py-0.5 text-[11.5px]">{x}</li>)}
                </ul>
            )}
        </Panel>
    );
}
