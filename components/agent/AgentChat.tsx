'use client';

// The AI analyst chat, styled like the HIVRA Copilot: a top bar with the credits meter, a centred
// greeting with suggestion pills and a large composer, "Active conversations" under it; inside a
// conversation the agent's replies sit under a blue name label (no bubble), the user's are
// right-aligned bubbles, and tool use folds into "Done · N steps".
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslations } from 'next-intl';
import { ArrowUp, Check, ChevronRight, CandlestickChart, FlaskConical, Loader2, MessageCircle, Plus, Sigma, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { role: 'user' | 'assistant'; text: string; tools?: string[] };
type ThreadRow = { id: string; title: string; symbol?: string; updatedAt: string };

const TOOL_KEYS = ['get_technicals', 'get_option_chain', 'analyze_option_strategy', 'backtest_stock', 'backtest_options', 'get_market_signals', 'web_search'] as const;
const SUGGEST_ICONS = [CandlestickChart, Sigma, FlaskConical];

const kfmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

export default function AgentChat({ symbol, compact = false, initialThreadId, initialQuestion, firstName }: {
    symbol?: string; compact?: boolean; initialThreadId?: string; initialQuestion?: string; firstName?: string;
}) {
    const t = useTranslations('Agent');
    const [items, setItems] = useState<Item[]>([]);
    const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [input, setInput] = useState(initialQuestion ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noCredits, setNoCredits] = useState(false);
    const [meter, setMeter] = useState<{ used: number; allowance: number | null } | null>(null);
    const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
    const endRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadList = useCallback(async () => {
        const r = await fetch('/api/agent', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        setThreads(j.threads ?? []);
        setMeter({ used: j.used, allowance: j.allowance });
    }, []);

    const openThread = useCallback(async (id: string) => {
        const r = await fetch(`/api/agent?id=${id}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        setThreadId(id); setItems(j.items ?? []); setError(null); setOpenSteps({});
    }, []);

    useEffect(() => { loadList(); if (initialThreadId) openThread(initialThreadId); }, [loadList, openThread, initialThreadId]);
    useEffect(() => {
        if (!items.length) return;
        if (compact) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
        else endRef.current?.scrollIntoView({ block: 'end' });
    }, [items, compact]);

    const toolLabel = (name: string) => (TOOL_KEYS as readonly string[]).includes(name) ? t(`tools.${name as (typeof TOOL_KEYS)[number]}`) : name;

    async function send(text: string) {
        const message = text.trim();
        if (!message || busy) return;
        setBusy(true); setError(null); setInput('');
        setItems((xs) => [...xs, { role: 'user', text: message }, { role: 'assistant', text: '' }]);
        const patch = (fn: (last: Item) => Item) => setItems((xs) => [...xs.slice(0, -1), fn(xs.at(-1)!)]);
        try {
            const res = await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId, message, symbol }) });
            if (!res.ok || !res.body) {
                const j = await res.json().catch(() => ({}));
                if (res.status === 402) { setNoCredits(true); setInput(message); } else setError(j.error ?? t('error'));
                setItems((xs) => xs.slice(0, -1));
                return;
            }
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                let nl;
                while ((nl = buf.indexOf('\n')) >= 0) {
                    const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
                    if (!line.trim()) continue;
                    const ev = JSON.parse(line);
                    if (ev.type === 'thread') setThreadId(ev.id);
                    else if (ev.type === 'text') patch((l) => ({ ...l, text: l.text + ev.text }));
                    else if (ev.type === 'tool') patch((l) => ({ ...l, tools: [...(l.tools ?? []), ev.name] }));
                    else if (ev.type === 'done') setMeter({ used: ev.used, allowance: ev.allowance });
                    else if (ev.type === 'error') setError(ev.message);
                }
            }
            loadList();
        } catch {
            setError(t('error'));
        } finally {
            setBusy(false);
        }
    }

    function newChat() { setThreadId(undefined); setItems([]); setError(null); setOpenSteps({}); }

    const suggestions = symbol
        ? [t('suggest.read', { symbol }), t('suggest.options', { symbol }), t('suggest.backtest', { symbol })]
        : [t('suggest.general1'), t('suggest.general2'), t('suggest.general3')];

    // ── pieces ───────────────────────────────────────────────────────────────
    const out = noCredits || (meter != null && meter.allowance != null && meter.used >= meter.allowance);
    const creditsBanner = out ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-canvas/60 px-3 py-2.5">
            <span className="flex-1 text-[13px]">{t('outTitle')}</span>
            <Link href="/billing" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[12.5px] font-semibold text-on-brand"><Plus className="size-3.5" />{t('addCredits')}</Link>
        </div>
    ) : null;

    const composer = (big: boolean) => (
        <>{creditsBanner}<form onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="rounded-2xl border border-line bg-canvas/60 p-2 shadow-sm focus-within:border-line-strong">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={big ? 2 : 1}
                maxLength={4000}
                placeholder={symbol ? t('placeholderSymbol', { symbol }) : t('placeholder')}
                className="block w-full resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-faint"
            />
            <div className="mt-1 flex items-center gap-1.5">
                {symbol && <span className="mono rounded-full border border-line px-2.5 py-1 text-[12px] text-muted-foreground">{symbol}</span>}
                {meter && compact && (
                    <span className="num text-[11.5px] text-faint">{meter.allowance == null ? t('creditsUnlimited', { used: kfmt(meter.used) }) : t('credits', { used: kfmt(meter.used), allowance: kfmt(meter.allowance) })}</span>
                )}
                <button type="submit" disabled={busy || !input.trim()} aria-label={t('send')}
                    className="ms-auto grid size-8 place-items-center rounded-full bg-brand text-on-brand transition-opacity disabled:opacity-40">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </button>
            </div>
        </form></>
    );

    const messages = (
        <div className="flex flex-col gap-4">
            {items.map((it, i) => it.role === 'user' ? (
                <div key={i} className="flex justify-end">
                    <p className="max-w-[80%] rounded-xl border border-line bg-hover/60 px-3.5 py-2 text-[14px] whitespace-pre-wrap">{it.text}</p>
                </div>
            ) : (
                <div key={i} className="flex flex-col gap-1">
                    <span className="text-[12.5px] font-semibold text-brand-ink">{t('agentName')}</span>
                    {it.tools?.length ? (
                        <div>
                            <button type="button" onClick={() => setOpenSteps((s) => ({ ...s, [i]: !s[i] }))}
                                className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
                                {busy && i === items.length - 1 && !it.text
                                    ? <><Loader2 className="size-3 animate-spin" />{toolLabel(it.tools.at(-1)!)}…</>
                                    : <><Check className="size-3" />{t('done')}</>}
                                <span className="text-faint">· {t('steps', { n: it.tools.length })}</span>
                                <ChevronRight className={cn('size-3 transition-transform', openSteps[i] && 'rotate-90')} />
                            </button>
                            {openSteps[i] && (
                                <ul className="mt-1 ms-4 flex flex-col gap-0.5 text-[12px] text-muted-foreground">
                                    {it.tools.map((n, j) => <li key={j}>{toolLabel(n)}</li>)}
                                </ul>
                            )}
                        </div>
                    ) : null}
                    {it.text ? (
                        <div className="agent-md text-[14px] leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{it.text}</ReactMarkdown>
                        </div>
                    ) : busy && i === items.length - 1 && !it.tools?.length ? (
                        <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{t('thinking')}</p>
                    ) : null}
                </div>
            ))}
            {error && <p className="text-[13px] text-down">{error}</p>}
            <div ref={endRef} />
        </div>
    );

    // ── stock-page panel ─────────────────────────────────────────────────────
    if (compact) {
        return (
            <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s, i) => {
                            const Icon = SUGGEST_ICONS[i] ?? Sparkles;
                            return (
                                <button key={s} type="button" onClick={() => send(s)} disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-start text-[12.5px] hover:bg-hover">
                                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />{s}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div ref={scrollRef} className="max-h-[480px] overflow-y-auto pe-1">{messages}</div>
                )}
                {composer(false)}
                <div className="flex items-center justify-between text-[11.5px] text-faint">
                    <span>{t('disclaimer')}</span>
                    <Link href={threadId ? `/agent?thread=${threadId}` : `/agent?symbol=${symbol ?? ''}`} className="inline-flex shrink-0 items-center gap-1 text-brand-ink hover:underline">
                        {t('openFull')}<ChevronRight className="size-3" />
                    </Link>
                </div>
            </div>
        );
    }

    // ── full page ────────────────────────────────────────────────────────────
    const pct = meter && meter.allowance ? Math.min(meter.used / meter.allowance, 1) * 100 : 0;
    return (
        <div className="flex min-h-[calc(100dvh-7rem)] flex-col">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
                <span className="text-[14px] font-semibold">{t('pageTitle')}</span>
                {meter && (
                    <div className="flex min-w-48 flex-1 flex-col gap-1 sm:max-w-80">
                        <span className="num text-[12px]">
                            {meter.allowance == null
                                ? t('creditsUnlimited', { used: kfmt(meter.used) })
                                : <><b>{kfmt(meter.used)}</b> / {kfmt(meter.allowance)} {t('creditsWord')}</>}
                        </span>
                        <span className="h-1 overflow-hidden rounded-full bg-hover"><span className="block h-full rounded-full bg-brand" style={{ width: `${meter.allowance == null ? 2 : Math.max(pct, 2)}%` }} /></span>
                    </div>
                )}
                {meter && meter.allowance != null && (
                    <Link href="/billing" className="text-[12.5px] font-medium text-brand-ink hover:underline">{t('addCredits')}</Link>
                )}
                {items.length > 0 && (
                    <button type="button" onClick={newChat} className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12.5px] hover:bg-hover">
                        <Plus className="size-3.5" />{t('newChat')}
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col pt-[8vh]">
                    <p className="text-center text-[11.5px] font-semibold tracking-[0.14em] text-brand-ink uppercase">{t('eyebrow')}</p>
                    <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">{firstName ? t('greetingName', { name: firstName }) : t('greeting')}</h1>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {suggestions.map((s, i) => {
                            const Icon = SUGGEST_ICONS[i] ?? Sparkles;
                            return (
                                <button key={s} type="button" onClick={() => send(s)} disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] hover:bg-hover">
                                    <Icon className="size-3.5 text-muted-foreground" />{s}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-5">{composer(true)}</div>
                    <p className="mt-2 text-center text-[11.5px] text-faint">{t('disclaimer')}</p>

                    {threads.length > 0 && (
                        <div className="mt-8">
                            <p className="mb-2 text-[11.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{t('activeConversations')}</p>
                            <ul className="flex flex-col">
                                {threads.slice(0, 8).map((th) => (
                                    <li key={th.id}>
                                        <button type="button" onClick={() => openThread(th.id)} className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-start hover:bg-hover">
                                            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line"><MessageCircle className="size-4 text-muted-foreground" /></span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[13.5px]">{th.symbol && <span className="mono me-1.5 text-brand-ink">{th.symbol}</span>}{th.title}</span>
                                                <span className="block text-[12px] text-muted-foreground">{t('continue')}</span>
                                            </span>
                                            <ChevronRight className="size-4 text-faint" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="mx-auto w-full max-w-[600px] flex-1 py-5">{messages}</div>
                    <div className="sticky bottom-0 mx-auto w-full max-w-[600px] bg-page pb-3 pt-2">{composer(false)}</div>
                </>
            )}
        </div>
    );
}
