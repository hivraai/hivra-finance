'use client';

// The list kit for every signal screen: search, click-to-sort headers, a filter per column that
// has one, and CSV export. Rows arrive already shaped by lib/signals/views.ts.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, Download, ExternalLink, Search, X } from 'lucide-react';
import type { Col, ColType, Row } from '@/lib/signals/views';
import { formatCell } from '@/lib/signals/format';
import { cn } from '@/lib/utils';

const numeric = (t: ColType) => t === 'money' || t === 'pct' || t === 'num';

export default function SignalTable({ cols, rows, defaultSort, chartHref }: {
    cols: Col[]; rows: Row[]; defaultSort: { key: string; dir: 'asc' | 'desc' };
    chartHref?: boolean; // tickers link to the stock page
}) {
    const t = useTranslations('Signals');
    // Column keys and data values are dynamic; missing ones fall back to the raw text.
    const tk = t as unknown as { (k: string): string; has: (k: string) => boolean };
    const [q, setQ] = useState('');
    const [sort, setSort] = useState(defaultSort);
    const [filters, setFilters] = useState<Record<string, string>>({});

    const label = (key: string) => (tk.has(`col.${key}`) ? tk(`col.${key}`) : key);
    const val = (v: string) => (tk.has(`val.${v}`) ? tk(`val.${v}`) : v);

    const options = useMemo(() => Object.fromEntries(cols.filter((c) => c.filter).map((c) => [c.key,
        [...new Set(rows.map((r) => r[c.key]).filter((x): x is string | number => x != null && x !== ''))].map(String).sort()])), [cols, rows]);

    const shown = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const out = rows.filter((r) => Object.entries(filters).every(([k, v]) => !v || String(r[k] ?? '') === v)
            && (!needle || cols.some((c) => String(r[c.key] ?? '').toLowerCase().includes(needle))));
        return out.sort((a, b) => {
            const x = a[sort.key], y = b[sort.key];
            if (x == null) return 1; if (y == null) return -1;
            const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
            return sort.dir === 'asc' ? c : -c;
        });
    }, [rows, cols, q, filters, sort]);

    const toggleSort = (key: string, type: ColType) => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: numeric(type) ? 'desc' : 'asc' });

    function csv() {
        const esc = (x: unknown) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
        const body = [cols.map((c) => esc(label(c.key))).join(','), ...shown.map((r) => cols.map((c) => esc(r[c.key])).join(','))].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
        a.download = 'hivra-signals.csv';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const active = Object.values(filters).filter(Boolean).length;

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-[220px] flex-1">
                    <span className="sr-only">{t('search')}</span>
                    <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} className="input-like ps-8" />
                </label>
                {cols.filter((c) => c.filter && (options[c.key]?.length ?? 0) > 1).map((c) => (
                    <label key={c.key} className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <span className="sr-only">{label(c.key)}</span>
                        <select value={filters[c.key] ?? ''} onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                            className="input-like w-auto max-w-[200px] pe-7">
                            <option value="">{label(c.key)}: {t('all')}</option>
                            {options[c.key].map((o) => <option key={o} value={o}>{val(o)}</option>)}
                        </select>
                    </label>
                ))}
                {active > 0 && (
                    <button type="button" onClick={() => setFilters({})} className="btn btn-ghost h-9 text-[13px]"><X />{t('clear')}</button>
                )}
                <button type="button" onClick={csv} className="btn btn-ghost h-9 text-[13px]"><Download />CSV</button>
            </div>
            <p className="text-[12px] text-faint">{t('count', { shown: shown.length, total: rows.length })}</p>
            <div className="card overflow-x-auto p-0">
                <table className="data-table text-[13.5px]">
                    <thead>
                        <tr>
                            {cols.map((c) => (
                                <th key={c.key} className={cn(numeric(c.type) && 'is-num')} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                    <button type="button" onClick={() => toggleSort(c.key, c.type)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                                        {label(c.key)}
                                        {sort.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.length === 0 && (
                            <tr><td colSpan={cols.length} className="text-center text-muted-foreground">{t('empty')}</td></tr>
                        )}
                        {shown.slice(0, 500).map((r, i) => (
                            <tr key={i}>
                                {cols.map((c) => <td key={c.key} className={cn(numeric(c.type) && 'is-num num')}><Cell v={r[c.key]} type={c.type} val={val} chartHref={chartHref} /></td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Cell({ v, type, val, chartHref }: { v: string | number | null; type: ColType; val: (s: string) => string; chartHref?: boolean }) {
    if (v == null || v === '') return <span className="text-faint">–</span>;
    if (type === 'ticker') return chartHref ? <Link href={`/stocks/${v}`} className="mono font-semibold text-foreground hover:text-brand-ink">{v}</Link> : <span className="mono font-semibold">{v}</span>;
    if (type === 'side') return <span className={cn('pill', (v === 'bullish' || v === 'buy') && 'is-up', (v === 'bearish' || v === 'sell') && 'is-down')}>{val(String(v))}</span>;
    if (type === 'link') return <a href={String(v)} target="_blank" rel="noopener noreferrer" className="inline-flex text-muted-foreground hover:text-foreground" aria-label="Source"><ExternalLink className="size-4" /></a>;
    if (type === 'text') return <span className="block max-w-[340px] truncate" title={String(v)}>{typeof v === 'string' ? val(v) : v}</span>;
    return <>{formatCell(v, type)}</>;
}
