import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import CommunityCard from '@/components/CommunityCard';

// Stripe Checkout's success_url. It only thanks the member and shows the group; the plan itself is
// switched on by the Stripe webhook, never by landing here.
export default async function CheckoutSuccessPage() {
    const t = await getTranslations('Community');
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
            <div>
                <h1 className="text-[30px] font-bold tracking-[-0.04em]">{t('paidTitle')}</h1>
                <p className="mt-2 text-muted-foreground">{t('paidSub')}</p>
            </div>
            <CommunityCard />
            <div>
                <Link href="/dashboard" className="btn btn-ghost h-11 px-5 text-[15px]">{t('continue')}</Link>
            </div>
        </div>
    );
}
