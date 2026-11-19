'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AgentDemoCopy = {
    label: string;
    example: string;
    question: string;
    steps: readonly string[];
    answer: readonly string[];
    input: string;
};

// The hero's AI analyst, playing one example conversation on a loop: the question, the tools it
// runs (each ticks off), then its written read. Illustrative, and labelled as an example.
export default function AgentDemo({ copy }: { copy: AgentDemoCopy }) {
    // phase: 0 question · 1..n steps done · n+1.. answer lines shown
    const total = 1 + copy.steps.length + copy.answer.length;
    const [phase, setPhase] = useState(0);
    useEffect(() => {
        const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { setPhase(total); return; }
        const id = setTimeout(() => setPhase((p) => (p >= total + 6 ? 0 : p + 1)), phase === 0 ? 900 : phase <= copy.steps.length ? 750 : 1100);
        return () => clearTimeout(id);
    }, [phase, total, copy.steps.length]);

    const stepsDone = Math.min(Math.max(phase - 1, 0), copy.steps.length);
    const lines = Math.max(phase - 1 - copy.steps.length, 0);

    return (
        <div className="card flex h-[480px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                    <span className="grid size-6 place-items-center rounded-full bg-brand text-on-brand"><Sparkles className="size-3.5" /></span>
                    {copy.label}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-faint">{copy.example}</span>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-4 text-[13px]">
                <div className="ms-auto max-w-[85%] rounded-2xl rounded-ee-md bg-brand px-3.5 py-2 text-on-brand">{copy.question}</div>

                {phase >= 1 && (
                    <ul className="flex flex-col gap-1.5">
                        {copy.steps.slice(0, stepsDone + 1).map((s, i) => (
                            <li key={s} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                                {i < stepsDone
                                    ? <Check className="size-3.5 flex-none text-up" />
                                    : <Loader2 className="size-3.5 flex-none animate-spin text-brand-ink" />}
                                <span className={cn(i < stepsDone && 'text-foreground/80')}>{s}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {lines > 0 && (
                    <div className="flex flex-col gap-2 rounded-2xl rounded-es-md bg-hover px-3.5 py-3 leading-relaxed">
                        {copy.answer.slice(0, lines).map((l) => <p key={l}>{l}</p>)}
                    </div>
                )}
            </div>

            <div className="border-t border-line px-4 py-3">
                <div className="flex h-9 items-center rounded-full border border-line px-4 text-[12.5px] text-faint">{copy.input}</div>
            </div>
        </div>
    );
}
