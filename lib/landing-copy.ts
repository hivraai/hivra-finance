// Landing copy, English and Spanish. Every visible string on the marketing home lives here so the two
// languages stay in step: add a key to both or the parity test fails.

export type LandingLang = 'en' | 'es';

export const LANDING_COPY = {
    en: {
        nav: { product: 'Product', plans: 'Plans', data: 'Data', signIn: 'Sign in', start: 'Get started' },
        hero: {
            title: ['Options research,', 'with an AI analyst.'],
            sub: 'Build option strategies, backtest them on years of real exchange data and get a written read from the AI before you put money on the line.',
            primary: 'Start free',
            secondary: 'See the plans',
        },
        inside: {
            kicker: "What's inside",
            title: 'The desk a trader actually uses.',
            sub: 'Charts, option chains, strategies, backtests and an AI analyst on one screen.',
            features: [
                { title: 'Options desk', body: 'End-of-day chains with Greeks and implied volatility for US stock, ETF and index options, strike by strike.' },
                { title: 'Strategy builder', body: 'Spreads, straddles, condors and custom legs, with the payoff chart and break-evens before you trade.' },
                { title: 'Backtests as reports', body: 'Run a strategy over 13 years of history and get a report: P&L, win rate, drawdown, equity curve and every trade.' },
                { title: 'AI analyst', body: 'Ask about a ticker or a strategy and get a written read of the setup, the risks and what the numbers say.' },
                { title: 'Volatility and gamma', body: 'IV surface and smile, and dealer gamma exposure by strike, to see where the market is pinned.' },
                { title: 'Live charts', body: 'TradingView candles with indicators and drawing tools, plus a watchlist and price alerts.' },
            ],
        },
        plans: {
            kicker: 'Plans',
            title: 'Start free. Upgrade when it pays for itself.',
            sub: 'Monthly billing, cancel any time.',
            perMonth: '/month',
            popular: 'Most popular',
            tiers: [
                { name: 'Free', price: '$0', body: 'Dashboard, live charts, watchlist and price alerts.', cta: 'Start free' },
                { name: 'Pro', price: '$99', body: 'Options desk, strategy builder, AI analyst and 20 backtest reports a month.', cta: 'Choose Pro' },
                { name: 'Elite', price: '$199', body: 'Everything in Pro, unlimited backtests, IV surface, gamma exposure and unusual flow.', cta: 'Choose Elite' },
            ],
        },
        data: {
            kicker: 'Data',
            title: 'Where the numbers come from.',
            items: [
                { label: 'Stock charts', value: 'Live, from TradingView' },
                { label: 'Option chains and Greeks', value: 'Exchange data, as of the last close' },
                { label: 'Backtests', value: '13 years of exchange history' },
            ],
            note: 'Market analytics software. Not investment advice and not a broker: no trades are placed on your behalf.',
        },
        cta: { title: 'Your next trade deserves a second opinion.', button: 'Start free' },
        footer: { tagline: 'Options research and backtesting with an AI analyst.', terms: 'Terms', help: 'Help', rights: 'HIVRA Finance', source: 'Source code (AGPL-3.0)' },
    },
    es: {
        nav: { product: 'Producto', plans: 'Planes', data: 'Datos', signIn: 'Entrar', start: 'Empezar' },
        hero: {
            title: ['Análisis de opciones,', 'con un analista de IA.'],
            sub: 'Arma estrategias de opciones, pruébalas sobre años de datos reales de la bolsa y recibe la lectura de la IA antes de poner tu dinero.',
            primary: 'Empieza gratis',
            secondary: 'Ver planes',
        },
        inside: {
            kicker: 'Qué incluye',
            title: 'La mesa que un trader de verdad usa.',
            sub: 'Gráficas, cadenas de opciones, estrategias, backtests y un analista de IA en una sola pantalla.',
            features: [
                { title: 'Mesa de opciones', body: 'Cadenas al cierre con griegas y volatilidad implícita de opciones sobre acciones, ETF e índices de EE. UU., strike por strike.' },
                { title: 'Constructor de estrategias', body: 'Spreads, straddles, cóndores y patas a la medida, con la gráfica de ganancia y los puntos de equilibrio antes de operar.' },
                { title: 'Backtests en reporte', body: 'Corre una estrategia sobre 13 años de historia y recibe un reporte: ganancia, tasa de acierto, caída máxima, curva y cada operación.' },
                { title: 'Analista de IA', body: 'Pregunta por un ticker o una estrategia y recibe una lectura escrita del escenario, los riesgos y lo que dicen los números.' },
                { title: 'Volatilidad y gamma', body: 'Superficie y sonrisa de volatilidad, y exposición gamma por strike, para ver dónde está anclado el mercado.' },
                { title: 'Gráficas en vivo', body: 'Velas de TradingView con indicadores y herramientas de dibujo, más lista de seguimiento y alertas de precio.' },
            ],
        },
        plans: {
            kicker: 'Planes',
            title: 'Empieza gratis. Sube de plan cuando se pague solo.',
            sub: 'Pago mensual, cancela cuando quieras.',
            perMonth: '/mes',
            popular: 'El más elegido',
            tiers: [
                { name: 'Gratis', price: '$0', body: 'Panel, gráficas en vivo, lista de seguimiento y alertas de precio.', cta: 'Empieza gratis' },
                { name: 'Pro', price: '$99', body: 'Mesa de opciones, constructor de estrategias, analista de IA y 20 reportes de backtest al mes.', cta: 'Elegir Pro' },
                { name: 'Elite', price: '$199', body: 'Todo lo de Pro, backtests ilimitados, superficie de volatilidad, exposición gamma y flujo inusual.', cta: 'Elegir Elite' },
            ],
        },
        data: {
            kicker: 'Datos',
            title: 'De dónde salen los números.',
            items: [
                { label: 'Gráficas de acciones', value: 'En vivo, de TradingView' },
                { label: 'Cadenas de opciones y griegas', value: 'Datos de la bolsa, al último cierre' },
                { label: 'Backtests', value: '13 años de historia de la bolsa' },
            ],
            note: 'Software de análisis de mercado. No es asesoría de inversión ni un bróker: no se ejecutan operaciones a tu nombre.',
        },
        cta: { title: 'Tu próxima operación merece una segunda opinión.', button: 'Empieza gratis' },
        footer: { tagline: 'Análisis de opciones y backtests con un analista de IA.', terms: 'Términos', help: 'Ayuda', rights: 'HIVRA Finance', source: 'Código fuente (AGPL-3.0)' },
    },
} as const;

export type LandingCopy = (typeof LANDING_COPY)[LandingLang];

// Spanish for a visitor whose browser asks for it first, English otherwise.
export function landingLang(acceptLanguage: string | null | undefined): LandingLang {
    const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
    return first.startsWith('es') ? 'es' : 'en';
}
