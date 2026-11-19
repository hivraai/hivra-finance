import { transporter } from "@/lib/nodemailer";
import { emailConfigured, fromHeader } from "@/lib/nodemailer/config";
import { escapeHtml } from "@/lib/utils";
import { getEmailTranslator } from "@/lib/nodemailer/i18n";
import { emailLayout } from "@/lib/nodemailer/layout";

// Same rule as the reset email: Better Auth's URL is already encoded, only escape what is unsafe.
const encodeUnsafeUrlChars = (url: string) =>
    url.replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);

// The passwordless sign-in email: one button, valid 15 minutes, works once.
export const sendMagicLinkEmail = async ({ email, url, locale }: { email: string; url: string; locale?: string }) => {
    if (!transporter || !emailConfigured()) throw new Error('Email credentials not configured');
    const { lang, t } = await getEmailTranslator(locale);
    const html = emailLayout({
        lang,
        preheader: t('magicLink.body'),
        heading: t('magicLink.heading'),
        body: escapeHtml(t('magicLink.body')),
        cta: t('magicLink.cta'),
        href: encodeUnsafeUrlChars(url),
        note: t('magicLink.ignore'),
        footer: '© HIVRA Finance · finance.hivra.ai',
    });
    return transporter.sendMail({
        from: fromHeader(),
        to: email,
        subject: t('magicLink.subject'),
        text: t('magicLink.text', { url }),
        html,
    });
};
