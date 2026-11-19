'use server';

import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import countryList from "react-select-country-list";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { verifyTurnstile } from "@/lib/turnstile";
import { emailConfigured } from "@/lib/nodemailer/config";

const isOption = (options: readonly { value: string }[], value: unknown) => options.some((o) => o.value === value);
const COUNTRY_CODES = new Set(countryList().getValues()); // the same list the sign-up country picker shows

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry, captchaToken }: SignUpFormData & { captchaToken?: string | null }) => {
    const t = await getTranslations('Errors');
    if (!(await verifyTurnstile(captchaToken, await clientIp()))) return { success: false, error: t('humanCheck') };
    // These fields go into the AI prompt for the welcome email, so only accept the form's own values
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.length > 80
        || typeof country !== 'string' || !COUNTRY_CODES.has(country)
        || !isOption(INVESTMENT_GOALS, investmentGoals)
        || !isOption(RISK_TOLERANCE_OPTIONS, riskTolerance)
        || !isOption(PREFERRED_INDUSTRIES, preferredIndustry)) {
        return { success: false, error: t('signUpFailed') };
    }
    // Each sign-up sends a welcome email from our Gmail and an AI call
    if (await isRateLimited(`sign-up:ip:${await clientIp()}`, 5, 60 * 60)) {
        return { success: false, error: t('tooManyAttempts') };
    }
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry } })

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: t('signUpFailed') }
    }
}

export const signInWithEmail = async ({ email, password, captchaToken }: SignInFormData & { captchaToken?: string | null }) => {
    const t = await getTranslations('Errors');
    if (!(await verifyTurnstile(captchaToken, await clientIp()))) return { success: false, error: t('humanCheck') };
    // Per IP against credential stuffing, per account against guessing one password from many IPs
    if (await isRateLimited(`sign-in:ip:${await clientIp()}`, 20, 10 * 60)
        || await isRateLimited(`sign-in:email:${String(email).trim().toLowerCase()}`, 10, 10 * 60)) {
        return { success: false, error: t('tooManyAttempts') };
    }
    try {
        const response = await auth.api.signInEmail({ body: { email, password } })

        // Update lastActiveAt
        if (response) {
            try {
                // Dynamic import or ensure path is correct
                const { connectToDatabase } = await import("@/database/mongoose");
                const mongoose = await connectToDatabase();
                const db = mongoose.connection.db;
                if (db) {
                    await db.collection('user').updateOne(
                        { email },
                        { $set: { lastActiveAt: new Date() } }
                    );
                }
            } catch (err) {
                console.error("Failed to update lastActiveAt", err);
            }
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign in failed', e)
        return { success: false, error: t('signInFailed') }
    }
}

// Passwordless sign-in / sign-up: emails a one-time link. Same answer whether or not the email has an
// account, so the form cannot be used to find out who is registered.
export const sendSignInLink = async ({ email, name, captchaToken }: { email: string; name?: string; captchaToken?: string | null }) => {
    const t = await getTranslations('Errors');
    if (!(await verifyTurnstile(captchaToken, await clientIp()))) return { success: false, error: t('humanCheck') };
    const address = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address) || address.length > 200) return { success: false, error: t('signInFailed') };
    if (!emailConfigured()) return { success: false, error: t('resetEmailNotConfigured') };
    // Every request sends a real email
    if (await isRateLimited(`link:email:${address}`, 4, 15 * 60) || await isRateLimited(`link:ip:${await clientIp()}`, 15, 60 * 60)) {
        return { success: false, error: t('tooManyAttempts') };
    }
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    try {
        await auth.api.signInMagicLink({
            body: { email: address, ...(cleanName ? { name: cleanName } : {}), callbackURL: '/dashboard', newUserCallbackURL: '/welcome', errorCallbackURL: '/sign-in?link=expired' },
            headers: await headers(),
        });
        return { success: true };
    } catch (e) {
        console.error('Sign-in link failed', e);
        return { success: false, error: t('signInFailed') };
    }
}

export const signInWithSocial = async (provider: 'google' | 'github') => {
    try {
        const { url } = await auth.api.signInSocial({
            body: { provider, callbackURL: '/dashboard', errorCallbackURL: '/sign-in' },
        });
        return { success: true, url }
    } catch (e) {
        console.log('Social sign in failed', e)
        const t = await getTranslations('Errors');
        return { success: false, error: t('socialSignInUnavailable', { provider: provider === 'google' ? 'Google' : 'GitHub' }) }
    }
}

export const requestPasswordResetEmail =async ({ email, captchaToken }: { email: string; captchaToken?: string | null }) => {
    const t = await getTranslations('Errors');
    if (!(await verifyTurnstile(captchaToken, await clientIp()))) return { success: false, error: t('humanCheck') };
    if (!emailConfigured()) {
        return { success: false, error: t('resetEmailNotConfigured') }
    }
    // Every request sends a real email from our Gmail; unlimited requests could exhaust its daily quota
    if (await isRateLimited(`reset:email:${String(email).trim().toLowerCase()}`, 3, 60 * 60)
        || await isRateLimited(`reset:ip:${await clientIp()}`, 10, 60 * 60)) {
        return { success: false, error: t('tooManyAttempts') };
    }

    try {
        const configuredBaseUrl = process.env.BETTER_AUTH_URL;
        const baseUrl = configuredBaseUrl || (
            process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null
        );

        if (!baseUrl) {
            return {
                success: false,
                error: t('resetBaseUrlMissing'),
            }
        }

        await auth.api.requestPasswordReset({
            body: {
                email,
                redirectTo: `${baseUrl}/reset-password`,
            },
        });

        return { success: true }
    } catch (e) {
        console.log('Password reset request failed', e)
        return { success: false, error: t('resetEmailFailed') }
    }
}

export const resetPasswordWithToken = async (
    { token, newPassword }: { token: string; newPassword: string }
) => {
    try {
        await auth.api.resetPassword({
            body: {
                token,
                newPassword,
            },
        });

        return { success: true }
    } catch (e) {
        console.log('Password reset failed', e)
        const t = await getTranslations('Errors');
        return { success: false, error: t('resetLinkInvalid') }
    }
}

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        const t = await getTranslations('Errors');
        return { success: false, error: t('signOutFailed') }
    }
}

