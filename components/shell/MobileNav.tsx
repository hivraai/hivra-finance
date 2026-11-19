'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Menu, Search, Sigma, Sparkles, Star } from "lucide-react";
import Wordmark from "@/components/marketing/Wordmark";
import { openSearch } from "@/components/SearchCommand";
import { cn } from "@/lib/utils";

// Phone chrome (below lg): a slim top bar and an app-style bottom tab bar. The desktop sidebar
// and browser-style tabs are hidden there; "More" opens the sidebar as a drawer.

export function MobileTopBar() {
    const t = useTranslations('Sidebar');
    return (
        <header className="mobile-top lg:hidden">
            <Link href="/dashboard" aria-label={t('homeAria')}><Wordmark className="[&_img]:size-[26px] [&>span]:text-[16px]" /></Link>
            <button type="button" onClick={openSearch} className="chrome-btn ms-auto" aria-label={t('searchStocks')}>
                <Search />
            </button>
        </header>
    );
}

export function MobileTabBar({ onMore, moreOpen }: { onMore: () => void; moreOpen: boolean }) {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();
    const items = [
        { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
        { href: '/watchlist', label: t('watchlist'), icon: Star },
        { href: '/agent', label: t('agentShort'), icon: Sparkles },
        { href: '/options', label: t('optionsShort'), icon: Sigma },
    ];
    return (
        <nav className="mobile-tabs lg:hidden" aria-label={t('mobileNav')}>
            {items.map(({ href, label, icon: Icon }) => {
                const active = !moreOpen && (pathname === href || pathname.startsWith(`${href}/`));
                return (
                    <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('mobile-tab', active && 'is-active')}>
                        <Icon /><span>{label}</span>
                    </Link>
                );
            })}
            <button type="button" onClick={onMore} className={cn('mobile-tab', moreOpen && 'is-active')} aria-expanded={moreOpen}>
                <Menu /><span>{t('more')}</span>
            </button>
        </nav>
    );
}
