import { ChevronDown, Search, Sparkles, Wrench, LineChart } from "lucide-react";
import SectionHead from "@/components/marketing/SectionHead";
import type { LandingCopy } from "@/lib/landing-copy";

type T = LandingCopy;

// Facts strip under the product preview. Only facts about the product, never invented user counts.
export function FactStrip({ t }: { t: T }) {
    return (
        <section className="mx-auto mt-12 max-w-[1200px] px-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
                {t.facts.map(({ value, label }) => (
                    <div key={label} className="bg-page px-5 py-5">
                        <dt className="text-[26px] font-bold tracking-[-0.04em]">{value}</dt>
                        <dd className="mt-1 text-[13px] text-muted-foreground">{label}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

const STEP_ICONS = [Search, Wrench, LineChart];

export function HowItWorks({ t }: { t: T }) {
    return (
        <section id="how" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
            <SectionHead kicker={t.how.kicker} title={t.how.title} sub={t.how.sub} />
            <ol className="grid gap-3 md:grid-cols-3">
                {t.how.steps.map(({ title, body }, i) => {
                    const Icon = STEP_ICONS[i];
                    return (
                        <li key={title} className="hatch">
                            <div className="card flex h-full flex-col gap-3 p-6">
                                <div className="flex items-center justify-between">
                                    <span className="bento-ico size-9 bg-brand-soft text-brand-ink"><Icon className="size-[18px]" /></span>
                                    <span className="text-[13px] font-semibold text-faint">0{i + 1}</span>
                                </div>
                                <h3 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h3>
                                <p className="text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

// ── Product close-ups: text on one side, an illustrative panel on the other ──

function ChainMock({ t }: { t: T }) {
    const rows = [
        [180, '8.42', '0.71', '1.88', '-0.28'],
        [185, '5.31', '0.58', '3.70', '-0.41'],
        [190, '3.05', '0.44', '6.40', '-0.56'],
        [195, '1.62', '0.29', '9.95', '-0.71'],
        [200, '0.80', '0.17', '14.10', '-0.83'],
    ] as const;
    return (
        <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[12px]">
                <span className="font-semibold">NVDA · 19 Dec</span>
                <span className="text-faint">{t.showcase.example}</span>
            </div>
            <table className="w-full text-[12.5px]">
                <thead>
                    <tr className="text-left text-[11px] text-faint">
                        <th className="px-4 py-2 font-medium">{t.showcase.chain.call}</th>
                        <th className="py-2 font-medium">Δ</th>
                        <th className="py-2 text-center font-medium">{t.showcase.chain.strike}</th>
                        <th className="py-2 font-medium">{t.showcase.chain.put}</th>
                        <th className="px-4 py-2 font-medium">Δ</th>
                    </tr>
                </thead>
                <tbody className="num">
                    {rows.map(([k, c, cd, p, pd]) => (
                        <tr key={k} className={k === 190 ? 'bg-brand-soft/60' : 'border-t border-line'}>
                            <td className="px-4 py-2 text-up">{c}</td>
                            <td className="py-2 text-muted-foreground">{cd}</td>
                            <td className="py-2 text-center font-semibold">{k}</td>
                            <td className="py-2 text-down">{p}</td>
                            <td className="px-4 py-2 text-muted-foreground">{pd}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex gap-4 border-t border-line px-4 py-3 text-[12px] text-muted-foreground">
                <span>IV <b className="text-foreground">48%</b></span>
                <span>{t.showcase.chain.move} <b className="text-foreground">±$11.20</b></span>
            </div>
        </div>
    );
}

function BacktestMock({ t }: { t: T }) {
    const pts = [0, 4, 3, 8, 7, 12, 10, 15, 13, 19, 17, 24, 21, 27, 31, 28, 34, 38];
    const max = 40, w = 300, h = 110;
    const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return (
        <div className="card p-4">
            <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold">{t.showcase.backtest.name}</span>
                <span className="text-faint">{t.showcase.example}</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-28 w-full" preserveAspectRatio="none" aria-hidden>
                <path d={`${d} L${w},${h} L0,${h} Z`} className="fill-brand-soft" />
                <path d={d} className="stroke-brand" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-[12px]">
                {t.showcase.backtest.stats.map(({ label, value }) => (
                    <div key={label}>
                        <dt className="text-faint">{label}</dt>
                        <dd className="num font-semibold">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function QuestionsMock({ t }: { t: T }) {
    return (
        <div className="card flex flex-col gap-2 p-4">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-ink"><Sparkles className="size-3.5" />{t.showcase.ai.label}</span>
            {t.showcase.ai.questions.map((q) => (
                <span key={q} className="rounded-xl border border-line px-3 py-2.5 text-[13px]">{q}</span>
            ))}
        </div>
    );
}

export function Showcase({ t }: { t: T }) {
    const panels = [<ChainMock key="c" t={t} />, <BacktestMock key="b" t={t} />, <QuestionsMock key="q" t={t} />];
    return (
        <section id="tour" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
            <SectionHead kicker={t.showcase.kicker} title={t.showcase.title} />
            <div className="flex flex-col gap-16">
                {t.showcase.items.map(({ kicker, title, body, points }, i) => (
                    <div key={title} className="grid items-center gap-8 lg:grid-cols-2">
                        <div className={i % 2 ? 'lg:order-2' : ''}>
                            <p className="kicker text-brand-ink">{kicker}</p>
                            <h3 className="mt-2 text-[26px] font-bold leading-tight tracking-[-0.03em]">{title}</h3>
                            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
                            <ul className="mt-4 flex flex-col gap-2 text-[14px]">
                                {points.map((p) => (
                                    <li key={p} className="flex gap-2"><span className="mt-[7px] size-1.5 flex-none rounded-full bg-brand" />{p}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="hatch">{panels[i]}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function Audience({ t }: { t: T }) {
    return (
        <section className="mx-auto mt-28 max-w-[1200px] px-5">
            <SectionHead kicker={t.audience.kicker} title={t.audience.title} />
            <div className="grid gap-3 md:grid-cols-3">
                {t.audience.items.map(({ title, body }) => (
                    <div key={title} className="hatch">
                        <div className="card h-full p-6">
                            <h3 className="text-[17px] font-bold tracking-[-0.02em]">{title}</h3>
                            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function Faq({ t }: { t: T }) {
    return (
        <section id="faq" className="mx-auto mt-28 max-w-[1200px] scroll-mt-24 px-5">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                <SectionHead kicker={t.faq.kicker} title={t.faq.title} sub={t.faq.sub} />
                <div className="card divide-y divide-line p-0">
                    {t.faq.items.map(({ q, a }) => (
                        <details key={q} className="group px-5 py-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                                {q}<ChevronDown className="size-4 flex-none text-faint transition-transform group-open:rotate-180" />
                            </summary>
                            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
