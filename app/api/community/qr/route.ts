import { NextRequest, NextResponse } from 'next/server';
import { communityQrPng, verifyCommunityQrSignature } from '@/lib/community';

// The WhatsApp-group QR as a PNG, for the welcome email (which cannot show data: images).
// Only a link signed for a recipient's email gets the image.
export async function GET(request: NextRequest) {
    const email = request.nextUrl.searchParams.get('e');
    const sig = request.nextUrl.searchParams.get('s');
    if (!verifyCommunityQrSignature(email, sig)) return new NextResponse('Not found', { status: 404 });

    const png = await communityQrPng();
    if (!png) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(new Uint8Array(png), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' },
    });
}
