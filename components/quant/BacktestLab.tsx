'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FlaskConical, Loader2, Sparkles } from 'lucide-react';
import LineChart from '@/components/quant/LineChart';
import { runBacktest } from '@/lib/actions/backtest.actions';
import { OPTION_PARAMS, STOCK_PARAMS } from '@/lib/quant/backtest-presets';
import type { BacktestReport, Metrics } from '@/lib/quant/backtest';
import { cn } from '@/lib/utils';

type StratKey = 'sma_cross' | 'rsi_reversion' | 'macd_trend' | 'breakout' | 'bollinger_reversion' | 'buy_hold' | 'covered_call' | 'cash_secured_put' | 'long_call' | 'long_put' | 'iron_condor';
type ParamKey = 'fast' | 'slow' | 'period' | 'buyBelow' | 'sellAbove' | 'lookback' | 'exitLookback' | 'otmPct' | 'days' | 'wingPct' | 'widthPct';
const pct = (n: number | null) => (n == null ? '—' : `${n >= 0 ? '' : '−'}${Math.abs(n).toFixed(1)}%`);

export default function BacktestLab({ initialSymbol }: { initialSymbol: string }) {
    const t = useTranslations('Backtest');
    const [symbol, setSymbol] = useState(initialSymbol);
    const [kind, setKind] = useState<'stock' | 'options'>('stock');
    const [strategy, setStrategy] = useState('sma_cross');
    const [params, setParams] = useState<Record<string, number>>(STOCK_PARAMS.sma_cross);
    const [start, setStart] = useState('2018-06-01');
    const [capital, setCapital] = useState(10000);
    const [report, setReport] = useState<BacktestReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, start_] = useTransition();

    const table = kind === 'stock' ? STOCK_PARAMS : OPTION_PARAMS;

    function pick(k: 'stock' | 'options', s: string) {
        setKind(k); setStrategy(s); setParams((k === 'stock' ? STOCK_PARAMS : OPTION_PARAMS)[s]); setReport(null);
    }

    function run() {
        setError(null);
        start_(async () => {
            const r = await runBacktest({ symbol, kind, strategy, params, start, capital });
            if (r.ok) setReport(r.report); else { setError(r.error); setReport(null); }
        });
    }

    const askQ = report ? t('askPrompt', {
        symbol: symbol.toUpperCase(), strategy: t(`strategies.${report.strategy as StratKey}`), params: JSON.stringify(report.params),
        start: report.start, end: report.end, ret: pct(report.metrics.totalReturnPct), bh: pct(report.benchmark.totalReturnPct),
        dd: pct(report.metrics.maxDrawdownPct), sharpe: report.metrics.sharpe?.toFixed(2) ?? '—',
    }) : '';

    return (
        <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="card flex flex-col gap-3 self-start p-4">
                <Field label={t('symbol')}>
                    <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} maxLength={10} className="mono input-like" />
                </Field>
                <div className="flex gap-1.5">
                    <button type="button" className={cn('btn btn-ghost h-8 flex-1', kind === 'stock' && 'is-on')} onClick={() => pick('stock', 'sma_cross')}>{t('stocks')}</button>
                    <button type="button" className={cn('btn btn-ghost h-8 flex-1', kind === 'options' && 'is-on')} onClick={() => pick('options', 'covered_call')}>{t('options')}</button>
                </div>
                <Field label={t('strategy')}>
                    <select value={strategy} onChange={(e) => pick(kind, e.target.value)} className="input-like">
                        {Object.keys(table).map((s) => <option key={s} value={s}>{t(`strategies.${s as StratKey}`)}</option>)}
                    </select>
                </Field>
                {Object.keys(params).length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(params).map(([k, v]) => (
                            <Field key={k} label={t(`params.${k as ParamKey}`)}>
                                <input type="number" value={v} min={0} step={k.endsWith('Pct') ? 0.5 : 1} className="num input-like"
                                    onChange={(e) => setParams((p) => ({ ...p, [k]: Number(e.target.value) }))} />
                            </Field>
                        ))}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <Field label={t('from')}><input type="date" value={start} min="2018-05-01" onChange={(e) => setStart(e.target.value)} className="input-like" /></Field>
                    <Field label={t('capital')}><input type="number" value={capital} min={1000} step={1000} onChange={(e) => setCapital(Number(e.target.value))} className="num input-like" /></Field>
                </div>
                <button type="button" className="btn btn-primary" onClick={run} disabled={pending || !symbol}>
                    {pending ? <Loader2 className="animate-spin" /> : <FlaskConical />} {t('run')}
                </button>
                {kind === 'options' && <p className="text-[11.5px] text-faint">{t('modelledNote')}</p>}
                {error && <p className="text-[13px] text-down">{error}</p>}
            </div>

            <div className="flex min-w-0 flex-col gap-3">
                {!report ? (
                    <div className="card empty-state py-14">
                        <span className="empty-icon"><FlaskConical className="size-5" /></span>
                        <h3>{t('emptyTitle')}</h3>
                        <p className="max-w-96 text-[13px]">{t('emptyBody')}</p>
                    </div>
                ) : (
                    <>
                        <div className="card flex flex-col gap-3 p-4">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="mono text-lg font-semibold">{symbol.toUpperCase()}</span>
                                <span className="text-[14px]">{t(`strategies.${report.strategy as StratKey}`)}</span>
                                <span className="text-[12.5px] text-muted-foreground">{report.start} → {report.end}</span>
                                <Link href={`/agent?symbol=${symbol.toUpperCase()}&q=${encodeURIComponent(askQ)}`} className="btn btn-ghost ms-auto h-8"><Sparkles /> {t('ask')}</Link>
                            </div>
                            <MetricsTable t={t} m={report.metrics} b={report.benchmark} />
                            <LineChart
                                x={report.equity.map((e) => Date.parse(e.date))}
                                series={[
                                    { name: t('strategyLine'), values: report.equity.map((e) => e.value), color: 'var(--brand)' },
                                    { name: t('buyHold'), values: report.equity.map((e) => e.benchmark), color: 'var(--muted-foreground)', dashed: true },
                                ]}
                                formatX={(v) => new Date(v).toISOString().slice(0, 7)}
                                formatY={(v) => `$${Math.round(v).toLocaleString('en-US')}`}
                            />
                            <ul className="text-[11.5px] text-faint">{report.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                        </div>
                        {report.trades.length > 0 && (
                            <div className="card overflow-x-auto p-2">
                                <h3 className="mb-2 text-[13px] font-semibold">{t('trades', { n: report.trades.length })}</h3>
                                <table className="w-full text-[12.5px] tabular-nums">
                                    <thead className="text-muted-foreground"><tr>
                                        <th className="py-1 text-start font-medium">{t('entry')}</th><th className="py-1 text-start font-medium">{t('exit')}</th>
                                        <th className="py-1 text-end font-medium">{t('days')}</th><th className="py-1 text-end font-medium">{t('return')}</th>
                                    </tr></thead>
                                    <tbody>
                                        {report.trades.slice(-60).reverse().map((tr, i) => (
                                            <tr key={i} className="border-t border-line">
                                                <td className="py-1">{tr.entryDate}</td><td className="py-1">{tr.exitDate}</td>
                                                <td className="py-1 text-end">{tr.days}</td>
                                                <td className={cn('py-1 text-end', tr.returnPct >= 0 ? 'text-up' : 'text-down')}>{pct(tr.returnPct)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">{label}{children}</label>;
}

function MetricsTable({ t, m, b }: { t: ReturnType<typeof useTranslations>; m: Metrics; b: Metrics }) {
    const rows: [string, string, string][] = [
        [t('m.total'), pct(m.totalReturnPct), pct(b.totalReturnPct)],
        [t('m.cagr'), pct(m.cagrPct), pct(b.cagrPct)],
        [t('m.maxDd'), pct(m.maxDrawdownPct), pct(b.maxDrawdownPct)],
        [t('m.sharpe'), m.sharpe?.toFixed(2) ?? '—', b.sharpe?.toFixed(2) ?? '—'],
        [t('m.vol'), pct(m.volatilityPct), pct(b.volatilityPct)],
        [t('m.trades'), String(m.trades), '—'],
        [t('m.winRate'), pct(m.winRatePct), '—'],
        [t('m.exposure'), pct(m.exposurePct), '100%'],
    ];
    return (
        <table className="w-full text-[13px] tabular-nums">
            <thead className="text-muted-foreground"><tr>
                <th className="py-1 text-start font-medium" /><th className="py-1 text-end font-medium">{t('strategyLine')}</th><th className="py-1 text-end font-medium">{t('buyHold')}</th>
            </tr></thead>
            <tbody>
                {rows.map(([k, a, c]) => (
                    <tr key={k} className="border-t border-line"><td className="py-1 text-muted-foreground">{k}</td><td className="py-1 text-end font-semibold">{a}</td><td className="py-1 text-end">{c}</td></tr>
                ))}
            </tbody>
        </table>
    );
}
