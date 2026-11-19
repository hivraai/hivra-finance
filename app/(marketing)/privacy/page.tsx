import { Metadata } from 'next';
import PageHero from '@/components/marketing/PageHero';

export const metadata: Metadata = {
    title: 'Privacy Policy | HIVRA Finance',
    description: 'What HIVRA Finance collects, why, who processes it, and how to delete it.',
};

const CONTACT = 'hello@hivra.ai';
const UPDATED = 'November 19, 2026';

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
    {
        id: 'who',
        title: '1. Who we are',
        body: (
            <p>
                HIVRA Finance (&ldquo;HIVRA Finance&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is market-analytics software available at
                finance.hivra.ai: dashboards, charts, an options desk, backtests and an AI analyst. We do not hold customer money, execute trades
                or give investment advice. This policy explains what personal information we collect when you use the site, why, who processes
                it for us, and the choices you have. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            </p>
        ),
    },
    {
        id: 'collect',
        title: '2. Information we collect',
        body: (
            <>
                <p><strong>Account information.</strong> Your name, email address and a securely hashed password when you register with email. If you
                    choose <strong>Sign in with Google</strong>, we receive from Google only your name, email address, profile picture and Google
                    account identifier (the <em>openid</em>, <em>email</em> and <em>profile</em> scopes). We never receive your Google password and
                    we do not request access to your Gmail, Drive, Calendar, contacts or any other Google data.</p>
                <p><strong>Preferences.</strong> Country, investment goal, risk tolerance and preferred industry, if you set them, and your language.</p>
                <p><strong>What you create.</strong> Watchlists, price alerts, backtest settings and your conversations with the AI analyst.</p>
                <p><strong>Billing.</strong> Your plan, subscription status and AI credit balance. Card details are entered on Stripe&rsquo;s page and
                    are never sent to or stored by us; we keep only the Stripe customer and subscription identifiers.</p>
                <p><strong>Usage and technical data.</strong> AI credits and backtests used per month, sign-in sessions (a session cookie), IP address
                    and browser information used for security and rate limiting, and aggregate, cookie-less page analytics.</p>
            </>
        ),
    },
    {
        id: 'use',
        title: '3. How we use it',
        body: (
            <ul>
                <li>To create and secure your account and keep you signed in.</li>
                <li>To provide the product: your watchlists, alerts, AI analyst answers and backtests.</li>
                <li>To bill your plan and AI credit purchases, and to enforce plan limits.</li>
                <li>To send emails you expect: a welcome email, price alerts you set, and account or billing notices. You can ask us to stop the weekly
                    market summary at any time.</li>
                <li>To prevent abuse (bot checks, rate limits) and to fix problems.</li>
            </ul>
        ),
    },
    {
        id: 'google',
        title: '4. Google user data',
        body: (
            <>
                <p>Information received from Google is used <strong>only</strong> to sign you in and to show your name and picture in your account.
                    We do not sell it, use it for advertising, share it with third parties except the service providers in section 5 that host our
                    systems, or use it to train AI models.</p>
                <p>HIVRA Finance&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
                    <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>,
                    including the Limited Use requirements.</p>
                <p>You can remove HIVRA Finance&rsquo;s access at any time from your Google Account at{' '}
                    <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.</p>
            </>
        ),
    },
    {
        id: 'share',
        title: '5. Who processes data for us',
        body: (
            <>
                <p>We do not sell personal information. We share it only with providers that run parts of the service for us, under their own
                    privacy and security terms:</p>
                <ul>
                    <li><strong>Vercel</strong>: hosting and cookie-less page analytics.</li>
                    <li><strong>MongoDB Atlas</strong>: our database.</li>
                    <li><strong>Stripe</strong>: payments and subscriptions.</li>
                    <li><strong>Anthropic</strong>: the AI model behind the AI analyst. Your questions and the conversation are sent to it to produce
                        an answer; under Anthropic&rsquo;s commercial terms this data is not used to train its models.</li>
                    <li><strong>Cloudflare</strong>: the bot check on sign-in and sign-up.</li>
                    <li><strong>Inngest</strong> and our email provider: scheduled jobs and sending the emails above.</li>
                    <li><strong>Market data providers</strong> (such as Databento and Finnhub): we request prices and quotes from them; no personal
                        information is sent.</li>
                </ul>
                <p>We may also disclose information if required by law or to protect the rights and safety of our users and the service.</p>
            </>
        ),
    },
    {
        id: 'retention',
        title: '6. How long we keep it',
        body: (
            <p>We keep your account data while your account is open. When you ask us to delete your account, we delete your profile, watchlists,
                alerts, AI conversations and usage records within 30 days. Billing records that tax and accounting law require us to keep are
                retained by Stripe and by us for the period the law sets.</p>
        ),
    },
    {
        id: 'rights',
        title: '7. Your choices and rights',
        body: (
            <>
                <p>You can update your name and preferences in your profile, ask us to stop the weekly email, cancel your plan from the billing page, and
                    disconnect Google from your Google Account.</p>
                <p>You can ask us for a copy of your data, to correct it, or to delete your account and data by writing to{' '}
                    <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the email on your account. Depending on where you live (for example the EU, UK or
                    California) you may have further rights, such as objecting to processing or complaining to a data-protection authority; we honour
                    them wherever they apply.</p>
            </>
        ),
    },
    {
        id: 'security',
        title: '8. Security',
        body: (
            <p>Connections are encrypted (HTTPS), passwords are stored only as salted hashes, payment card data never touches our servers, and
                access to production systems is limited to the people who run the service. No system is perfectly secure, but we work to protect
                your information and will tell you without undue delay if a breach affects it.</p>
        ),
    },
    {
        id: 'children',
        title: '9. Children',
        body: <p>HIVRA Finance is not intended for anyone under 18, and we do not knowingly collect information from children.</p>,
    },
    {
        id: 'changes',
        title: '10. Changes',
        body: (
            <p>If we change this policy we will update the date above, and for material changes we will tell you by email or in the app before
                they take effect.</p>
        ),
    },
];

export default function PrivacyPage() {
    return (
        <>
            <PageHero kicker={`Privacy · Last updated ${UPDATED}`} title="Privacy Policy" sub="What we collect, why, who processes it, and how to delete it." />
            <article className="legal mx-auto mt-12 flex max-w-[760px] flex-col gap-10 px-5 pb-24">
                {SECTIONS.map((s) => (
                    <section key={s.id} id={s.id} className="flex flex-col gap-3">
                        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{s.title}</h2>
                        <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-2 [&_li]:ms-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
                            {s.body}
                        </div>
                    </section>
                ))}
            </article>
        </>
    );
}
