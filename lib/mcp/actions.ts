'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/better-auth/auth';
import { createCode, revokeClient } from './oauth';
import { parseAuthorize, withParams } from './authorize';

// The member pressed Approve or Cancel on /connect/approve. The request is re-validated here:
// nothing in the form is trusted except the original authorize query.
export async function decideConnection(formData: FormData) {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    const q = new URLSearchParams(String(formData.get('query') ?? ''));
    const parsed = await parseAuthorize(q);
    if ('error' in parsed) redirect('/connect');
    if (formData.get('decision') !== 'approve') redirect(withParams(parsed.redirectUri, { error: 'access_denied', state: parsed.state }));
    const code = await createCode({ clientId: parsed.clientId, userId: session.user.id, email: session.user.email, redirectUri: parsed.redirectUri, challenge: parsed.challenge });
    redirect(withParams(parsed.redirectUri, { code, state: parsed.state }));
}

export async function disconnectAssistant(formData: FormData) {
    const session = await getSession();
    if (!session?.user) redirect('/sign-in');
    await revokeClient(session.user.id, String(formData.get('clientId') ?? ''));
    revalidatePath('/connect');
}
