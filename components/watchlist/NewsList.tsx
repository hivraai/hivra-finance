import { ArrowUpRight, Newspaper } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import SourceLogo from "@/components/news/SourceLogo";

export default function NewsList({ news }: { news: MarketNewsArticle[] }) {
    const t = useTranslations('NewsList');
    const format = useFormatter();
    if (news.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon"><Newspaper className="size-5" /></span>
                <h3>{t('emptyTitle')}</h3>
                <p>{t('emptyBody')}</p>
            </div>
        );
    }

    return (
        <ul className="row-list">
            {news.map((item) => (
                <li key={`${item.id}-${item.url}`}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 px-3 py-3 transition-colors hover:bg-hover/50">
                        <SourceLogo source={item.source} url={item.url} />
                        <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 font-semibold text-foreground group-hover:text-brand-ink transition-colors">{item.headline}</span>
                            <span className="mt-1 block truncate text-[12.5px] text-faint">
                                {item.related && <span className="mono me-1.5 font-semibold text-muted-foreground">{item.related}</span>}
                                {item.source}{item.datetime ? ` · ${format.relativeTime(item.datetime * 1000)}` : ''}
                            </span>
                        </span>
                        <ArrowUpRight className="mt-1 size-4 flex-none text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                </li>
            ))}
        </ul>
    );
}
