import { NextRequest, NextResponse } from 'next/server';
import { isLogoDomain } from '@/lib/news/source-logo';

// A publisher's icon, fetched once from Google's favicon service and cached at the edge for a week,
// so readers' browsers never call Google. Only a bare hostname is accepted, and only an image goes back.
export async function GET(request: NextRequest) {
    const d = (request.nextUrl.searchParams.get('d') ?? '').toLowerCase();
    if (!isLogoDomain(d)) return new NextResponse('Bad domain', { status: 400 });
    try {
        const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64`, {
            signal: AbortSignal.timeout(5000),
            next: { revalidate: 604800 },
        });
        const type = res.headers.get('content-type') ?? '';
        if (!res.ok || !type.startsWith('image/')) return new NextResponse('Not found', { status: 404 });
        return new NextResponse(await res.arrayBuffer(), {
            headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable' },
        });
    } catch {
        return new NextResponse('Not found', { status: 404 });
    }
}
