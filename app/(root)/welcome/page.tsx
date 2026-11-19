import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import CommunityCard from '@/components/CommunityCard';

// Where a new account lands right after sign-up: join the members' WhatsApp group, then go on.
export default async function WelcomePage() {
    const t = await getTranslations('Community');
    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6 py-10">
            <div>
                <h1 className="text-[30px] font-bold tracking-[-0.04em]">{t('welcomeTitle')}</h1>
                <p className="mt-2 text-muted-foreground">{t('welcomeSub')}</p>
            </div>
            <CommunityCard />
            <div>
                <Link href="/dashboard" className="btn btn-ghost h-11 px-5 text-[15px]">{t('continue')}</Link>
            </div>
        </div>
    );
}
