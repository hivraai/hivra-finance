import Link from "next/link";
import { headers } from "next/headers";
import SiteFooter from "@/components/marketing/SiteFooter";
import Wordmark from "@/components/marketing/Wordmark";
import { LANDING_COPY, landingLang } from "@/lib/landing-copy";

// No session read here: it made every public page (and every <Link> prefetch of one) a function call.
// The header always shows the signed-out buttons; /sign-in and /sign-up send a signed-in visitor to /dashboard.
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
    const t = LANDING_COPY[landingLang((await headers()).get('accept-language'))];

    return (
        <div className="theme-site min-h-dvh bg-page">
            <header className="sticky top-0 z-40 border-b border-transparent bg-page/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
                    <Link href="/" aria-label="HIVRA Finance" className="shrink-0">
                        <Wordmark />
                    </Link>
                    <nav className="hidden items-center gap-1 md:flex">
                        {[['/#inside', t.nav.product], ['/#plans', t.nav.plans], ['/#data', t.nav.data]].map(([href, label]) => (
                            <Link key={href} href={href} className="side-item h-8 font-semibold">{label}</Link>
                        ))}
                    </nav>
                    <div className="ml-auto flex items-center gap-2">
                        <Link href="/sign-in" className="btn h-9 px-3 text-muted-foreground hover:text-foreground">{t.nav.signIn}</Link>
                        <Link href="/sign-up" className="btn btn-primary h-9">{t.nav.start}</Link>
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <SiteFooter footer={t.footer} />
        </div>
    );
}
