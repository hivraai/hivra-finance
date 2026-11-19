import 'server-only';

// Cloudflare Turnstile, the "are you human" check on sign-up, sign-in and password reset.
// Off until TURNSTILE_SECRET_KEY is set (with NEXT_PUBLIC_TURNSTILE_SITE_KEY for the widget).
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY?.trim();

export async function verifyTurnstile(token: unknown, ip?: string | null): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
    if (!secret) return true;
    if (typeof token !== 'string' || !token || token.length > 2048) return false;
    try {
        const body = new URLSearchParams({ secret, response: token });
        if (ip && ip !== 'unknown') body.set('remoteip', ip);
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body,
            signal: AbortSignal.timeout(10_000),
        });
        const json = (await res.json()) as { success?: boolean };
        return json.success === true;
    } catch (error) {
        console.error('Turnstile verification failed:', error);
        return false; // fail closed
    }
}
