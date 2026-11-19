import { transporter } from "@/lib/nodemailer";
import { emailConfigured, fromHeader } from "@/lib/nodemailer/config";
import { escapeHtml } from "@/lib/utils";
import { getEmailTranslator } from "@/lib/nodemailer/i18n";

// Same rule as the reset email: Better Auth's URL is already encoded, only escape what is unsafe.
const encodeUnsafeUrlChars = (url: string) =>
    url.replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);

// The passwordless sign-in email: one button, valid 15 minutes, works once.
export const sendMagicLinkEmail = async ({ email, url, locale }: { email: string; url: string; locale?: string }) => {
    if (!transporter || !emailConfigured()) throw new Error('Email credentials not configured');
    const { lang, t } = await getEmailTranslator(locale);
    const href = escapeHtml(encodeUnsafeUrlChars(url));
    const html = `
        <div lang="${lang}" style="background:#0b0d12;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#f4f4f5;">
            <div style="max-width:480px;margin:0 auto;border:1px solid #23262f;border-radius:16px;padding:32px;background:#12141a;">
                <p style="margin:0 0 24px;font-size:15px;font-weight:700;letter-spacing:-0.02em;">HIVRA <span style="color:#7aa2ff;">Finance</span></p>
                <h1 style="margin:0 0 12px;font-size:22px;letter-spacing:-0.02em;">${escapeHtml(t('magicLink.heading'))}</h1>
                <p style="margin:0 0 24px;color:#a1a1aa;line-height:1.6;font-size:14px;">${escapeHtml(t('magicLink.body'))}</p>
                <a href="${href}" style="display:inline-block;background:#4f7cf7;color:#ffffff;padding:12px 22px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;">
                    ${escapeHtml(t('magicLink.cta'))}
                </a>
                <p style="margin:24px 0 0;color:#71717a;line-height:1.6;font-size:12px;">${escapeHtml(t('magicLink.ignore'))}</p>
            </div>
        </div>`;
    return transporter.sendMail({
        from: fromHeader(),
        to: email,
        subject: t('magicLink.subject'),
        text: t('magicLink.text', { url }),
        html,
    });
};
