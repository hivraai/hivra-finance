import Wordmark from "@/components/marketing/Wordmark";
import Link from "next/link";
import React from "react";
import {redirect} from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import HtmlLang from "@/components/HtmlLang";
import {getSession} from "@/lib/better-auth/auth";
import ProductPreview from "@/components/landing/ProductPreview";
import { SocialProvidersProvider } from "@/components/forms/SocialAuthButtons";

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
        <main className="auth-layout">
            <section className="auth-left-section scrollbar-hide-default">
                <Link href="/" className="auth-logo flex items-center gap-2">
                    <Wordmark />
                </Link>

                <div className="pb-6 lg:pb-8 flex-1">
                    <SocialProvidersProvider enabled={socialProviders}>{children}</SocialProvidersProvider>
                </div>
            </section>
            <section className="auth-right-section">
                <div className="relative flex-1" aria-hidden>
                    <div className="auth-dashboard-preview absolute top-0">
                        <ProductPreview />
                    </div>
                </div>
            </section>

        </main>
        </NextIntlClientProvider>
    )
}
export default Layout
