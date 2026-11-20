// Cell and tile formatting shared by the server pages and the client table.
import type { ColType } from './views';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatCell(v: string | number | null | undefined, type: ColType): string {
    if (v == null || v === '') return '–';
    if (typeof v !== 'number') return String(v);
    switch (type) {
        case 'money': { const a = Math.abs(v); const body = a >= 100_000 ? compact.format(a) : plain.format(a); return `${v < 0 ? '−' : ''}$${body}`; }
        case 'pct': return `${plain.format(v)}%`;
        case 'num': return Math.abs(v) >= 100_000 ? compact.format(v) : plain.format(v);
        default: return String(v);
    }
}
