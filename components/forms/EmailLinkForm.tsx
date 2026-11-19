'use client';

import { useForm } from 'react-hook-form';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import Turnstile, { TURNSTILE_SITE_KEY, type TurnstileHandle } from '@/components/forms/Turnstile';
import { sendSignInLink } from '@/lib/actions/auth.actions';

type Values = { email: string; fullName: string };

// Passwordless: email (and a name on sign-up) → a one-time sign-in link. Then a "check your email" state.
export default function EmailLinkForm({ withName = false }: { withName?: boolean }) {
    const t = useTranslations('EmailLink');
    const tFields = useTranslations('AuthFields');
    const tUp = useTranslations('SignUp');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<string | null>(null);
    const human = useRef<TurnstileHandle>(null);
    const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Values>({
        defaultValues: { email: '', fullName: '' }, mode: 'onBlur',
    });

    const send = async ({ email, fullName }: Values) => {
        try {
            const r = await sendSignInLink({ email, name: withName ? fullName : undefined, captchaToken });
            human.current?.reset();
            if (r.success) { setSentTo(email.trim()); return; }
            toast.error(r.error ?? t('expired'));
        } catch {
            human.current?.reset();
            toast.error(t('expired'));
        }
    };

    if (sentTo) {
        return (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink"><MailCheck className="size-5" /></span>
                <p className="text-[17px] font-semibold">{t('sentTitle')}</p>
                <p className="text-[14px] text-muted-foreground">{t('sentBody', { email: sentTo })}</p>
                <div className="mt-2 flex items-center gap-4 text-[13px]">
                    <button type="button" className="footer-link" onClick={() => setSentTo(null)}>{t('otherEmail')}</button>
                    <button type="button" className="footer-link" disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !captchaToken)}
                        onClick={() => send(getValues())}>{t('resend')}</button>
                </div>
                <Turnstile ref={human} onToken={setCaptchaToken} />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(send)} className="flex flex-col gap-4">
            {withName && (
                <InputField name="fullName" label={tUp('fullNameLabel')} placeholder={tUp('fullNamePlaceholder')} register={register}
                    error={errors.fullName} validation={{ required: tUp('fullNameRequired'), minLength: 2, maxLength: 80 }} />
            )}
            <InputField name="email" label={tFields('email')} placeholder="you@example.com" register={register} error={errors.email}
                validation={{ required: tFields('emailRequired'), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message: tFields('emailInvalid') } }} />
            <Turnstile ref={human} onToken={setCaptchaToken} />
            <Button type="submit" disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !captchaToken)} className="yellow-btn w-full rounded-full">
                {isSubmitting ? t('sending') : withName ? t('createSend') : t('send')}
            </Button>
            <p className="-mt-1 text-center text-[12px] text-faint">{t('noPassword')}</p>
        </form>
    );
}
