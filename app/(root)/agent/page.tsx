import { getTranslations } from 'next-intl/server';
import AgentChat from '@/components/agent/AgentChat';
import { getSession } from '@/lib/better-auth/auth';

export async function generateMetadata() {
    const t = await getTranslations('Agent');
    return { title: t('pageTitle') };
}

export default async function AgentPage({ searchParams }: { searchParams: Promise<{ thread?: string; symbol?: string; q?: string }> }) {
    const [{ thread, symbol, q }, session] = await Promise.all([searchParams, getSession()]);
    const sym = symbol && /^[A-Z][A-Z0-9.]{0,9}$/.test(symbol.toUpperCase()) ? symbol.toUpperCase() : undefined;
    const firstName = session?.user?.name?.trim().split(/\s+/)[0] || undefined;
    return <AgentChat initialThreadId={thread} symbol={sym} initialQuestion={q?.slice(0, 2000)} firstName={firstName} />;
}
