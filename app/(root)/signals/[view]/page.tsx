import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Loader2, Lock } from 'lucide-react';
import Panel from '@/components/Panel';
import SymbolForm from '@/components/quant/SymbolForm';
import SignalTable from '@/components/signals/SignalTable';
import { getAccount } from '@/lib/agent/meter';
import { getSession } from '@/lib/better-auth/auth';
import { signalsConfigured } from '@/lib/signals/optionwhales';
import { formatCell } from '@/lib/signals/format';
import { isRateLimited } from '@/lib/rate-limit';
import { cleanSymbol, viewById, type ColType, type Row, type ViewDef } from '@/lib/signals/views';

export const maxDuration = 120;

// One-click tickers on the per-ticker screens (USO / XLE / XOP = oil, GLD = gold, TLT = bonds).
const QUICK: Partial<Record<string, string[]>> = {
    gex: ['SPY', 'QQQ', 'IWM', 'USO', 'XLE', 'GLD', 'TLT', 'NVDA', 'TSLA', 'AAPL'],
    volatility: ['SPY', 'QQQ', 'IWM', 'USO', 'XLE', 'XOP', 'GLD', 'TLT', 'NVDA', 'TSLA'],
    'short-interest': ['GME', 'AMC', 'TSLA', 'PLTR', 'NVDA', 'AAPL', 'USO'],
    insiders: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'AMZN', 'GOOGL', 'XOM', 'CVX'],
};

export async function generateMetadata({ params }: { params: Promise<{ view: string }> }) {
    const [{ view }, t] = await Promise.all([params, getTranslations('Signals')]);
    const def = viewById(view);
    return { title: def ? t(`views.${def.id}.title`) : t('title') };
}

async function Data({ def, symbol }: { def: ViewDef; symbol: string }) {
    const t = await getTranslations('Signals');
    let data;
    try { data = await def.load(symbol); } catch { return <Panel><p className="text-[13px]">{t('unavailable')}</p></Panel>; }
    return (
        <div className="flex flex-col gap-3">
            {data.tiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {data.tiles.map((tile) => (
                        <div key={tile.key} className={tile.type === 'text' ? 'card col-span-2 flex min-w-0 flex-col gap-1 p-4' : 'card flex min-w-0 flex-col gap-1 p-4'}>
                            <span className="text-[12px] text-muted-foreground">{(t as unknown as (k: string) => string)(`col.${tile.key}`)}</span>
                            {tile.type === 'text'
                                ? <span className="text-[15px] font-bold leading-snug">{formatCell(tile.value, tile.type)}</span>
                                : <span className="num truncate text-[18px] font-bold" title={String(tile.value ?? '')}>{formatCell(tile.value, tile.type)}</span>}
                        </div>
                    ))}
                </div>
            )}
            {def.chart && <Bars rows={data.rows} x={def.chart.x} y={def.chart.y} type={def.cols.find((c) => c.key === def.chart!.y)?.type ?? 'num'} />}
            <SignalTable cols={def.cols} rows={data.rows} defaultSort={def.sort} chartHref />
            {data.asOf && <p className="text-[12px] text-faint">{t('asOf', { date: data.asOf.slice(0, 16).replace('T', ' ') })}</p>}
        </div>
    );
}

// Plain CSS bars (one per row), e.g. the volatility term structure.
function Bars({ rows, x, y, type }: { rows: Row[]; x: string; y: string; type: ColType }) {
    const pts = rows.filter((r) => typeof r[y] === 'number').slice(0, 24);
    const max = Math.max(...pts.map((r) => r[y] as number), 0);
    if (pts.length < 2 || max <= 0) return null;
    return (
        <div className="card flex h-52 items-end gap-1.5 overflow-x-auto p-4" role="img" aria-label={`${y} by ${x}`}>
            {pts.map((r, i) => (
                <div key={i} className="flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-1">
                    <span className="num text-[11px] text-muted-foreground">{formatCell(r[y], type)}</span>
                    <span className="w-full rounded-t-md bg-brand/70" style={{ height: `${Math.max(((r[y] as number) / max) * 100, 2)}%` }} />
                    <span className="num whitespace-nowrap text-[10.5px] text-faint">{String(r[x] ?? '').slice(5)}</span>
                </div>
            ))}
        </div>
    );
}

export default async function SignalPage({ params, searchParams }: { params: Promise<{ view: string }>; searchParams: Promise<{ symbol?: string }> }) {
    const [{ view }, { symbol: raw }, t, session] = await Promise.all([params, searchParams, getTranslations('Signals'), getSession()]);
    const def = viewById(view);
    if (!def) notFound();
    const account = session?.user ? await getAccount(session.user.id, session.user.email) : null;
    const paid = Boolean(account && account.plan !== 'free');
    const symbol = cleanSymbol(raw, def.symbol ?? 'SPY');
    // Per-ticker screens cost upstream calls per new ticker; cap lookups so one user cannot spend the daily budget.
    const limited = paid && Boolean(def.symbol) && symbol !== def.symbol && session?.user
        ? await isRateLimited(`signals:${session.user.id}`, 60, 3600) : false;

    return (
        <div className="flex flex-col gap-3">
            <div className="section-head">
                <div>
                    <h1 className="section-title flex items-center gap-2 text-xl">
                        {t(`views.${def.id}.title`)}{def.symbol ? ` · ${symbol}` : ''}
                        <span className="pill is-brand">PRO</span>
                    </h1>
                    <p className="section-sub">{t(`views.${def.id}.sub`)}</p>
                </div>
                {def.symbol && paid && <SymbolForm action={`/signals/${def.id}`} defaultValue={symbol} />}
            </div>
            {def.symbol && paid && QUICK[def.id] && (
                <div className="flex flex-wrap items-center gap-1.5" aria-label={t('quick')}>
                    {QUICK[def.id]!.map((q) => (
                        <Link key={q} href={`/signals/${def.id}?symbol=${q}`} className={q === symbol ? 'pill is-brand mono' : 'pill mono hover:text-foreground'}>{q}</Link>
                    ))}
                </div>
            )}

            {!paid ? (
                <Panel>
                    <div className="flex flex-col items-start gap-3 py-4">
                        <Lock className="size-5 text-brand-ink" />
                        <p className="text-[14px] font-semibold">{t('lockedTitle')}</p>
                        <p className="max-w-xl text-[13px] text-muted-foreground">{t('lockedBody')}</p>
                        <Link href="/billing" className="btn btn-primary">{t('upgrade')}</Link>
                    </div>
                </Panel>
            ) : limited ? (
                <Panel><p className="text-[13px]">{t('tooMany')}</p></Panel>
            ) : !signalsConfigured() ? (
                <Panel><p className="text-[13px]">{t('unavailable')}</p></Panel>
            ) : (
                <Suspense key={`${def.id}:${symbol}`} fallback={<div className="card flex items-center gap-2 py-10 text-[13px] text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('loading')}</div>}>
                    <Data def={def} symbol={symbol} />
                </Suspense>
            )}

            <p className="text-[12px] leading-relaxed text-faint">{t('source')} {t('disclaimer')}</p>
        </div>
    );
}
