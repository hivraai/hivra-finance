import { getTranslations } from 'next-intl/server';
import { communityQrDataUrl, communityUrl } from '@/lib/community';

// Join-the-group card: QR for a desktop visitor, a button for a phone. Server-only, signed-in pages only.
export default async function CommunityCard() {
    const url = communityUrl();
    if (!url) return null;
    const [qr, t] = await Promise.all([communityQrDataUrl(), getTranslations('Community')]);

    return (
        <div className="hatch">
            <div className="card flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
                {qr && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt={t('qrAlt')} width={168} height={168} className="size-[168px] shrink-0 rounded-xl bg-white p-2" />
                )}
                <div className="flex flex-col gap-3 text-center sm:text-start">
                    <p className="kicker text-brand-ink">{t('kicker')}</p>
                    <h2 className="text-[22px] font-bold tracking-[-0.03em]">{t('title')}</h2>
                    <p className="text-[14px] leading-relaxed text-muted-foreground">{t('body')}</p>
                    <div>
                        <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary h-11 px-5 text-[15px]">{t('join')}</a>
                    </div>
                    <p className="text-[12px] text-faint">{t('scanHint')}</p>
                </div>
            </div>
        </div>
    );
}
