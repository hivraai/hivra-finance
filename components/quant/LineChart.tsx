'use client';

// Minimal responsive SVG line chart: several series over a shared numeric x, optional zero line and
// vertical markers. No library; enough for payoff curves and equity curves.
import { useMemo, useState } from 'react';

export type Series = { name: string; values: number[]; color: string; dashed?: boolean };

export default function LineChart({ x, series, height = 260, zeroLine = false, markers = [], formatX, formatY }: {
    x: number[]; series: Series[]; height?: number; zeroLine?: boolean;
    markers?: { x: number; label: string }[];
    formatX: (v: number) => string; formatY: (v: number) => string;
}) {
    const W = 720, H = height, L = 64, R = 12, T = 12, B = 26;
    const [hover, setHover] = useState<number | null>(null);
    const { x0, x1, y0, y1 } = useMemo(() => {
        const ys = series.flatMap((s) => s.values).filter(Number.isFinite);
        let lo = Math.min(...ys, zeroLine ? 0 : Infinity), hi = Math.max(...ys, zeroLine ? 0 : -Infinity);
        if (lo === hi) { lo -= 1; hi += 1; }
        const pad = (hi - lo) * 0.06;
        return { x0: x[0], x1: x.at(-1)!, y0: lo - pad, y1: hi + pad };
    }, [x, series, zeroLine]);
    if (x.length < 2) return null;
    const px = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
    const py = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${px(x[i]).toFixed(1)},${py(v).toFixed(1)}`).join('');
    const ticks = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);
    const xt = Array.from({ length: 5 }, (_, i) => x0 + ((x1 - x0) * i) / 4);

    function onMove(e: React.MouseEvent<SVGSVGElement>) {
        const r = e.currentTarget.getBoundingClientRect();
        const vx = x0 + (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * (x1 - x0);
        let best = 0;
        for (let i = 1; i < x.length; i++) if (Math.abs(x[i] - vx) < Math.abs(x[best] - vx)) best = i;
        setHover(best);
    }

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img">
                {ticks.map((v) => (
                    <g key={v}>
                        <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="var(--line)" strokeWidth={1} />
                        <text x={L - 6} y={py(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">{formatY(v)}</text>
                    </g>
                ))}
                {xt.map((v) => <text key={v} x={px(v)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">{formatX(v)}</text>)}
                {zeroLine && <line x1={L} x2={W - R} y1={py(0)} y2={py(0)} stroke="var(--muted-foreground)" strokeWidth={1} />}
                {markers.map((m) => (
                    <g key={m.label + m.x}>
                        <line x1={px(m.x)} x2={px(m.x)} y1={T} y2={H - B} stroke="var(--brand)" strokeDasharray="3 3" strokeWidth={1} />
                        <text x={px(m.x) + 3} y={T + 10} fontSize={10.5} fill="var(--brand-ink)">{m.label}</text>
                    </g>
                ))}
                {series.map((s) => <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} />)}
                {hover != null && <line x1={px(x[hover])} x2={px(x[hover])} y1={T} y2={H - B} stroke="var(--muted-foreground)" strokeWidth={1} />}
            </svg>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                {series.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />{s.name}
                        {hover != null && <span className="num text-muted-foreground">{formatY(s.values[hover])}</span>}
                    </span>
                ))}
                {hover != null && <span className="num ms-auto text-muted-foreground">{formatX(x[hover])}</span>}
            </div>
        </div>
    );
}
