import { getTranslations } from 'next-intl/server';
import BacktestLab from '@/components/quant/BacktestLab';

export const maxDuration = 120;

export async function generateMetadata() {
    const t = await getTranslations('Backtest');
    return { title: t('pageTitle') };
}

export default async function BacktestPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
    const [{ symbol }, t] = await Promise.all([searchParams, getTranslations('Backtest')]);
    return (
        <div className="flex flex-col gap-3">
            <div className="section-head">
                <div>
                    <h1 className="section-title text-xl">{t('pageTitle')}</h1>
                    <p className="section-sub">{t('pageSub')}</p>
                </div>
            </div>
            <BacktestLab initialSymbol={(symbol ?? 'SPY').toUpperCase().slice(0, 10)} />
        </div>
    );
}
