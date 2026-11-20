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
import { cleanSymbol, viewById, type ViewDef } from '@/lib/signals/views';

export const maxDuration = 60;

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
                        <div key={tile.key} className="card flex min-w-0 flex-col gap-1 p-4">
                            <span className="text-[12px] text-muted-foreground">{(t as unknown as (k: string) => string)(`col.${tile.key}`)}</span>
                            <span className="num truncate text-[18px] font-bold" title={String(tile.value ?? '')}>{formatCell(tile.value, tile.type)}</span>
                        </div>
                    ))}
                </div>
            )}
            <SignalTable cols={def.cols} rows={data.rows} defaultSort={def.sort} chartHref />
            {data.asOf && <p className="text-[12px] text-faint">{t('asOf', { date: data.asOf.slice(0, 16).replace('T', ' ') })}</p>}
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
