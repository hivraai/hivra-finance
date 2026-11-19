'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslations } from 'next-intl';
import { ArrowUp, Loader2, Plus, Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { role: 'user' | 'assistant'; text: string; tools?: string[] };
type ThreadRow = { id: string; title: string; symbol?: string; updatedAt: string };

const TOOL_KEYS = ['get_technicals', 'get_option_chain', 'analyze_option_strategy', 'backtest_stock', 'backtest_options', 'web_search'] as const;

export default function AgentChat({ symbol, compact = false, initialThreadId, initialQuestion }: { symbol?: string; compact?: boolean; initialThreadId?: string; initialQuestion?: string }) {
    const t = useTranslations('Agent');
    const [items, setItems] = useState<Item[]>([]);
    const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [input, setInput] = useState(initialQuestion ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meter, setMeter] = useState<{ used: number; allowance: number | null } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

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
        setThreadId(id); setItems(j.items ?? []); setError(null);
    }, []);

    useEffect(() => { loadList(); if (initialThreadId) openThread(initialThreadId); }, [loadList, openThread, initialThreadId]);
    useEffect(() => { if (!compact || items.length) endRef.current?.scrollIntoView({ block: 'end' }); }, [items, compact]);

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
                setError(j.error ?? t('error'));
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

    const suggestions = symbol
        ? [t('suggest.read', { symbol }), t('suggest.options', { symbol }), t('suggest.backtest', { symbol })]
        : [t('suggest.general1'), t('suggest.general2'), t('suggest.general3')];

    const chat = (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto', compact ? 'max-h-[520px]' : '')}>
                {items.length === 0 && (
                    <div className="flex flex-col gap-3 py-2">
                        <p className="text-[13px] text-muted-foreground">{symbol ? t('introSymbol', { symbol }) : t('intro')}</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button key={s} type="button" className="btn btn-ghost h-auto py-1.5 text-start text-[13px]" onClick={() => send(s)} disabled={busy}>{s}</button>
                            ))}
                        </div>
                    </div>
                )}
                {items.map((it, i) => (
                    <div key={i} className={cn('flex flex-col gap-1.5', it.role === 'user' && 'items-end')}>
                        {it.tools?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {it.tools.map((name, j) => (
                                    <span key={j} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] text-brand-ink"><Wrench className="size-3" />{toolLabel(name)}</span>
                                ))}
                            </div>
                        ) : null}
                        {it.role === 'user' ? (
                            <p className="max-w-[85%] rounded-2xl bg-hover px-3.5 py-2 text-[14px] whitespace-pre-wrap">{it.text}</p>
                        ) : it.text ? (
                            <div className="agent-md text-[14px] leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{it.text}</ReactMarkdown></div>
                        ) : busy && i === items.length - 1 ? (
                            <p className="flex items-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t('thinking')}</p>
                        ) : null}
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            {error && <p className="mt-2 text-[13px] text-down">{error}</p>}

            <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                    rows={compact ? 2 : 3}
                    maxLength={4000}
                    placeholder={symbol ? t('placeholderSymbol', { symbol }) : t('placeholder')}
                    className="min-h-0 flex-1 resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                />
                <button type="submit" className="btn btn-primary h-10 w-10 p-0" disabled={busy || !input.trim()} aria-label={t('send')}>
                    {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                </button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px] text-faint">
                <span>{t('disclaimer')}</span>
                {meter && <span className="num shrink-0">{meter.allowance == null ? t('creditsUnlimited', { used: meter.used.toLocaleString() }) : t('credits', { used: meter.used.toLocaleString(), allowance: meter.allowance.toLocaleString() })}</span>}
            </div>
        </div>
    );

    if (compact) {
        return (
            <div className="flex flex-col">
                {chat}
                <Link href={threadId ? `/agent?thread=${threadId}` : '/agent'} className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-brand-ink hover:underline"><Sparkles className="size-3.5" />{t('openFull')}</Link>
            </div>
        );
    }

    return (
        <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-1">
                <button type="button" className="btn btn-ghost justify-start" onClick={() => { setThreadId(undefined); setItems([]); setError(null); }}>
                    <Plus /> {t('newChat')}
                </button>
                <div className="flex flex-col gap-0.5 overflow-y-auto">
                    {threads.map((th) => (
                        <button key={th.id} type="button" onClick={() => openThread(th.id)}
                            className={cn('truncate rounded-lg px-2.5 py-1.5 text-start text-[13px] hover:bg-hover', th.id === threadId && 'bg-hover text-foreground')}>
                            {th.symbol && <span className="mono me-1.5 text-brand-ink">{th.symbol}</span>}{th.title}
                        </button>
                    ))}
                </div>
            </aside>
            <div className="card flex min-h-0 flex-col">{chat}</div>
        </div>
    );
}
