import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Panel from '@/components/Panel';
import OptionsDesk from '@/components/quant/OptionsDesk';
import SymbolForm from '@/components/quant/SymbolForm';
import { getChain, getRecentBars, isDatabentoSymbol } from '@/lib/databento';
import { defaultExpiry, enrich, expiries } from '@/lib/quant/chain';
import { getAccount } from '@/lib/agent/meter';
import { getSession } from '@/lib/better-auth/auth';

export const maxDuration = 120;

function nearMoney<T extends { expiry: string; strike: number }>(quotes: T[], spot: number, n: number): T[] {
    const by = new Map<string, T[]>();
    for (const q of quotes) { const l = by.get(q.expiry); if (l) l.push(q); else by.set(q.expiry, [q]); }
    const out: T[] = [];
    for (const qs of by.values()) {
        const strikes = [...new Set(qs.map((q) => q.strike))].sort((a, b) => a - b);
        const i = strikes.findIndex((k) => k >= spot);
        const c = i < 0 ? strikes.length : i;
        const keep = new Set(strikes.slice(Math.max(c - n, 0), c + n));
        for (const q of qs) if (keep.has(q.strike)) out.push(q);
    }
    return out;
}

export async function generateMetadata() {
    const t = await getTranslations('Options');
    return { title: t('pageTitle') };
}

// The chain can take a while the first time a ticker is opened (Databento), so the page shell
// renders at once and the desk streams in behind a loading state.
async function Desk({ symbol }: { symbol: string }) {
    const t = await getTranslations('Options');
    const session = await getSession();
    const [chain, bars, account] = await Promise.all([
        getChain(symbol).catch(() => null), getRecentBars(symbol).catch(() => []),
        session?.user ? getAccount(session.user.id, session.user.email) : null,
    ]);
    if (!chain || !bars.length) return <Panel><p className="text-[13px]">{t('noChain', { symbol })}</p></Panel>;
    // The stock's close on the chain's own day, so IV and delta match the quotes.
    const day = chain.asOf.slice(0, 10);
    const spot = (bars.find((b) => b.date === day) ?? bars.at(-1)!).close;
    // The desk shows 24 strikes around the money and presets step a few further, so each expiry
    // sends 20 strikes on each side of spot. SPY went from ~9,800 rows (2.2 MB) to ~2,500.
    // Only the fields the desk reads go to the browser (no OCC symbol, no sizes).
    const rows = enrich(nearMoney(chain.quotes, spot, 20).map((q) => ({ symbol: '', expiry: q.expiry, right: q.right, strike: q.strike, bid: q.bid, ask: q.ask })), spot, chain.asOf);
    const sums = expiries(rows, spot).filter((e) => e.days >= 0);
    const def = defaultExpiry(sums) ?? sums[0]?.expiry ?? '';
    return <OptionsDesk symbol={symbol} spot={spot} asOf={chain.asOf} rows={rows} expiries={sums} defaultExpiry={def} locked={!account || account.plan === 'free'} />;
}

async function Loading({ symbol }: { symbol: string }) {
    const t = await getTranslations('Options');
    return (
        <div className="card flex items-center gap-2 py-10 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />{t('loading', { symbol })}
        </div>
    );
}

export default async function OptionsPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
    const [{ symbol: raw }, t] = await Promise.all([searchParams, getTranslations('Options')]);
    const symbol = (raw ?? 'AAPL').trim().toUpperCase();
    return (
        <div className="flex flex-col gap-3">
            <div className="section-head">
                <div>
                    <h1 className="section-title text-xl">{t('pageTitle')}</h1>
                    <p className="section-sub">{t('pageSub')}</p>
                </div>
                <SymbolForm action="/options" defaultValue={symbol} />
            </div>
            {isDatabentoSymbol(symbol) ? (
                <Suspense key={symbol} fallback={<Loading symbol={symbol} />}>
                    <Desk symbol={symbol} />
                </Suspense>
            ) : (
                <Panel><p className="text-[13px]">{t('badSymbol')}</p></Panel>
            )}
        </div>
    );
}
