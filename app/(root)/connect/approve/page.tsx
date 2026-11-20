import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import Panel from '@/components/Panel';
import { getSession } from '@/lib/better-auth/auth';
import { parseAuthorize } from '@/lib/mcp/authorize';
import { decideConnection } from '@/lib/mcp/actions';

// Consent screen: Claude / ChatGPT asks to use the member's HIVRA Finance account.
export default async function ApprovePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    const raw = await searchParams;
    const q = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    const [t, parsed] = await Promise.all([getTranslations('Connect'), parseAuthorize(q)]);
    if ('error' in parsed) return <Panel><p className="text-[13px]">{t('badRequest')}</p></Panel>;

    return (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 pt-6">
            <div className="card flex flex-col gap-4 p-6">
                <ShieldCheck className="size-7 text-brand-ink" />
                <h1 className="text-[20px] font-bold tracking-[-0.02em]">{t('approveTitle', { app: parsed.clientName })}</h1>
                <p className="text-[14px] text-muted-foreground">{t('approveBody', { email: session.user.email })}</p>
                <ul className="flex flex-col gap-1.5 text-[13.5px] text-muted-foreground">
                    <li>• {t('approveCan')}</li>
                    <li>• {t('approveCannot')}</li>
                </ul>
                <form action={decideConnection} className="flex flex-wrap gap-2">
                    <input type="hidden" name="query" value={q.toString()} />
                    <button type="submit" name="decision" value="approve" className="btn btn-primary">{t('approve')}</button>
                    <button type="submit" name="decision" value="deny" className="btn btn-ghost">{t('deny')}</button>
                </form>
                <p className="text-[12px] text-faint">{t('approveHint')}</p>
            </div>
        </div>
    );
}
