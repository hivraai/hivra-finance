import nodemailer from 'nodemailer';
import { emailConfigured, fromHeader, transportOptions } from '@/lib/nodemailer/config';
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
    STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
    STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";
import { formatPrice, sanitizeEmailIntro } from "@/lib/utils";
import { escapeAll, fillTemplate, getEmailTranslator } from "@/lib/nodemailer/i18n";
import { isWorkersRuntime } from "@/database/mongoose";
import { communityQrEmailUrl, communityUrl } from '@/lib/community';

// The members' WhatsApp group in the welcome email: a button for phones, a QR (served signed) for desktops.
// Empty when WHATSAPP_GROUP_URL is not set. Only fixed markup and escaped text go in.
function communityEmailBlock(email: string, cta: string, scan: string): string {
    const url = communityUrl();
    const origin = process.env.BETTER_AUTH_URL;
    if (!url || !origin) return '';
    const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const qr = communityQrEmailUrl(email, origin);
    return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 32px 0; width: 100%;"><tr><td align="center">
<a href="${esc(url)}" style="display: inline-block; background: #25D366; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-size: 16px; font-weight: 600;">${esc(cta)}</a>
<p style="margin: 20px 0 8px 0; font-size: 13px; color: #CCDADC;">${esc(scan)}</p>
<img src="${esc(qr)}" alt="" width="160" height="160" style="display: block; margin: 0 auto; width: 160px; height: 160px; border-radius: 12px; background: #FFFFFF;" />
</td></tr></table>`;
}


type EmailSendResult =
    | { status: 'skipped' }
    | { status: 'sent'; messageId: string };

const hasEmailConfig = emailConfigured();

if (!hasEmailConfig) {
    console.warn('⚠️ Email credentials are not configured. Welcome and news summary emails are disabled until RESEND_API_KEY (or NODEMAILER_EMAIL and NODEMAILER_PASSWORD) is set.');
}

// The transporter is created lazily on first use. Creating the SMTP pool (and
// calling verify) at module scope uses setImmediate/network I/O during global
// scope evaluation, which Cloudflare Workers rejects when the script is
// uploaded. Node/Vercel behaviour is unchanged.
type Transporter = ReturnType<typeof nodemailer.createTransport>;
let transporterInstance: Transporter | null = null;

function getTransporter(): Transporter {
    // A Workers socket belongs to the request that opened it, so a pool cached for the next
    // request would fail there: open one plain SMTP connection per send instead.
    if (isWorkersRuntime()) {
        return nodemailer.createTransport(transportOptions());
    }
    if (!transporterInstance) {
        transporterInstance = nodemailer.createTransport({
            ...transportOptions(),
            // Keep the pool small because email volume is low in this app.
            pool: true,
            maxConnections: 1,
            maxMessages: 3,
        });
        transporterInstance.verify((error) => {
            if (error) {
                console.error('❌ Nodemailer transporter verification failed:', error);
            } else {
                console.log('✅ Nodemailer transporter is ready to send emails');
            }
        });
    }
    return transporterInstance;
}

export const transporter: Transporter | null = hasEmailConfig
    ? (new Proxy({} as Transporter, {
        get(_target, prop) {
            const instance = getTransporter();
            const value = Reflect.get(instance, prop, instance);
            return typeof value === 'function' ? value.bind(instance) : value;
        },
    }))
    : null;

export const sendWelcomeEmail = async ({ email, name, intro, locale }: WelcomeEmailData & { locale?: string }) => {
    try {
        if (!transporter) {
            console.warn('⚠️ Welcome email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const { lang, t } = await getEmailTranslator(locale);
        const htmlTemplate = fillTemplate(WELCOME_EMAIL_TEMPLATE, {
            ...escapeAll({
                title: t('welcome.title'),
                logoAlt: t('common.logoAlt'),
                dashboardAlt: t('welcome.dashboardAlt'),
                heading: t('welcome.heading', { name }),
                featuresLabel: t('welcome.featuresLabel'),
                featureWatchlist: t('welcome.featureWatchlist'),
                featureSearch: t('welcome.featureSearch'),
                featureDashboard: t('welcome.featureDashboard'),
                closing: t('welcome.closing'),
                cta: t('welcome.cta'),
                unsubscribe: t('common.unsubscribe'),
                visitSite: t('common.visitSite'),
            }),
            lang,
            intro: sanitizeEmailIntro(intro),
            communityBlock: communityEmailBlock(email, t('welcome.communityCta'), t('welcome.communityScan')),
        });

        const mailOptions = {
            from: fromHeader(),
            to: email,
            subject: t('welcome.subject'),
            text: t('welcome.text'),
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error);
        throw error;
    }
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
) => {
    try {
        if (!transporter) {
            console.warn('⚠️ News summary email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
            .replace('{{date}}', date)
            .replace('{{newsContent}}', newsContent);

        const mailOptions = {
            from: fromHeader(),
            to: email,
            subject: `📈 Market News Summary Today - ${date}`,
            text: `Today's market news summary from HIVRA Finance`,
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ News summary email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send news summary email:', error);
        throw error;
    }
};

export const sendStockAlertEmail = async (
    { email, symbol, currentPrice, targetPrice, condition, locale }:
    { email: string; symbol: string; currentPrice: number; targetPrice: number; condition: 'ABOVE' | 'BELOW'; locale?: string }
) => {
    try {
        if (!transporter) {
            console.warn('⚠️ Stock alert email skipped: email credentials are not configured.');
            return { status: 'skipped' } satisfies EmailSendResult;
        }

        const isUpper = condition === 'ABOVE';
        // Binance pairs are quoted in USDT, everything else Finnhub prices here is USD
        const money = (value: number) => symbol.startsWith('BINANCE:')
            ? `${value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 6 : 2 })} USDT`
            : formatPrice(value);
        const { lang, t } = await getEmailTranslator(locale);
        const dir = isUpper ? 'Above' : 'Below';
        const values = { symbol, price: money(currentPrice), target: money(targetPrice) };
        const htmlTemplate = fillTemplate(isUpper ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE : STOCK_ALERT_LOWER_EMAIL_TEMPLATE, {
            ...escapeAll({
                symbol,
                currentPrice: values.price,
                targetPrice: values.target,
                timestamp: new Date().toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }),
                title: t(`stockAlert.title${dir}`, values),
                logoAlt: t('common.logoAlt'),
                heading: t(`stockAlert.heading${dir}`),
                currentPriceLabel: t('stockAlert.currentPrice'),
                details: t('stockAlert.details'),
                targetPriceLabel: t('stockAlert.targetPriceLabel'),
                triggerLabel: t('stockAlert.triggerLabel'),
                trigger: t(`stockAlert.trigger${dir}`, values),
                calloutTitle: t(`stockAlert.calloutTitle${dir}`),
                calloutBody: t(`stockAlert.calloutBody${dir}`, values),
                cta: t('stockAlert.cta'),
                footer: t('stockAlert.footer'),
                unsubscribe: t('common.unsubscribe'),
                visitSite: t('common.visitSite'),
            }),
            company: '', // Alerts don't store the company name
            lang,
        });

        const mailOptions = {
            from: fromHeader(),
            to: email,
            subject: t(`stockAlert.subject${dir}`, values),
            text: t(`stockAlert.text${dir}`, values),
            html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Stock alert email sent successfully:', info.messageId);
        return { status: 'sent', messageId: info.messageId } satisfies EmailSendResult;
    } catch (error) {
        console.error('❌ Failed to send stock alert email:', error);
        throw error;
    }
};
