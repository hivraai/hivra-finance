import Link from "next/link";
import Wordmark from "@/components/marketing/Wordmark";
import { REPO_URL } from "@/lib/constants";
import type { LandingCopy } from "@/lib/landing-copy";

const linkClass = 'text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-side rounded-[4px]';

export default function SiteFooter({ footer }: { footer: LandingCopy['footer'] }) {
    return (
        <footer className="mt-24 border-t border-line bg-side">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
                <div className="flex max-w-sm flex-col gap-3">
                    <Link href="/" aria-label="HIVRA Finance" className="w-fit"><Wordmark /></Link>
                    <p className="text-[14px] leading-relaxed text-muted-foreground">{footer.tagline}</p>
                </div>
                <nav className="flex flex-wrap gap-x-6 gap-y-3">
                    <Link href="/help" className={linkClass}>{footer.help}</Link>
                    <Link href="/terms" className={linkClass}>{footer.terms}</Link>
                    <Link href="/privacy" className={linkClass}>{footer.privacy}</Link>
                    {/* AGPL-3.0: users of the hosted app must be able to get its source. */}
                    <a href={REPO_URL} target="_blank" rel="noreferrer" className={linkClass}>{footer.source}</a>
                </nav>
            </div>
            <div className="mx-auto max-w-[1200px] border-t border-line px-5 py-6">
                <p className="text-[13px] text-faint">© {new Date().getFullYear()} {footer.rights}</p>
            </div>
        </footer>
    );
}
