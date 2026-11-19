'use client';

import { useState } from "react";
import { sourceDomain, sourceLogoUrl } from "@/lib/news/source-logo";

// The publisher's icon on a light tile (most favicons are drawn for white), or its initial when there is none.
export default function SourceLogo({ source, url }: { source: string; url: string }) {
    const domain = sourceDomain(source, url);
    const [failed, setFailed] = useState(false);
    return (
        <span className="mt-0.5 flex size-9 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-white shadow-[inset_0_0_0_1px_oklch(0_0_0/0.06)]">
            {domain && !failed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sourceLogoUrl(domain)} alt="" width={22} height={22} loading="lazy" className="size-[22px]" onError={() => setFailed(true)} />
            ) : (
                <span className="text-[14px] font-bold text-neutral-700">{source.trim().charAt(0).toUpperCase() || '·'}</span>
            )}
        </span>
    );
}
