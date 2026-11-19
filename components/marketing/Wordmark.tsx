import { cn } from "@/lib/utils";

// The HIVRA mark (the 3x3 grid, same file as hivra.ai's icon) beside the wordmark.
export default function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hivra-mark.svg" alt="" width={30} height={30} className="size-[30px]" />
            <span className="text-[18px] font-extrabold tracking-[-0.03em]" style={{ fontFamily: 'var(--font-poppins), var(--font-inter), sans-serif' }}>
                HIVRA <span className="text-brand-ink">Finance</span>
            </span>
        </span>
    );
}
