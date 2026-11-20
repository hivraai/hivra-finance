import Link from "next/link";
import { MessageCircle } from "lucide-react";
import Wordmark from "@/components/marketing/Wordmark";
import { REPO_URL } from "@/lib/constants";
import type { LandingCopy } from "@/lib/landing-copy";

const linkClass = 'w-fit text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side rounded-[4px]';

function Column({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <nav aria-label={title} className="flex flex-col gap-3">
            <p className="text-[14px] font-semibold text-foreground">{title}</p>
            {children}
        </nav>
    );
}

export default function SiteFooter({ footer }: { footer: LandingCopy['footer'] }) {
    return (
        <footer className="mt-24 border-t border-line bg-side">
            <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
                <div className="flex max-w-sm flex-col gap-4">
                    <Link href="/" aria-label="HIVRA Finance" className="w-fit"><Wordmark /></Link>
                    <p className="text-[14px] leading-relaxed text-muted-foreground">{footer.tagline}</p>
                    <p className="flex items-start gap-2 text-[14px] leading-relaxed text-muted-foreground">
                        <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
                        {footer.community}
                    </p>
                </div>
                <Column title={footer.product}>
                    <Link href="/#plans" className={linkClass}>{footer.plans}</Link>
                    <Link href="/options" className={linkClass}>{footer.options}</Link>
                    <Link href="/signals/whales" className={linkClass}>{footer.signals}</Link>
                    <Link href="/agent" className={linkClass}>{footer.agent}</Link>
                    <Link href="/backtest" className={linkClass}>{footer.backtest}</Link>
                </Column>
                <Column title={footer.resources}>
                    <Link href="/help" className={linkClass}>{footer.help}</Link>
                    <Link href="/sign-in" className={linkClass}>{footer.signIn}</Link>
                    {/* AGPL-3.0: users of the hosted app must be able to get its source. */}
                    <a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>{footer.source}</a>
                </Column>
                <Column title={footer.legal}>
                    <Link href="/terms" className={linkClass}>{footer.terms}</Link>
                    <Link href="/privacy" className={linkClass}>{footer.privacy}</Link>
                </Column>
            </div>
            <div className="mx-auto flex max-w-[1200px] flex-col gap-2 border-t border-line px-5 py-6">
                <p className="text-[12px] leading-relaxed text-faint">{footer.risk}</p>
                <p className="text-[13px] text-faint">© {new Date().getFullYear()} {footer.rights}</p>
            </div>
        </footer>
    );
}
