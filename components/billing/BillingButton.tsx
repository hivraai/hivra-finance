'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Asks the server for a Stripe Checkout or portal URL and goes there. Prices never come from here.
export default function BillingButton({ item, portal, children, primary, className }: {
    item?: string; portal?: boolean; children: React.ReactNode; primary?: boolean; className?: string;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function go() {
        setBusy(true); setError('');
        try {
            const r = await fetch('/api/billing', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(portal ? { action: 'portal' } : { action: 'checkout', item }),
            });
            const j = await r.json().catch(() => ({}));
            if (j.url) { window.location.href = j.url; return; }
            setError(j.error ?? 'Something went wrong.');
        } catch {
            setError('Something went wrong.');
        }
        setBusy(false);
    }
    return (
        <div className="flex flex-col gap-1">
            <button type="button" onClick={go} disabled={busy} className={cn('btn h-10 px-4', primary ? 'btn-primary' : 'btn-ghost', className)}>
                {busy && <Loader2 className="size-4 animate-spin" />}{children}
            </button>
            {error && <span className="text-[12px] text-down">{error}</span>}
        </div>
    );
}
