// Landing copy, English and Spanish. Every visible string on the marketing home lives here so the two
// languages stay in step: add a key to both or the parity test fails.

export type LandingLang = 'en' | 'es';

export const LANDING_COPY = {
    en: {
        nav: { product: 'Product', plans: 'Plans', data: 'Data', signIn: 'Sign in', start: 'Get started' },
        hero: {
            title: ['Stock & options research,', 'with an AI analyst.'],
            sub: 'Read any chart in seconds, build option strategies and test your ideas on years of market history. Then get a plain-language read from the AI before you put money on the line.',
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
                { title: 'Backtests as reports', body: 'Run a strategy on daily prices since 2018 and get a report: P&L, win rate, drawdown, equity curve and every trade.' },
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
                { name: 'Free', price: '$0', body: 'Dashboard, live charts, watchlist, price alerts, a taste of the AI analyst and 3 backtests a month.', cta: 'Start free' },
                { name: 'Pro', price: '$99', body: 'Options desk and strategy builder, the AI analyst with 50,000 credits a month, and 20 backtest reports a month.', cta: 'Get Pro' },
                { name: 'Elite', price: '$199', body: 'Everything in Pro, 150,000 AI credits a month and unlimited backtests.', cta: 'Get Elite' },
            ],
        },
        data: {
            kicker: 'Data',
            title: 'Where the numbers come from.',
            items: [
                { label: 'Stock charts', value: 'Live, from TradingView' },
                { label: 'Option chains and Greeks', value: 'Exchange data, as of the last close' },
                { label: 'Backtests', value: 'Daily prices since 2018' },
            ],
            note: 'Market analytics software. Not investment advice and not a broker: no trades are placed on your behalf.',
        },
        cta: { title: 'Your next trade deserves a second opinion.', button: 'Start free' },
        footer: { tagline: 'Options research and backtesting with an AI analyst.', terms: 'Terms', help: 'Help', rights: 'HIVRA Finance', source: 'Source code (AGPL-3.0)' },
    },
    es: {
        nav: { product: 'Producto', plans: 'Planes', data: 'Datos', signIn: 'Entrar', start: 'Empezar' },
        hero: {
            title: ['Análisis de acciones y opciones,', 'con un analista de IA.'],
            sub: 'Lee cualquier gráfica en segundos, arma estrategias de opciones y prueba tus ideas sobre años de historia del mercado. Luego recibe la lectura de la IA, en palabras simples, antes de poner tu dinero.',
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
                { title: 'Backtests en reporte', body: 'Corre una estrategia sobre precios diarios desde 2018 y recibe un reporte: ganancia, tasa de acierto, caída máxima, curva y cada operación.' },
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
                { name: 'Gratis', price: '$0', body: 'Panel, gráficas en vivo, lista de seguimiento, alertas de precio, una prueba del analista de IA y 3 backtests al mes.', cta: 'Empieza gratis' },
                { name: 'Pro', price: '$99', body: 'Mesa de opciones y constructor de estrategias, el analista de IA con 50.000 créditos al mes y 20 reportes de backtest al mes.', cta: 'Quiero Pro' },
                { name: 'Elite', price: '$199', body: 'Todo lo de Pro, 150.000 créditos de IA al mes y backtests ilimitados.', cta: 'Quiero Elite' },
            ],
        },
        data: {
            kicker: 'Datos',
            title: 'De dónde salen los números.',
            items: [
                { label: 'Gráficas de acciones', value: 'En vivo, de TradingView' },
                { label: 'Cadenas de opciones y griegas', value: 'Datos de la bolsa, al último cierre' },
                { label: 'Backtests', value: 'Precios diarios desde 2018' },
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
