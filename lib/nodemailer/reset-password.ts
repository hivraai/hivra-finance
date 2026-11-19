import { transporter } from "@/lib/nodemailer";
import { emailConfigured, fromHeader } from "@/lib/nodemailer/config";
import { escapeHtml } from "@/lib/utils";
import { getEmailTranslator } from "@/lib/nodemailer/i18n";
import { emailLayout } from "@/lib/nodemailer/layout";


// Better Auth hands us an already-encoded URL (callbackURL=http%3A%2F%2F...).
// encodeURI would turn those % into %25 and the link fails with INVALID_CALLBACKURL,
// so only encode characters that are unsafe and leave existing escapes alone.
const encodeUnsafeUrlChars = (url: string) =>
    url.replace(/[^A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, encodeURIComponent);

export const sendPasswordResetEmail = async (
    { email, name, resetUrl, locale }: { email: string; name?: string | null; resetUrl: string; locale?: string }
) => {
    try {
        if (!transporter || !emailConfigured()) {
            throw new Error('Email credentials not configured');
        }

        const { lang, t } = await getEmailTranslator(locale);
        const firstName = name?.trim().split(' ')[0];
        const greeting = escapeHtml(firstName ? t('resetPassword.greeting', { name: firstName }) : t('resetPassword.greetingNoName'));
        const html = emailLayout({
            lang,
            preheader: t('resetPassword.body'),
            heading: t('resetPassword.heading'),
            body: `${greeting}<br><br>${escapeHtml(t('resetPassword.body'))}`,
            cta: t('resetPassword.cta'),
            href: encodeUnsafeUrlChars(resetUrl),
            note: t('resetPassword.ignore'),
            footer: '© HIVRA Finance · finance.hivra.ai',
        });

        const info = await transporter.sendMail({
            from: fromHeader(),
            to: email,
            subject: t('resetPassword.subject'),
            text: t('resetPassword.text', { url: encodeUnsafeUrlChars(resetUrl) }),
            html,
        });

        console.log('Password reset email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
    }
};
