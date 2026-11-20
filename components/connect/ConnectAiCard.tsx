import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

// Dashboard card pointing to /connect: use HIVRA Finance from Claude or ChatGPT, by text or voice.
export default async function ConnectAiCard() {
    const t = await getTranslations('Connect');
    return (
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Sparkles className="size-5" /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-[15px] font-semibold">{t('cardTitle')}</p>
                <p className="text-[13px] text-muted-foreground">{t('cardBody')}</p>
            </div>
            <Link href="/connect" className="btn btn-primary">{t('cardCta')}</Link>
        </div>
    );
}
