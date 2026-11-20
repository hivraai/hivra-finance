'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyField({ value, label, copied }: { value: string; label: string; copied: string }) {
    const [done, setDone] = useState(false);
    return (
        <div className="flex items-center gap-2">
            <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} className="input-like mono flex-1 text-[13px]" />
            <button type="button" className="btn btn-primary h-9" onClick={async () => {
                await navigator.clipboard.writeText(value).catch(() => null);
                setDone(true); setTimeout(() => setDone(false), 2000);
            }}>
                {done ? <Check /> : <Copy />}{done ? copied : label}
            </button>
        </div>
    );
}
