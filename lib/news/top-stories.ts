// Top stories for the dashboard: Finnhub's market feed plus the RSS headlines of finance outlets,
// merged, de-duplicated and newest first. Headlines and links only: we never copy article text.
import 'server-only';
import { unstable_cache } from 'next/cache';

type Market = 'stock' | 'crypto' | 'forex';

// Outlets kept to finance. ZeroHedge, CNBC, MarketWatch and Finnhub's general feed also run
// politics and culture, so their headlines pass the finance filter; Investing.com is markets only.
const RSS: { name: string; url: string; filter: boolean; markets: Market[] }[] = [
    { name: 'ZeroHedge', url: 'https://feeds.feedburner.com/zerohedge/feed', filter: true, markets: ['stock', 'crypto', 'forex'] },
    { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', filter: true, markets: ['stock'] },
    { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', filter: true, markets: ['stock'] },
    { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss', filter: false, markets: ['stock'] },
];

const FINANCE = /\b(stocks?|shares?|equit|markets?|wall street|s&p|nasdaq|dow|russell|index|indices|futures|bonds?|treasur|yields?|rates?|fed\b|federal reserve|fomc|powell|ecb|boj|central bank|inflation|cpi|pce|ppi|gdp|recession|jobs? report|payrolls|unemployment|economy|economic|earnings|revenue|profit|guidance|forecast|ipo|merger|acquisition|buyout|deal|valuation|investors?|trading|traders?|hedge fund|etf|options|volatility|vix|dollar|euro|yen|yuan|currenc|forex|fx\b|oil|crude|opec|gas prices|gold|silver|copper|commodit|bitcoin|crypto|ethereum|stablecoin|tariffs?|trade war|exports?|imports?|debt|deficit|credit|default|bank|lending|mortgage|housing market|real estate|layoffs?|ceo|nvidia|apple|microsoft|tesla|amazon|alphabet|google|meta\b|ai stocks?|chip|semiconductor|billion|trillion)/i;

// Personal-finance advice columns ("Should I sell my stocks…") are not market news.
const ADVICE = /\b(should (i|we)|i'm \d|we're in our|my (wife|husband|parents|sister|brother)|retirement savings)\b/i;
const OFF_TOPIC = /\b(somalia|ambassador|woke|transgender|immigra|migrant|ukraine war|israel|gaza|hamas|election|democrat|republican|trump says|biden|vaccine|covid)\b/i;
const isFinance = (h: string) => FINANCE.test(h) && !OFF_TOPIC.test(h) && !ADVICE.test(h);

function decode(s: string): string {
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .trim();
}
const tag = (item: string, name: string) => {
    const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(item);
    return m ? decode(m[1]) : '';
};

async function rss(source: (typeof RSS)[number]): Promise<MarketNewsArticle[]> {
    const res = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HIVRAFinance/1.0)' }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) throw new Error(`${source.name} ${res.status}`);
    const xml = await res.text();
    const out: MarketNewsArticle[] = [];
    for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
        const item = m[0];
        const headline = tag(item, 'title');
        const url = tag(item, 'link') || tag(item, 'guid');
        const when = Date.parse(tag(item, 'pubDate') || tag(item, 'dc:date'));
        if (!headline || !/^https?:\/\//.test(url) || !Number.isFinite(when)) continue;
        if (source.filter && !isFinance(headline)) continue;
        out.push({ id: 0, headline, summary: '', source: source.name, url, datetime: Math.floor(when / 1000), category: 'rss', related: '' });
    }
    return out;
}

async function finnhub(market: Market): Promise<MarketNewsArticle[]> {
    const key = (process.env.FINNHUB_API_KEYS || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || process.env.FINNHUB_API_KEY || '').split(',')[0]?.trim();
    if (!key) return [];
    const category = market === 'stock' ? 'general' : market;
    const res = await fetch(`https://finnhub.io/api/v1/news?category=${category}&token=${key}`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) throw new Error(`finnhub ${res.status}`);
    const rows = await res.json() as MarketNewsArticle[];
    return rows.filter((r) => r.headline && r.url && r.datetime && isFinance(r.headline)).map((r) => ({ ...r, summary: '' }));
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 80);

export const getTopStories = unstable_cache(async (market: Market): Promise<MarketNewsArticle[]> => {
    const results = await Promise.allSettled([finnhub(market), ...RSS.filter((s) => s.markets.includes(market)).map(rss)]);
    for (const r of results) if (r.status === 'rejected') console.warn('[news]', r.reason instanceof Error ? r.reason.message : r.reason);
    const cutoff = Date.now() / 1000 - 48 * 3600;
    const seen = new Set<string>();
    const merged = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
        .filter((a) => a.datetime >= cutoff && a.datetime <= Date.now() / 1000 + 600)
        .sort((a, b) => b.datetime - a.datetime)
        .filter((a) => { const k = norm(a.headline); if (seen.has(k)) return false; seen.add(k); return true; });
    // No single outlet takes over the list: at most 6 of the 30 from one source.
    const per = new Map<string, number>();
    return merged.filter((a) => { const n = (per.get(a.source) ?? 0) + 1; per.set(a.source, n); return n <= 6; }).slice(0, 30);
}, ['top-stories-v1'], { revalidate: 300 });
