'use client';

// Options desk: chain by expiry (last close), click a bid/ask to add a leg, or start from a preset.
// Payoff at expiry and today (Black-Scholes at each leg's IV), breakevens, max P/L and Greeks.
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles, Trash2 } from 'lucide-react';
import LineChart from '@/components/quant/LineChart';
import { analyze, netPremium, payoffNow, positionGreeks, preset, type Leg, type PresetName } from '@/lib/quant/strategy';
import type { ChainRow, ExpirySummary } from '@/lib/quant/chain';
import { cn } from '@/lib/utils';

const PRESETS: PresetName[] = ['long_call', 'long_put', 'covered_call', 'cash_secured_put', 'bull_call_spread', 'bear_put_spread', 'long_straddle', 'long_strangle', 'iron_condor', 'iron_butterfly'];
const money = (n: number | null) => (n == null ? '∞' : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
const px = (n: number) => n.toFixed(2);

type OptLeg = Extract<Leg, { kind: 'option' }>;

export default function OptionsDesk({ symbol, spot, asOf, rows, expiries, defaultExpiry, locked = false }: {
    symbol: string; spot: number; asOf: string; rows: ChainRow[]; expiries: ExpirySummary[]; defaultExpiry: string;
    locked?: boolean; // Free plan: the chain is visible, the strategy builder is Pro
}) {
    const t = useTranslations('Options');
    const [expiry, setExpiry] = useState(defaultExpiry);
    const [legs, setLegs] = useState<Leg[]>([]);
    const [width, setWidth] = useState(10);

    const exRows = useMemo(() => rows.filter((r) => r.expiry === expiry), [rows, expiry]);
    const strikes = useMemo(() => [...new Set(exRows.map((r) => r.strike))].sort((a, b) => a - b), [exRows]);
    const visible = useMemo(() => {
        const i = strikes.findIndex((k) => k >= spot);
        const c = i < 0 ? strikes.length : i;
        return strikes.slice(Math.max(c - 12, 0), c + 12);
    }, [strikes, spot]);
    const find = (right: 'call' | 'put', k: number) => exRows.find((r) => r.right === right && r.strike === k);
    const sum = expiries.find((e) => e.expiry === expiry);

    function legFrom(r: ChainRow, qty: number, premium = r.mid): OptLeg {
        return { kind: 'option', right: r.right, strike: r.strike, qty, premium, vol: r.iv ?? undefined, years: r.years };
    }
    function add(r: ChainRow, side: 'buy' | 'sell') {
        if (locked) return;
        setLegs((ls) => [...ls, legFrom(r, side === 'buy' ? 1 : -1)]);
    }
    function applyPreset(name: PresetName) {
        if (!strikes.length) return;
        const atm = strikes.reduce((b, k) => (Math.abs(k - spot) < Math.abs(b - spot) ? k : b), strikes[0]);
        const ai = strikes.indexOf(atm);
        const w = Math.max(1, Math.round(width / 5));
        const stepUp = (n: number) => strikes[Math.min(ai + n * w, strikes.length - 1)];
        const stepDn = (n: number) => strikes[Math.max(ai - n * w, 0)];
        const base = preset(name, atm, 1, () => 0, spot);
        // Map the preset's relative strikes (K, K±w, K±2w) onto real listed strikes.
        const out: Leg[] = base.map((l) => {
            if (l.kind === 'stock') return l;
            const off = Math.round(l.strike - atm);
            const k = off === 0 ? atm : off > 0 ? stepUp(off) : stepDn(-off);
            const r = find(l.right, k);
            return r ? legFrom(r, l.qty) : null;
        }).filter((l): l is Leg => l != null);
        setLegs(out);
    }

    const a = useMemo(() => (legs.length ? analyze(legs, spot) : null), [legs, spot]);
    const g = useMemo(() => (legs.length ? positionGreeks(legs, spot) : null), [legs, spot]);
    const net = netPremium(legs);

    const question = legs.length
        ? t('askPrompt', { symbol, expiry, legs: legs.map((l) => l.kind === 'stock' ? `${l.qty} shares` : `${l.qty > 0 ? 'buy' : 'sell'} ${Math.abs(l.qty)} ${l.strike} ${l.right}`).join(', ') })
        : t('askPromptEmpty', { symbol });

    return (
        <div className="flex flex-col gap-3">
            <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                <div><span className="mono text-lg font-semibold">{symbol}</span> <span className="num ms-2 text-lg">{px(spot)}</span></div>
                <span className="text-[12.5px] text-muted-foreground">{t('asOf', { date: new Date(asOf).toISOString().slice(0, 10) })}</span>
                {sum && (
                    <>
                        <span className="text-[13px]">{t('atmIv')} <b className="num">{sum.atmIv != null ? `${(sum.atmIv * 100).toFixed(1)}%` : '—'}</b></span>
                        <span className="text-[13px]">{t('expMove')} <b className="num">{sum.expectedMove != null ? `±${px(sum.expectedMove)}` : '—'}</b></span>
                    </>
                )}
                <Link href={`/agent?symbol=${symbol}&q=${encodeURIComponent(question)}`} className="btn btn-primary ms-auto"><Sparkles /> {t('ask')}</Link>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
                {expiries.map((e) => (
                    <button key={e.expiry} type="button" onClick={() => setExpiry(e.expiry)}
                        className={cn('btn btn-ghost h-8 shrink-0 px-3 text-[12.5px]', e.expiry === expiry && 'is-on')}>
                        {e.expiry.slice(5)} <span className="text-faint">{e.days}d</span>
                    </button>
                ))}
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="card overflow-x-auto p-0">
                    <table className="w-full text-[12.5px] tabular-nums">
                        <thead className="text-muted-foreground">
                            <tr>
                                <th className="px-2 py-2 text-start font-medium" colSpan={4}>{t('calls')}</th>
                                <th className="px-2 py-2 text-center font-medium">{t('strike')}</th>
                                <th className="px-2 py-2 text-end font-medium" colSpan={4}>{t('puts')}</th>
                            </tr>
                            <tr className="text-[11px]">
                                {['Δ', 'IV', t('bid'), t('ask_')].map((h) => <th key={'c' + h} className="px-2 pb-1 text-end font-normal">{h}</th>)}
                                <th />
                                {[t('bid'), t('ask_'), 'IV', 'Δ'].map((h) => <th key={'p' + h} className="px-2 pb-1 text-end font-normal">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((k) => {
                                const c = find('call', k), p = find('put', k);
                                const itmC = k < spot, itmP = k > spot;
                                const cell = (r: ChainRow | undefined, side: 'buy' | 'sell', v?: number) => (
                                    <td className="px-1 py-0.5 text-end">
                                        {r && v != null && v > 0 ? (
                                            <button type="button" onClick={() => add(r, side)} title={side === 'buy' ? t('buyHint') : t('sellHint')}
                                                className={cn('num rounded px-1.5 py-0.5 hover:bg-brand-soft', side === 'buy' ? 'text-up' : 'text-down')}>{px(v)}</button>
                                        ) : <span className="text-faint">—</span>}
                                    </td>
                                );
                                return (
                                    <tr key={k} className="border-t border-line">
                                        <td className={cn('px-2 text-end', itmC && 'bg-hover')}>{c?.delta != null ? c.delta.toFixed(2) : '—'}</td>
                                        <td className={cn('px-2 text-end', itmC && 'bg-hover')}>{c?.iv != null ? `${(c.iv * 100).toFixed(0)}%` : '—'}</td>
                                        {cell(c, 'sell', c?.bid)}
                                        {cell(c, 'buy', c?.ask)}
                                        <td className="px-2 text-center font-semibold">{k}</td>
                                        {cell(p, 'sell', p?.bid)}
                                        {cell(p, 'buy', p?.ask)}
                                        <td className={cn('px-2 text-end', itmP && 'bg-hover')}>{p?.iv != null ? `${(p.iv * 100).toFixed(0)}%` : '—'}</td>
                                        <td className={cn('px-2 text-end', itmP && 'bg-hover')}>{p?.delta != null ? p.delta.toFixed(2) : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="px-3 py-2 text-[11.5px] text-faint">{t('chainHint')}</p>
                </div>

                {locked ? (
                    <div className="card flex flex-col items-start gap-2 self-start p-5">
                        <p className="font-semibold">{t('lockedTitle')}</p>
                        <p className="text-[13px] text-muted-foreground">{t('lockedBody')}</p>
                        <Link href="/billing" className="btn btn-primary mt-1">{t('lockedCta')}</Link>
                    </div>
                ) : (
                <div className="flex flex-col gap-3">
                    <div className="card flex flex-col gap-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <select className="h-9 rounded-lg border border-line bg-canvas px-2 text-[13px]" defaultValue="" onChange={(e) => { if (e.target.value) applyPreset(e.target.value as PresetName); e.target.value = ''; }}>
                                <option value="">{t('preset')}</option>
                                {PRESETS.map((p) => <option key={p} value={p}>{t(`presets.${p}`)}</option>)}
                            </select>
                            <label className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                                {t('width')}
                                <select className="h-9 rounded-lg border border-line bg-canvas px-2 text-[13px]" value={width} onChange={(e) => setWidth(+e.target.value)}>
                                    {[5, 10, 15, 20, 30].map((w) => <option key={w} value={w}>{w / 5}</option>)}
                                </select>
                            </label>
                            {legs.length > 0 && <button type="button" className="btn btn-ghost ms-auto h-9" onClick={() => setLegs([])}><Trash2 /> {t('clear')}</button>}
                        </div>
                        {legs.length === 0 ? (
                            <p className="py-3 text-[13px] text-muted-foreground">{t('empty')}</p>
                        ) : (
                            <ul className="flex flex-col gap-1 text-[13px]">
                                {legs.map((l, i) => (
                                    <li key={i} className="flex items-center gap-2 border-b border-line pb-1">
                                        <input type="number" value={l.qty} step={1} className="num h-8 w-16 rounded border border-line bg-canvas px-1.5"
                                            onChange={(e) => { const q = Math.trunc(+e.target.value) || 0; setLegs((ls) => ls.map((x, j) => (j === i ? { ...x, qty: q } : x))); }} />
                                        {l.kind === 'stock'
                                            ? <span className="flex-1">{t('shares')} @ {px(l.price)}</span>
                                            : <span className="flex-1"><b className={l.qty > 0 ? 'text-up' : 'text-down'}>{l.qty > 0 ? t('buy') : t('sell')}</b> {l.strike} {t(l.right)} @ <span className="num">{px(l.premium)}</span></span>}
                                        <button type="button" className="icon-btn" aria-label={t('remove')} onClick={() => setLegs((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {a && g && (
                        <div className="card flex flex-col gap-3 p-4">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
                                <Stat k={net >= 0 ? t('credit') : t('debit')} v={money(Math.abs(net))} />
                                <Stat k={t('maxProfit')} v={money(a.maxProfit)} tone="text-up" />
                                <Stat k={t('maxLoss')} v={a.maxLoss == null ? '∞' : money(-a.maxLoss)} tone="text-down" />
                                <Stat k={t('breakevens')} v={a.breakevens.length ? a.breakevens.map(px).join(' · ') : '—'} />
                                <Stat k="Delta" v={g.delta.toFixed(1)} />
                                <Stat k="Gamma" v={g.gamma.toFixed(3)} />
                                <Stat k={t('thetaDay')} v={money(g.theta)} />
                                <Stat k={t('vegaPt')} v={money(g.vega)} />
                            </div>
                            <LineChart
                                x={a.points.map((p) => p.spot)}
                                series={[
                                    { name: t('atExpiry'), values: a.points.map((p) => p.expiry), color: 'var(--brand)' },
                                    { name: t('today'), values: a.points.map((p) => p.now), color: 'var(--muted-foreground)', dashed: true },
                                ]}
                                zeroLine
                                markers={[{ x: spot, label: t('spot') }]}
                                formatX={(v) => v.toFixed(0)}
                                formatY={(v) => money(v)}
                            />
                            <p className="text-[11.5px] text-faint">{t('pricingNote')}</p>
                        </div>
                    )}
                    {a && <WhatIf key={legs.map((l) => (l.kind === 'option' ? `${l.right}${l.strike}${l.qty}` : `s${l.qty}`)).join('|')} legs={legs} spot={spot} maxLoss={a.maxLoss} net={net} />}
                </div>
                )}
            </div>
        </div>
    );
}

// "What if": profit or loss if the stock is at a chosen price on a chosen day (expiry by default).
// Before expiry each option is re-priced with Black-Scholes at its own IV and the time left.
function WhatIf({ legs, spot, maxLoss, net }: { legs: Leg[]; spot: number; maxLoss: number | null; net: number }) {
    const t = useTranslations('Options');
    const dte = Math.max(0, ...legs.map((l) => (l.kind === 'option' && l.years ? Math.round(l.years * 365) : 0)));
    const [target, setTarget] = useState(+spot.toFixed(2));
    const [days, setDays] = useState(dte); // days from today; dte = at expiry
    const plAt = (price: number) => payoffNow(legs.map((l) => (l.kind === 'option' && l.years ? { ...l, years: Math.max(l.years - days / 365, 0) } : l)), price);
    // Return on the money at risk: max loss when it is limited, else the debit paid.
    const risk = maxLoss != null && maxLoss > 0 ? maxLoss : net < 0 ? -net : null;
    const pct = (pl: number) => (risk ? `${pl >= 0 ? '+' : ''}${((pl / risk) * 100).toFixed(0)}%` : '—');
    const sign = (v: number) => (v >= 0 ? '+' : '');
    const pl = plAt(target);
    const move = ((target - spot) / spot) * 100;
    const lo = +(spot * 0.5).toFixed(2), hi = +(spot * 1.5).toFixed(2);
    const date = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
    const rows = [-20, -10, -5, 0, 5, 10, 20].map((m) => ({ m, price: spot * (1 + m / 100) }));
    return (
        <div className="card flex flex-col gap-3 p-4">
            <p className="text-[14px] font-semibold">{t('whatIf.title')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
                    {t('whatIf.price')}
                    <div className="flex items-center gap-2">
                        <input type="number" step="0.5" min={0} value={target} onChange={(e) => setTarget(Math.max(0, +e.target.value || 0))}
                            className="num h-9 w-28 rounded-lg border border-line bg-canvas px-2 text-[14px] text-foreground" />
                        <span className={cn('num text-[12.5px]', move >= 0 ? 'text-up' : 'text-down')}>{sign(move)}{move.toFixed(1)}%</span>
                    </div>
                    <input type="range" min={lo} max={hi} step={(hi - lo) / 200} value={Math.min(Math.max(target, lo), hi)} onChange={(e) => setTarget(+(+e.target.value).toFixed(2))} />
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] text-muted-foreground">
                    {days >= dte ? t('whatIf.atExpiry', { date }) : t('whatIf.onDate', { date, days })}
                    <input type="range" min={0} max={dte} step={1} value={days} onChange={(e) => setDays(+e.target.value)} disabled={dte === 0} />
                    <span className="text-[11.5px] text-faint">{t('whatIf.dateHint')}</span>
                </label>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="text-[13px] text-muted-foreground">{t('whatIf.result', { price: px(target) })}</span>
                <span className={cn('num text-2xl font-bold', pl >= 0 ? 'text-up' : 'text-down')}>{sign(pl)}{money(pl)}</span>
                <span className={cn('num text-[13px] font-semibold', pl >= 0 ? 'text-up' : 'text-down')}>{pct(pl)} {t('whatIf.onRisk')}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead><tr className="text-left text-[11.5px] text-muted-foreground">
                        <th className="py-1 font-medium">{t('whatIf.move')}</th><th className="py-1 font-medium">{t('whatIf.stock')}</th>
                        <th className="py-1 text-right font-medium">{t('whatIf.pl')}</th><th className="py-1 text-right font-medium">{t('whatIf.return')}</th>
                    </tr></thead>
                    <tbody>
                        {rows.map(({ m, price }) => {
                            const v = plAt(price);
                            return (
                                <tr key={m} className={cn('cursor-pointer border-t border-line hover:bg-black/5', m === 0 && 'font-semibold')} onClick={() => setTarget(+price.toFixed(2))}>
                                    <td className="num py-1.5">{sign(m)}{m}%</td>
                                    <td className="num py-1.5">{px(price)}</td>
                                    <td className={cn('num py-1.5 text-right', v >= 0 ? 'text-up' : 'text-down')}>{sign(v)}{money(v)}</td>
                                    <td className={cn('num py-1.5 text-right', v >= 0 ? 'text-up' : 'text-down')}>{pct(v)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-[11.5px] text-faint">{t('whatIf.note')}</p>
        </div>
    );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[11.5px] text-muted-foreground">{k}</span>
            <span className={cn('num font-semibold', tone)}>{v}</span>
        </div>
    );
}
