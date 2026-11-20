// Start of the "Connect your AI" sign-in: Claude or ChatGPT opens this in the member's browser.
// Signed out → remember the request and sign in first (middleware brings them back); signed in → consent page.
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/better-auth/auth';
import { parseAuthorize, RETURN_COOKIE } from '@/lib/mcp/authorize';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const parsed = await parseAuthorize(url.searchParams);
    if ('error' in parsed) return new Response(parsed.error, { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    const next = `/connect/approve?${url.searchParams.toString()}`;
    const session = await getSession();
    if (session?.user) return NextResponse.redirect(new URL(next, url));
    const res = NextResponse.redirect(new URL('/sign-in', url));
    res.cookies.set(RETURN_COOKIE, next, { httpOnly: true, secure: url.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 15 * 60 });
    return res;
}
