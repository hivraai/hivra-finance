import { getTranslations } from 'next-intl/server';
import AgentChat from '@/components/agent/AgentChat';

export async function generateMetadata() {
    const t = await getTranslations('Agent');
    return { title: t('pageTitle') };
}

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ thread?: string; symbol?: string; q?: string }> }) {
    const [{ thread, symbol, q }, t] = await Promise.all([searchParams, getTranslations('Agent')]);
    const sym = symbol && /^[A-Z][A-Z0-9.]{0,9}$/.test(symbol.toUpperCase()) ? symbol.toUpperCase() : undefined;
    return (
        <div className="flex flex-col gap-3">
            <div className="section-head">
                <div>
                    <h1 className="section-title text-xl">{t('pageTitle')}</h1>
                    <p className="section-sub">{t('pageSub')}</p>
                </div>
            </div>
            <AgentChat initialThreadId={thread} symbol={sym} initialQuestion={q?.slice(0, 2000)} />
        </div>
    );
}
