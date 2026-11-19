'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
            reset: (id?: string) => void;
            remove: (id: string) => void;
        };
    }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve();
    scriptPromise ??= new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SCRIPT_SRC;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { scriptPromise = null; reject(new Error('turnstile script')); };
        document.head.appendChild(s);
    });
    return scriptPromise;
}

export type TurnstileHandle = { reset: () => void };

// The human check. Renders nothing when no site key is configured.
const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(({ onToken }, ref) => {
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
        reset: () => {
            cb.current(null);
            if (widget.current) window.turnstile?.reset(widget.current);
        },
    }));

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY) return;
        let cancelled = false;
        loadScript().then(() => {
            if (cancelled || !box.current || !window.turnstile) return;
            widget.current = window.turnstile.render(box.current, {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'dark',
                size: 'flexible',
                appearance: 'interaction-only',
                callback: (t: string) => cb.current(t),
                'expired-callback': () => cb.current(null),
                'error-callback': () => cb.current(null),
            });
        }).catch(() => cb.current(null));
        return () => {
            cancelled = true;
            if (widget.current) window.turnstile?.remove(widget.current);
            widget.current = null;
        };
    }, []);

    if (!TURNSTILE_SITE_KEY) return null;
    return <div ref={box} className="min-h-[65px]" />;
});
Turnstile.displayName = 'Turnstile';
export default Turnstile;
