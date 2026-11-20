import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { Mic, Unplug } from 'lucide-react';
import CopyField from '@/components/connect/CopyField';
import { getSession } from '@/lib/better-auth/auth';
import { appOrigin, listGrants } from '@/lib/mcp/oauth';
import { disconnectAssistant } from '@/lib/mcp/actions';

export async function generateMetadata() {
    const t = await getTranslations('Connect');
    return { title: t('title') };
}

const TOOLS = ['technicals', 'chain', 'strategy', 'backtests', 'signals'] as const;

export default async function ConnectPage() {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    const [t, grants] = await Promise.all([getTranslations('Connect'), listGrants(session.user.id).catch(() => [])]);
    const url = `${appOrigin()}/api/mcp`;
    // One row per assistant (a refresh creates a new grant row for the same app).
    const apps = [...new Map(grants.map((g) => [g.clientId, g])).values()];

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <div className="section-head">
                <div>
                    <h1 className="section-title text-xl">{t('title')}</h1>
                    <p className="section-sub">{t('sub')}</p>
                </div>
            </div>

            <div className="card flex flex-col gap-3 p-5">
                <p className="text-[14px] font-semibold">{t('urlTitle')}</p>
                <CopyField value={url} label={t('copy')} copied={t('copied')} />
                <p className="text-[12.5px] text-faint">{t('urlHint')}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {(['claude', 'chatgpt'] as const).map((app) => (
                    <div key={app} className="card flex flex-col gap-3 p-5">
                        <p className="text-[15px] font-semibold">{t(`${app}.title`)}</p>
                        <ol className="flex list-decimal flex-col gap-1.5 ps-5 text-[13.5px] text-muted-foreground">
                            <li>{t(`${app}.step1`)}</li>
                            <li>{t(`${app}.step2`)}</li>
                            <li>{t(`${app}.step3`)}</li>
                        </ol>
                    </div>
                ))}
            </div>

            <div className="card flex items-start gap-3 p-5">
                <Mic className="mt-0.5 size-5 shrink-0 text-brand-ink" />
                <div className="flex flex-col gap-1">
                    <p className="text-[14px] font-semibold">{t('voiceTitle')}</p>
                    <p className="text-[13.5px] text-muted-foreground">{t('voiceBody')}</p>
                </div>
            </div>

            <div className="card flex flex-col gap-3 p-5">
                <p className="text-[14px] font-semibold">{t('toolsTitle')}</p>
                <ul className="flex flex-col gap-1.5 text-[13.5px] text-muted-foreground">
                    {TOOLS.map((k) => <li key={k}>• {t(`tools.${k}`)}</li>)}
                </ul>
                <p className="text-[12.5px] text-faint">{t('safety')}</p>
            </div>

            <div className="card flex flex-col gap-3 p-5">
                <p className="text-[14px] font-semibold">{t('connectedTitle')}</p>
                {apps.length === 0 ? (
                    <p className="text-[13.5px] text-muted-foreground">{t('none')}</p>
                ) : (
                    <ul className="row-list">
                        {apps.map((g) => (
                            <li key={g.clientId} className="flex items-center gap-3 py-3">
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate text-[14px] font-semibold">{g.clientName}</span>
                                    <span className="text-[12px] text-faint">
                                        {t('connectedOn', { date: g.createdAt.toISOString().slice(0, 10) })}
                                        {g.lastUsedAt ? ` · ${t('lastUsed', { date: g.lastUsedAt.toISOString().slice(0, 10) })}` : ''}
                                    </span>
                                </div>
                                <form action={disconnectAssistant}>
                                    <input type="hidden" name="clientId" value={g.clientId} />
                                    <button type="submit" className="btn btn-ghost h-9 text-[13px]"><Unplug />{t('disconnect')}</button>
                                </form>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
