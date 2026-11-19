import Wordmark from "@/components/marketing/Wordmark";
import Link from "next/link";
import React from "react";
import {redirect} from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import HtmlLang from "@/components/HtmlLang";
import {getSession} from "@/lib/better-auth/auth";
import { SocialProvidersProvider } from "@/components/forms/SocialAuthButtons";

// One centred column, like hivra.ai's own sign-in: logo, the form, small print. Nothing else.
const Layout = async ({ children }: { children : React.ReactNode }) => {

    const session = await getSession();

    if (session?.user) redirect('/dashboard')

    const locale = await getLocale();
    const t = await getTranslations('AuthLayout');

    // Same condition that enables the providers in lib/better-auth/auth.ts
    const socialProviders = [
        ...(process.env.GOOGLE_CLIENT_ID ? ['google' as const] : []),
        ...(process.env.GITHUB_CLIENT_ID ? ['github' as const] : []),
    ];
    return (
        <NextIntlClientProvider>
        <HtmlLang locale={locale} />
        <main className="auth-shell">
            <div className="auth-column">
                <Link href="/" className="mx-auto mb-6 flex items-center" aria-label={t('home')}>
                    <Wordmark />
                </Link>
                <div className="auth-card">
                    <SocialProvidersProvider enabled={socialProviders}>{children}</SocialProvidersProvider>
                </div>
                <p className="mt-6 text-center text-[12px] text-faint">
                    {t('legal')} <Link href="/terms" className="underline underline-offset-2 hover:text-muted-foreground">{t('terms')}</Link> {t('and')}{' '}
                    <Link href="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">{t('privacy')}</Link>.
                </p>
            </div>
        </main>
        </NextIntlClientProvider>
    )
}
export default Layout
