import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import BillingButton from '@/components/billing/BillingButton';
import { getSession } from '@/lib/better-auth/auth';
import { ALLOWANCE, BACKTESTS, getAccount, usage, type Plan } from '@/lib/agent/meter';
import { billingConfigured } from '@/lib/billing/stripe';
import { cn } from '@/lib/utils';

export async function generateMetadata() {
    const t = await getTranslations('Billing');
    return { title: t('pageTitle') };
}

const PLANS = [
    { key: 'free', price: 0 },
    { key: 'pro', price: 99 },
    { key: 'elite', price: 199 },
] as const;
const PACKS = [
    { item: 'credits_10k', credits: 10_000, price: 10 },
    { item: 'credits_25k', credits: 25_000, price: 25 },
    { item: 'credits_50k', credits: 50_000, price: 50 },
] as const;

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

export default async function BillingPage() {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    const [t, account, used] = await Promise.all([
        getTranslations('Billing'),
        getAccount(session.user.id, session.user.email),
        usage(session.user.id),
    ]);
    const live = billingConfigured();
    const monthly = ALLOWANCE[account.plan];
    const btLimit = BACKTESTS[account.plan];
    const paid = account.plan === 'pro' || account.plan === 'elite';
    const rank: Record<Plan, number> = { free: 0, pro: 1, elite: 2, unlimited: 3 };

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            <div className="section-head">
                <div>
                    <h1 className="section-title text-xl">{t('pageTitle')}</h1>
                    <p className="section-sub">{t('pageSub')}</p>
                </div>
                {account.customer && live && <BillingButton portal>{t('manage')}</BillingButton>}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="card flex flex-col gap-1 p-5">
                    <span className="text-[12px] text-muted-foreground">{t('current')}</span>
                    <span className="text-[20px] font-bold tracking-[-0.02em]">{t(`plans.${account.plan}.name`)}</span>
                    {account.periodEnd && paid ? (
                        <span className="text-[12px] text-faint">
                            {account.cancelAtPeriodEnd ? t('endsOn', { date: account.periodEnd.slice(0, 10) }) : t('renewsOn', { date: account.periodEnd.slice(0, 10) })}
                        </span>
                    ) : null}
                    {account.status === 'past_due' && <span className="text-[12px] text-down">{t('pastDue')}</span>}
                </div>
                <Meter label={t('aiCredits')} used={used.credits} limit={monthly} unlimited={t('unlimited')}
                    note={account.bonus > 0 ? t('bonus', { credits: k(account.bonus) }) : undefined} />
                <Meter label={t('backtests')} used={used.backtests} limit={btLimit} unlimited={t('unlimited')} raw />
            </div>

            {!live && <p className="card p-4 text-[13px] text-muted-foreground">{t('notLive')}</p>}

            <div className="grid gap-3 md:grid-cols-3">
                {PLANS.map((p) => {
                    const isCurrent = account.plan === p.key;
                    return (
                        <div key={p.key} className={cn('card flex flex-col gap-4 p-5', p.key === 'pro' && 'ring-1 ring-brand')}>
                            <div className="flex flex-col gap-1">
                                <p className="text-[13px] font-semibold text-muted-foreground">{t(`plans.${p.key}.name`)}</p>
                                <p className="num text-[30px] font-bold leading-none tracking-[-0.03em]">${p.price}<span className="ms-1 text-[13px] font-normal text-muted-foreground">{t('perMonth')}</span></p>
                            </div>
                            <ul className="flex flex-1 flex-col gap-2 border-t border-line pt-4 text-[13px]">
                                {Object.values(t.raw(`plans.${p.key}.features` as 'plans.free.features.f1') as Record<string, string>).map((f) => (
                                    <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-up" />{f}</li>
                                ))}
                            </ul>
                            {isCurrent ? (
                                <span className="btn btn-ghost h-10 w-full cursor-default justify-center opacity-70">{t('yourPlan')}</span>
                            ) : p.key === 'free' ? (
                                paid && live ? <BillingButton portal block>{t('downgrade')}</BillingButton> : null
                            ) : account.plan === 'unlimited' ? null : live ? (
                                <BillingButton item={p.key} portal={paid} block primary={rank[p.key] > rank[account.plan]}>
                                    {rank[p.key] > rank[account.plan] ? t('upgradeTo', { plan: t(`plans.${p.key}.name`) }) : t('switchTo', { plan: t(`plans.${p.key}.name`) })}
                                </BillingButton>
                            ) : null}
                        </div>
                    );
                })}
            </div>

            <div className="card flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1">
                    <p className="font-semibold">{t('packsTitle')}</p>
                    <p className="text-[13px] text-muted-foreground">{t('packsSub')}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                    {PACKS.map((p) => (
                        <div key={p.item} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                            <div>
                                <p className="num font-semibold">{t('packCredits', { credits: k(p.credits) })}</p>
                                <p className="num text-[13px] text-muted-foreground">${p.price}</p>
                            </div>
                            {live && account.plan !== 'unlimited' && <BillingButton item={p.item}>{t('buy')}</BillingButton>}
                        </div>
                    ))}
                </div>
            </div>
            <p className="text-[12px] text-faint">{t('fineprint')}</p>
        </div>
    );
}

function Meter({ label, used, limit, unlimited, note, raw }: { label: string; used: number; limit: number; unlimited: string; note?: string; raw?: boolean }) {
    const finite = Number.isFinite(limit);
    const pct = finite && limit > 0 ? Math.min(used / limit, 1) * 100 : 0;
    const f = (n: number) => (raw ? String(n) : k(n));
    return (
        <div className="card flex flex-col gap-2 p-5">
            <span className="text-[12px] text-muted-foreground">{label}</span>
            <span className="num text-[20px] font-bold tracking-[-0.02em]">
                {finite ? <>{f(used)} <span className="text-[14px] font-medium text-faint">/ {f(limit)}</span></> : unlimited}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-hover">
                <span className={cn('block h-full rounded-full', pct >= 90 ? 'bg-down' : 'bg-brand')} style={{ width: `${finite ? Math.max(pct, 2) : 100}%` }} />
            </span>
            {note && <span className="text-[12px] text-faint">{note}</span>}
        </div>
    );
}
