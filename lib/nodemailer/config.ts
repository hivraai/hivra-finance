// Where email goes out from. Resend (SMTP) when RESEND_API_KEY is set, else a Gmail app password.
// EMAIL_FROM is the sender address; it must be on a domain verified in Resend.
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export const emailConfigured = (): boolean =>
    Boolean(process.env.RESEND_API_KEY || (process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD));

export const senderAddress = (): string =>
    process.env.EMAIL_FROM || process.env.NODEMAILER_EMAIL || 'finance@hivra.ai';

export const fromHeader = (): string => `"HIVRA Finance" <${senderAddress()}>`;

export function transportOptions(): SMTPTransport.Options {
    if (process.env.RESEND_API_KEY) {
        return { host: 'smtp.resend.com', port: 465, secure: true, auth: { user: 'resend', pass: process.env.RESEND_API_KEY } };
    }
    return { service: 'gmail', auth: { user: process.env.NODEMAILER_EMAIL!, pass: process.env.NODEMAILER_PASSWORD! } };
}
