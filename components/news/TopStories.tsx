import NewsList from '@/components/watchlist/NewsList';
import { getTopStories } from '@/lib/news/top-stories';

// Our own Top stories (Finnhub + finance outlets' RSS), refreshed every 5 minutes, instead of
// TradingView's delayed widget. Headlines link out to the publisher in a new tab.
export default async function TopStories({ market }: { market: 'stock' | 'crypto' | 'forex' }) {
    const news = await getTopStories(market).catch(() => [] as MarketNewsArticle[]);
    return <div className="max-h-[560px] overflow-y-auto"><NewsList news={news} /></div>;
}

export function TopStoriesSkeleton() {
    return (
        <ul className="flex flex-col gap-3 p-3">
            {Array.from({ length: 8 }, (_, i) => <li key={i} className="h-11 animate-pulse rounded-lg bg-hover" />)}
        </ul>
    );
}
