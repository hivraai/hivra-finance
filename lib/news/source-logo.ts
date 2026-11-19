// Publisher logos for news rows. The domain comes from the source name (Finnhub sends names like "Reuters" and
// sometimes links through its own redirect), falling back to the article's own host.
const SOURCE_DOMAINS: Record<string, string> = {
    zerohedge: 'zerohedge.com',
    cnbc: 'cnbc.com',
    marketwatch: 'marketwatch.com',
    'investing.com': 'investing.com',
    reuters: 'reuters.com',
    bloomberg: 'bloomberg.com',
    yahoo: 'finance.yahoo.com',
    seekingalpha: 'seekingalpha.com',
    benzinga: 'benzinga.com',
    coindesk: 'coindesk.com',
    cointelegraph: 'cointelegraph.com',
    forbes: 'forbes.com',
    'wall street journal': 'wsj.com',
    wsj: 'wsj.com',
    barrons: 'barrons.com',
    "barron's": 'barrons.com',
    'business insider': 'businessinsider.com',
    businessinsider: 'businessinsider.com',
    'the motley fool': 'fool.com',
    'motley fool': 'fool.com',
    fxstreet: 'fxstreet.com',
    'financial times': 'ft.com',
    ft: 'ft.com',
    'the economist': 'economist.com',
    'associated press': 'apnews.com',
    'ap news': 'apnews.com',
    techcrunch: 'techcrunch.com',
    'the block': 'theblock.co',
    decrypt: 'decrypt.co',
    'tipranks': 'tipranks.com',
    'zacks': 'zacks.com',
};

const HOST = /^(?=.{3,253}$)([a-z0-9-]+\.)+[a-z]{2,24}$/;

export const isLogoDomain = (d: string) => HOST.test(d);

export function sourceDomain(source: string, url: string): string | null {
    const key = source.trim().toLowerCase();
    if (SOURCE_DOMAINS[key]) return SOURCE_DOMAINS[key];
    try {
        const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
        return host && !host.endsWith('finnhub.io') && isLogoDomain(host) ? host : null;
    } catch {
        return null;
    }
}

export const sourceLogoUrl = (domain: string) => `/api/logo?d=${encodeURIComponent(domain)}`;
