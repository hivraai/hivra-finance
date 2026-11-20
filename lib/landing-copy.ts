// Landing copy, English and Spanish. Every visible string on the marketing home lives here so the two
// languages stay in step: add a key to both or the parity test fails.

export type LandingLang = 'en' | 'es';

export const LANDING_COPY = {
    en: {
        nav: { product: 'Product', plans: 'Plans', data: 'Data', signIn: 'Sign in', start: 'Get started' },
        hero: {
            title: ['Stock & options research,', 'powered by AI agents.'],
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
        facts: [
            { value: '2018', label: 'Daily price history for backtests' },
            { value: 'Greeks + IV', label: 'On every US stock, ETF and index option' },
            { value: '3 tools', label: 'Options desk, backtests and AI analyst' },
            { value: '$0', label: 'To start, no card needed' },
        ],
        how: {
            kicker: 'How it works',
            title: 'From idea to tested trade in minutes.',
            sub: 'No spreadsheets, no five tabs open. One place to look, build and check.',
            steps: [
                { title: 'Pick a ticker', body: 'Search any US stock or ETF. See the chart, the option chain and the news in one tab.' },
                { title: 'Build the trade', body: 'Choose a strategy or click strikes on the chain. The payoff, break-evens and Greeks update as you go.' },
                { title: 'Test it, then ask', body: 'Run it on years of history and ask the AI analyst what could go wrong before you put money in.' },
            ],
        },
        showcase: {
            kicker: 'A closer look',
            title: 'Built for the questions traders actually ask.',
            example: 'Example',
            chain: { call: 'Call', put: 'Put', strike: 'Strike', move: 'Expected move' },
            backtest: {
                name: 'Covered call · SPY · 2018–today',
                stats: [
                    { label: 'Return', value: '+38%' },
                    { label: 'Win rate', value: '74%' },
                    { label: 'Max drawdown', value: '-19%' },
                    { label: 'Trades', value: '92' },
                ],
            },
            ai: {
                label: 'Ask the AI analyst',
                questions: [
                    'Is NVDA option premium expensive right now?',
                    'What does this iron condor lose if TSLA gaps 10%?',
                    'Compare selling puts on AAPL vs MSFT this month.',
                    'Explain this backtest drawdown in plain words.',
                ],
            },
            items: [
                { kicker: 'Options desk', title: 'Every strike, with the numbers that matter.', body: 'Bid, ask, implied volatility and delta for calls and puts, the expected move for each expiry, and one click to add a leg to your strategy.', points: ['Chains for US stocks, ETFs and index options', 'Implied volatility and Greeks on every contract', 'Expected move per expiry, at a glance'] },
                { kicker: 'Backtests', title: 'See how an idea did before you risk money on it.', body: 'Run a strategy on daily prices since 2018 and get a report you can read: return, win rate, drawdown, the equity curve and every trade.', points: ['Stocks, ETFs and option strategies', 'Every trade listed, not just a total', 'Equity curve and drawdown chart'] },
                { kicker: 'AI analyst', title: 'A second opinion that reads the numbers for you.', body: 'Ask in plain words. The analyst looks at the chart, the chain, the volatility and your backtest, and writes back what it sees and what could go wrong.', points: ['Answers grounded in the data on your screen', 'Explains risk in plain language', 'English, Spanish and Arabic'] },
            ],
        },
        audience: {
            kicker: 'Who it is for',
            title: 'For people who trade their own money.',
            items: [
                { title: 'Options traders', body: 'Find the strike, size the risk and check the payoff before you send the order to your broker.' },
                { title: 'Swing and position traders', body: 'Test the rule you trade by on years of data instead of the last few weeks you remember.' },
                { title: 'People learning to invest', body: 'Ask why, in plain words. The analyst explains a chart, an option or a result without the jargon.' },
            ],
        },
        faq: {
            kicker: 'FAQ',
            title: 'Questions, answered.',
            sub: 'Anything else: hello@hivra.ai',
            items: [
                { q: 'Is this investment advice?', a: 'No. HIVRA Finance is analytics software. It shows data and analysis to help you decide; the decision and the trade are always yours.' },
                { q: 'Do you place trades or hold my money?', a: 'No. We are not a broker and never connect to your brokerage account. You trade wherever you already do.' },
                { q: 'Where does the data come from?', a: 'Live stock charts from TradingView, option chains and Greeks from exchange data as of the last close, and daily prices since 2018 for backtests.' },
                { q: 'What are AI credits?', a: 'Each question to the AI analyst uses credits based on how much work it does. Every plan includes a monthly amount, and you can buy more any time; bought credits never expire.' },
                { q: 'Can I cancel any time?', a: 'Yes. Plans are monthly. Cancel from the Billing page and you keep your plan until the end of the period.' },
                { q: 'Is there a free plan?', a: 'Yes. The dashboard, live charts, watchlist, alerts, a taste of the AI analyst and 3 backtests a month are free, with no card.' },
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
        footer: { tagline: 'Stock and options research, market signals and backtests, powered by AI agents.', community: 'Members get a private WhatsApp community to trade ideas with other traders.', product: 'Product', resources: 'Resources', legal: 'Legal', plans: 'Pricing', options: 'Options desk', signals: 'Market signals', agent: 'AI agents', backtest: 'Backtests', terms: 'Terms', privacy: 'Privacy', help: 'Help', signIn: 'Sign in', rights: 'HIVRA Finance', source: 'Source code (AGPL-3.0)', risk: 'Not financial advice. Options trading involves substantial risk of loss. Past flow signals do not guarantee future results.' },
    },
    es: {
        nav: { product: 'Producto', plans: 'Planes', data: 'Datos', signIn: 'Entrar', start: 'Empezar' },
        hero: {
            title: ['Análisis de acciones y opciones,', 'impulsado por agentes de IA.'],
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
        facts: [
            { value: '2018', label: 'Historia de precios diarios para backtests' },
            { value: 'Griegas + IV', label: 'En cada opción de acciones, ETF e índices de EE. UU.' },
            { value: '3 herramientas', label: 'Mesa de opciones, backtests y analista de IA' },
            { value: '$0', label: 'Para empezar, sin tarjeta' },
        ],
        how: {
            kicker: 'Cómo funciona',
            title: 'De la idea a una operación probada en minutos.',
            sub: 'Sin hojas de cálculo ni cinco pestañas abiertas. Un solo lugar para ver, armar y comprobar.',
            steps: [
                { title: 'Elige una acción', body: 'Busca cualquier acción o ETF de EE. UU. Ve la gráfica, la cadena de opciones y las noticias en una pestaña.' },
                { title: 'Arma la operación', body: 'Elige una estrategia o haz clic en los strikes. La ganancia, los puntos de equilibrio y las griegas se actualizan al momento.' },
                { title: 'Pruébala y pregunta', body: 'Córrela sobre años de historia y pregúntale al analista de IA qué puede salir mal antes de poner tu dinero.' },
            ],
        },
        showcase: {
            kicker: 'De cerca',
            title: 'Hecho para las preguntas que un trader se hace.',
            example: 'Ejemplo',
            chain: { call: 'Call', put: 'Put', strike: 'Strike', move: 'Movimiento esperado' },
            backtest: {
                name: 'Covered call · SPY · 2018–hoy',
                stats: [
                    { label: 'Retorno', value: '+38%' },
                    { label: 'Acierto', value: '74%' },
                    { label: 'Caída máx.', value: '-19%' },
                    { label: 'Operaciones', value: '92' },
                ],
            },
            ai: {
                label: 'Pregúntale al analista de IA',
                questions: [
                    '¿Están caras las opciones de NVDA ahora?',
                    '¿Cuánto pierde este iron condor si TSLA abre 10% abajo?',
                    'Compara vender puts de AAPL vs MSFT este mes.',
                    'Explícame la caída de este backtest en palabras simples.',
                ],
            },
            items: [
                { kicker: 'Mesa de opciones', title: 'Cada strike, con los números que importan.', body: 'Bid, ask, volatilidad implícita y delta de calls y puts, el movimiento esperado de cada vencimiento y un clic para sumar una pata a tu estrategia.', points: ['Cadenas de acciones, ETF e índices de EE. UU.', 'Volatilidad implícita y griegas en cada contrato', 'Movimiento esperado por vencimiento, de un vistazo'] },
                { kicker: 'Backtests', title: 'Mira cómo le fue a una idea antes de arriesgar dinero.', body: 'Corre una estrategia sobre precios diarios desde 2018 y recibe un reporte que se entiende: retorno, acierto, caída máxima, la curva y cada operación.', points: ['Acciones, ETF y estrategias de opciones', 'Cada operación listada, no solo el total', 'Curva de capital y gráfica de caídas'] },
                { kicker: 'Analista de IA', title: 'Una segunda opinión que lee los números por ti.', body: 'Pregunta en palabras simples. El analista mira la gráfica, la cadena, la volatilidad y tu backtest, y te escribe lo que ve y lo que puede salir mal.', points: ['Respuestas basadas en los datos de tu pantalla', 'Explica el riesgo sin tecnicismos', 'Español, inglés y árabe'] },
            ],
        },
        audience: {
            kicker: 'Para quién es',
            title: 'Para quien invierte su propio dinero.',
            items: [
                { title: 'Traders de opciones', body: 'Encuentra el strike, mide el riesgo y revisa la ganancia antes de mandar la orden a tu bróker.' },
                { title: 'Swing y largo plazo', body: 'Prueba la regla con la que operas sobre años de datos, no sobre las últimas semanas que recuerdas.' },
                { title: 'Quien está aprendiendo', body: 'Pregunta por qué, en palabras simples. El analista explica una gráfica, una opción o un resultado sin jerga.' },
            ],
        },
        faq: {
            kicker: 'Preguntas',
            title: 'Preguntas frecuentes.',
            sub: 'Cualquier otra: hello@hivra.ai',
            items: [
                { q: '¿Esto es asesoría de inversión?', a: 'No. HIVRA Finance es software de análisis. Muestra datos y análisis para ayudarte a decidir; la decisión y la operación siempre son tuyas.' },
                { q: '¿Ejecutan operaciones o guardan mi dinero?', a: 'No. No somos un bróker y nunca nos conectamos a tu cuenta de inversión. Operas donde ya lo haces.' },
                { q: '¿De dónde salen los datos?', a: 'Gráficas en vivo de TradingView, cadenas de opciones y griegas de datos de bolsa al último cierre, y precios diarios desde 2018 para los backtests.' },
                { q: '¿Qué son los créditos de IA?', a: 'Cada pregunta al analista usa créditos según el trabajo que hace. Cada plan incluye una cantidad al mes y puedes comprar más cuando quieras; los comprados no vencen.' },
                { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Los planes son mensuales. Cancela desde Facturación y conservas tu plan hasta el fin del periodo.' },
                { q: '¿Hay un plan gratis?', a: 'Sí. El panel, las gráficas en vivo, la lista, las alertas, una prueba del analista de IA y 3 backtests al mes son gratis, sin tarjeta.' },
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
        footer: { tagline: 'Análisis de acciones y opciones, señales de mercado y backtests, impulsado por agentes de IA.', community: 'Los miembros tienen una comunidad privada en WhatsApp para compartir ideas con otros traders.', product: 'Producto', resources: 'Recursos', legal: 'Legal', plans: 'Precios', options: 'Mesa de opciones', signals: 'Señales de mercado', agent: 'Agentes de IA', backtest: 'Backtests', terms: 'Términos', privacy: 'Privacidad', help: 'Ayuda', signIn: 'Iniciar sesión', rights: 'HIVRA Finance', source: 'Código fuente (AGPL-3.0)', risk: 'No es asesoría financiera. Operar opciones implica un riesgo sustancial de pérdida. Las señales de flujo pasadas no garantizan resultados futuros.' },
    },
} as const;

export type LandingCopy = (typeof LANDING_COPY)[LandingLang];

// Spanish for a visitor whose browser asks for it first, English otherwise.
export function landingLang(acceptLanguage: string | null | undefined): LandingLang {
    const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
    return first.startsWith('es') ? 'es' : 'en';
}
