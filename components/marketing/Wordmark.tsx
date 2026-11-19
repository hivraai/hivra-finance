import { cn } from "@/lib/utils";

// HIVRA Finance's own mark (hive hexagon + rising candles), distinct from hivra.ai's grid, beside the wordmark.
export default function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hivra-finance-mark.svg" alt="" width={30} height={30} className="size-[30px]" />
            <span className="text-[18px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: 'var(--font-poppins), var(--font-inter), sans-serif' }}>
                HIVRA <span className="text-brand-ink">Finance</span>
            </span>
        </span>
    );
}
