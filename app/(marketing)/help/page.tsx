import { Metadata } from 'next';
import { BookOpen, ChevronDown } from 'lucide-react';
import PageHero from '@/components/marketing/PageHero';
import SectionHead from '@/components/marketing/SectionHead';
import IconCard from '@/components/marketing/IconCard';

export const metadata: Metadata = {
    title: 'Help | HIVRA Finance',
    description: 'Help with HIVRA Finance: plans, data and your account.',
    alternates: { canonical: '/help' },
};

const FAQS = [
    {
        question: 'What do the plans include?',
        answer: 'Free gives you the dashboard, live charts, a watchlist and price alerts. Pro ($99 a month) adds the options desk, the strategy builder, the AI analyst and 20 backtest reports a month. Elite ($199 a month) adds unlimited backtests, the IV surface, gamma exposure and unusual flow.',
    },
    {
        question: 'How do I add a stock to my watchlist?',
        answer: 'Press ⌘K (or Search stocks in the sidebar), open the company, then press Watch. It shows up in your watchlist and in the sidebar.',
    },
    {
        question: 'Where does the market data come from?',
        answer: 'Stock charts come live from TradingView and quotes from Finnhub. Option chains and backtests use exchange data from Databento: chains are shown as of the last close, and backtests run on up to 13 years of history.',
    },
    {
        question: 'Is this investment advice?',
        answer: 'No. HIVRA Finance is market analytics software. It is not a broker or an investment adviser, and it never places trades for you.',
    },
    {
        question: 'How do I cancel?',
        answer: 'Plans are billed monthly and you can cancel any time from your profile. You keep access until the end of the month you paid for.',
    },
];

export default function HelpPage() {
    return (
        <>
            <PageHero kicker="Help" title="How can we help?" sub="Plans, data and your account." />

            <section className="mx-auto mt-14 grid max-w-[1200px] gap-3 px-5 md:grid-cols-3">
                <IconCard icon={BookOpen} title="How it works" footer={<a href="/#data" className="btn btn-ghost w-full">Where the data comes from</a>}>
                    Data sources, background jobs and the AI behind the emails.
                </IconCard>
            </section>

            <section className="mx-auto mt-24 max-w-[1200px] px-5">
                <SectionHead kicker="FAQ" title="Common questions." />
                <div className="hatch">
                    <div className="card row-list overflow-hidden">
                        {FAQS.map(({ question, answer }) => (
                            <details key={question} className="group">
                                {/* Padding lives on the summary so the whole row is the click target, in every browser */}
                                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground transition-colors hover:bg-hover/40 [&::-webkit-details-marker]:hidden">
                                    {question}
                                    <ChevronDown className="size-4 flex-none text-faint transition-transform duration-200 group-open:rotate-180" />
                                </summary>
                                <p className="max-w-3xl px-5 pb-5 text-[15px] leading-relaxed text-muted-foreground">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto mt-24 max-w-[1200px] px-5">
                <div className="hatch">
                    <div className="card flex flex-col items-start justify-between gap-5 p-8 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-[22px] font-bold tracking-[-0.03em]">Still stuck?</h2>
                            <p className="mt-1 text-muted-foreground">Write to us and the team answers by email.</p>
                        </div>
                        <a href="mailto:support@hivra.ai" className="btn btn-primary h-11 px-5 text-[15px]">Email support</a>
                    </div>
                </div>
            </section>
        </>
    );
}
