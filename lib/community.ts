import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import QRCode from 'qrcode';

// The members' WhatsApp group. The invite link lives ONLY in the environment (WHATSAPP_GROUP_URL):
// this repository is public (AGPL), and a link in the source would let anyone on GitHub join.
// It is shown to signed-in users and in the welcome email, never on a public page.
export function communityUrl(): string | null {
    const raw = process.env.WHATSAPP_GROUP_URL?.trim();
    if (!raw) return null;
    try {
        const url = new URL(raw);
        if (url.hostname !== 'chat.whatsapp.com') return null;
        // Drop WhatsApp's share-tracking query (?s=…&p=…&iam=…); the code in the path is the invite.
        return `https://chat.whatsapp.com${url.pathname}`;
    } catch {
        return null;
    }
}

const QR_OPTIONS = { margin: 1, width: 320, color: { dark: '#0A0A0A', light: '#FFFFFF' } } as const;

export async function communityQrDataUrl(): Promise<string | null> {
    const url = communityUrl();
    return url ? QRCode.toDataURL(url, QR_OPTIONS) : null;
}

export async function communityQrPng(): Promise<Buffer | null> {
    const url = communityUrl();
    return url ? QRCode.toBuffer(url, { ...QR_OPTIONS, type: 'png' }) : null;
}

// Email clients block data: images, so the welcome email loads the QR from /api/community/qr.
// The URL carries a signature of the recipient's email, so the route is not an open door to the link.
function signature(email: string): string {
    const secret = process.env.BETTER_AUTH_SECRET ?? '';
    return createHmac('sha256', secret).update(`community-qr:${email.toLowerCase()}`).digest('base64url');
}

export function communityQrEmailUrl(email: string, origin: string): string {
    const params = new URLSearchParams({ e: email.toLowerCase(), s: signature(email) });
    return `${origin.replace(/\/$/, '')}/api/community/qr?${params}`;
}

export function verifyCommunityQrSignature(email: string | null, sig: string | null): boolean {
    if (!email || !sig || !process.env.BETTER_AUTH_SECRET) return false;
    const expected = Buffer.from(signature(email));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given);
}
