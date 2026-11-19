import Link from "next/link";
import { headers } from "next/headers";
import { Activity, Bot, CandlestickChart, FileBarChart, Layers, Sigma } from "lucide-react";
import { MarketDial, MarketStatus } from "@/components/landing/MarketClock";
import ProductPreview from "@/components/landing/ProductPreview";
import SectionHead from "@/components/marketing/SectionHead";
import IconCard from "@/components/marketing/IconCard";
import { cn } from "@/lib/utils";
import { LANDING_COPY, landingLang } from "@/lib/landing-copy";

// Same order as the features in lib/landing-copy.ts
const FEATURE_ICONS = [Sigma, Layers, FileBarChart, Bot, Activity, CandlestickChart];

export default async function LandingPage() {
    const t = LANDING_COPY[landingLang((await headers()).get('accept-language'))];

    return (
        <>
            <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pt-14 md:pt-20 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                    <MarketStatus />
                    <h1 className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.05em] md:text-[68px]">
                        {t.hero.title[0]}<br />{t.hero.title[1]}
                    </h1>
                    <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">{t.hero.sub}</p>
                    <div className="mt-8 flex flex-wrap items-center gap-2">
                        <Link href="/sign-up" className="btn btn-primary h-11 px-5 text-[15px]">{t.hero.primary}</Link>
                        <Link href="/#plans" className="btn btn-ghost h-11 px-5 text-[15px]">{t.hero.secondary}</Link>
                    </div>
                </div>
                <div className="hatch">
                    <div className="card px-6 pb-5 pt-6"><MarketDial /></div>
                </div>
            </section>

            <section className="mx-auto mt-16 max-w-[1200px] px-5">
                <ProductPreview theme="light" />
            </section>

            <section id="inside" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead kicker={t.inside.kicker} title={t.inside.title} sub={t.inside.sub} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {t.inside.features.map(({ title, body }, i) => (
                        <IconCard key={title} icon={FEATURE_ICONS[i]} title={title}>{body}</IconCard>
                    ))}
                </div>
            </section>

            <section id="plans" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead kicker={t.plans.kicker} title={t.plans.title} sub={t.plans.sub} />
                <div className="grid gap-3 lg:grid-cols-3">
                    {t.plans.tiers.map((tier, i) => {
                        const featured = i === 1;
                        return (
                            <div key={tier.name} className="hatch">
                                <div className="card flex h-full flex-col gap-4 p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[18px] font-bold tracking-[-0.02em]">{tier.name}</h3>
                                        {featured && <span className="pill is-brand">{t.plans.popular}</span>}
                                    </div>
                                    <p className="bento-value text-[30px]">
                                        {tier.price}<small className="text-faint"> {t.plans.perMonth}</small>
                                    </p>
                                    <p className="text-[14px] leading-relaxed text-muted-foreground">{tier.body}</p>
                                    <Link href="/sign-up" className={cn('btn mt-auto', featured ? 'btn-primary' : 'btn-ghost')}>{tier.cta}</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section id="data" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
                <SectionHead kicker={t.data.kicker} title={t.data.title} />
                <dl className="grid gap-3 md:grid-cols-3">
                    {t.data.items.map(({ label, value }) => (
                        <div key={label} className="bento-tile bg-page">
                            <dt className="kicker">{label}</dt>
                            <dd className="mt-2 text-[16px] font-semibold">{value}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-4 text-[13px] text-faint">{t.data.note}</p>
            </section>

            <section className="mx-auto mt-28 max-w-[1200px] px-5">
                <div className="hatch">
                    <div className="card flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
                        <h2 className="max-w-xl text-[28px] font-bold leading-tight tracking-[-0.04em] md:text-[34px]">{t.cta.title}</h2>
                        <Link href="/sign-up" className="btn btn-primary h-11 px-5 text-[15px]">{t.cta.button}</Link>
                    </div>
                </div>
            </section>
        </>
    );
}
