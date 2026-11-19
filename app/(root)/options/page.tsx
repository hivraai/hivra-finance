import { getTranslations } from 'next-intl/server';
import Panel from '@/components/Panel';
import OptionsDesk from '@/components/quant/OptionsDesk';
import SymbolForm from '@/components/quant/SymbolForm';
import { getChain, getRecentBars, isDatabentoSymbol } from '@/lib/databento';
import { defaultExpiry, enrich, expiries } from '@/lib/quant/chain';

export const maxDuration = 120;

export async function generateMetadata() {
    const t = await getTranslations('Options');
    return { title: t('pageTitle') };
}

export default async function OptionsPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
    const [{ symbol: raw }, t] = await Promise.all([searchParams, getTranslations('Options')]);
    const symbol = (raw ?? 'SPY').trim().toUpperCase();

    const head = (
        <div className="section-head">
            <div>
                <h1 className="section-title text-xl">{t('pageTitle')}</h1>
                <p className="section-sub">{t('pageSub')}</p>
            </div>
            <SymbolForm action="/options" defaultValue={symbol} />
        </div>
    );

    if (!isDatabentoSymbol(symbol)) {
        return <div className="flex flex-col gap-3">{head}<Panel><p className="text-[13px]">{t('badSymbol')}</p></Panel></div>;
    }

    const [chain, bars] = await Promise.all([getChain(symbol).catch(() => null), getRecentBars(symbol).catch(() => [])]);
    if (!chain || !bars.length) {
        return <div className="flex flex-col gap-3">{head}<Panel><p className="text-[13px]">{t('noChain', { symbol })}</p></Panel></div>;
    }
    const day = chain.asOf.slice(0, 10);
    const spot = (bars.find((b) => b.date === day) ?? bars.at(-1)!).close;
    // Strikes within ±40% of spot keep the page light on index ETFs with thousands of contracts.
    const near = chain.quotes.filter((q) => q.strike >= spot * 0.6 && q.strike <= spot * 1.4);
    const rows = enrich(near, spot, chain.asOf);
    const sums = expiries(rows, spot).filter((e) => e.days >= 0);
    const def = defaultExpiry(sums) ?? sums[0]?.expiry ?? '';

    return (
        <div className="flex flex-col gap-3">
            {head}
            <OptionsDesk symbol={symbol} spot={spot} asOf={chain.asOf} rows={rows} expiries={sums} defaultExpiry={def} />
        </div>
    );
}
