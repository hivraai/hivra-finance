'use client';

import Wordmark from "@/components/marketing/Wordmark";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Activity, BookOpen, ChevronRight, CreditCard, FlaskConical, LayoutDashboard, LifeBuoy, LogOut, Radar, Search, Sigma, Sparkles, Star } from "lucide-react";
import { openSearch } from "@/components/SearchCommand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { signOut } from "@/lib/actions/auth.actions";
import { cn } from "@/lib/utils";

type SidebarProps = {
    user: User;
    watchlist: { symbol: string; company: string }[];
};

const RESOURCES = [
    { href: '/billing', label: 'billing', icon: CreditCard },
    { href: '/help', label: 'help', icon: LifeBuoy },
    { href: '/terms', label: 'terms', icon: BookOpen },
] as const;

// PRO screens (lib/signals/views.ts). The group holding the current page opens by itself.
const SIGNAL_GROUPS = [
    { key: 'optionsFlow', icon: Activity, views: ['map', 'whales', 'gex', 'volatility', 'oi', 'strategies'] },
    { key: 'marketSignals', icon: Radar, views: ['darkpool', 'earnings', 'short-interest', 'etf-flow', 'congress', 'insiders', 'fda', 'macro'] },
] as const;

function SignalGroups({ pathname }: { pathname: string }) {
    const t = useTranslations('Signals');
    return (
        <>
            {SIGNAL_GROUPS.map(({ key, icon: Icon, views }) => (
                <details key={key} className="group/sig" open={views.some((v) => pathname === `/signals/${v}`)}>
                    <summary className="side-item cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <Icon /> <span className="flex-1">{t(`groups.${key}`)}</span>
                        <ChevronRight className="!size-3.5 transition-transform group-open/sig:rotate-90" />
                    </summary>
                    <div className="flex flex-col gap-0.5 ps-6">
                        {views.map((v) => (
                            <Link key={v} href={`/signals/${v}`} className={cn('side-item h-8 text-[13px]', pathname === `/signals/${v}` && 'is-active')}>
                                <span className="flex-1 truncate">{t(`views.${v}.title`)}</span>
                                <span className="pill is-brand h-[18px] px-1.5 text-[10px]">PRO</span>
                            </Link>
                        ))}
                    </div>
                </details>
            ))}
        </>
    );
}

const Sidebar = ({ user, watchlist }: SidebarProps) => {
    const t = useTranslations('Sidebar');
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/sign-in');
    };

    return (
        <aside className="sidebar">
            <Link href="/dashboard" className="px-2 pt-1 pb-2" aria-label={t('homeAria')}>
                <Wordmark />
            </Link>

            <button type="button" onClick={openSearch} className="side-cta">
                <Search className="size-4" strokeWidth={2.5} />
                <span className="flex-1 text-start">{t('searchStocks')}</span>
                <kbd className="kbd bg-on-brand/10">⌘K</kbd>
            </button>

            {/* Menu + watchlist scroll together, so a tall menu (both signal groups open) never runs under the footer links. */}
            <div className="scrollbar-hide-default -mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
            <nav className="flex shrink-0 flex-col gap-0.5">
                <Link href="/dashboard" className={cn('side-item', pathname === '/dashboard' && 'is-active')}>
                    <LayoutDashboard /> {t('overview')}
                </Link>
                <Link href="/watchlist" className={cn('side-item', pathname === '/watchlist' && 'is-active')}>
                    <Star /> <span className="flex-1">{t('watchlist')}</span>
                    <span className="num text-xs text-faint">{watchlist.length}</span>
                </Link>
                <Link href="/agent" className={cn('side-item', pathname === '/agent' && 'is-active')}>
                    <Sparkles /> {t('agent')}
                </Link>
                <Link href="/options" className={cn('side-item', pathname === '/options' && 'is-active')}>
                    <Sigma /> {t('options')}
                </Link>
                <Link href="/backtest" className={cn('side-item', pathname === '/backtest' && 'is-active')}>
                    <FlaskConical /> {t('backtest')}
                </Link>
                <SignalGroups pathname={pathname} />
            </nav>

            <div className="flex shrink-0 flex-col gap-1">
                <p className="side-label shrink-0">{t('watching')}</p>
                {watchlist.length === 0 ? (
                    <p className="px-2.5 text-[12.5px] text-faint">{t('watchingEmpty')}</p>
                ) : (
                    <ul className="scrollbar-hide-default flex min-h-0 flex-col gap-0.5 overflow-y-auto">
                        {watchlist.map(({ symbol, company }) => (
                            <li key={symbol}>
                                <Link
                                    href={`/stocks/${symbol}`}
                                    title={company}
                                    className={cn('side-item h-8 font-medium', pathname === `/stocks/${symbol}` && 'is-active')}
                                >
                                    <span className="mono w-14 shrink-0 text-[12.5px] font-semibold text-foreground">{symbol}</span>
                                    {company !== symbol && <span className="truncate text-[12.5px] text-faint">{company}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            </div>

            <div className="mt-auto flex shrink-0 flex-col gap-0.5">
                {RESOURCES.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href} className={cn('side-item h-8', pathname === href && 'is-active')}>
                        <Icon /> {t(`resources.${label}`)}
                    </Link>
                ))}
                <LanguageSwitcher />
            </div>


            <div className="flex items-center gap-2.5 border-t border-line pt-3 px-1">
                <Link href="/profile" className={cn('-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] p-1 transition-colors hover:bg-white/5', pathname === '/profile' && 'bg-white/5')}>
                    <span className="grid size-8 flex-none place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-ink">
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground">{user.name}</span>
                        <span className="block truncate text-[12px] text-faint">{user.email}</span>
                    </span>
                </Link>
                <button type="button" onClick={handleSignOut} className="icon-btn" title={t('signOut')} aria-label={t('signOut')}>
                    <LogOut />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
