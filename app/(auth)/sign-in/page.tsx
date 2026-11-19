'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import React, { useEffect, useRef, useState } from "react";
import EmailLinkForm from "@/components/forms/EmailLinkForm";
import Turnstile, { TURNSTILE_SITE_KEY, type TurnstileHandle } from '@/components/forms/Turnstile';


const SignIn = () => {
    const t = useTranslations('SignIn');
    const tFields = useTranslations('AuthFields');
    const tPassword = useTranslations('Password');
    const router = useRouter()
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const human = useRef<TurnstileHandle>(null);
    const tLink = useTranslations('EmailLink');
    const [withPassword, setWithPassword] = useState(false);
    const [expired, setExpired] = useState(false);
    // ?link=expired comes back from a used or old sign-in link
    useEffect(() => { setExpired(new URLSearchParams(window.location.search).get('link') === 'expired'); }, []);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignInFormData>({
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: SignInFormData) => {
        try {
            const result = await signInWithEmail({ ...data, captchaToken });
            if (result.success) {
                router.push('/dashboard');
                return;
            }
            human.current?.reset();
            toast.error(t('failed'), {
                description: result.error ?? t('invalidCredentials'),
            });
        } catch (e) {
            console.error(e);
            toast.error(t('failed'), {
                description: e instanceof Error ? e.message : t('failedGeneric')
            })
        }
    }

    return (
        <>
            <h1 className="form-title mb-1.5 text-center">{t('title')}</h1>
            <p className="mb-6 text-center text-[14px] text-faint">{t('subtitle')}</p>

            {expired && <p className="mb-4 rounded-xl border border-line px-3 py-2 text-center text-[13px] text-muted-foreground">{tLink('expired')}</p>}

            <SocialAuthButtons />

            {!withPassword ? (
                <>
                    <EmailLinkForm />
                    <button type="button" className="footer-link mx-auto mt-4 block text-[13px]" onClick={() => setWithPassword(true)}>{tLink('usePassword')}</button>
                    <div className="mt-4"><FooterLink text={t('noAccount')} linkText={t('createAccount')} href="/sign-up" /></div>
                </>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <InputField
                    name="email"
                    label={tFields('email')}
                    placeholder="you@example.com"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: tFields('emailRequired'),
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                            message: tFields('emailInvalid')
                        }
                    }}
                />

                <InputField
                    name="password"
                    label={t('passwordLabel')}
                    placeholder={t('passwordPlaceholder')}
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={{ required: tPassword('required'), minLength: 8 }}
                />

                <div className="-mt-2 flex justify-end">
                    <Link href="/forgot-password" className="footer-link text-sm">
                        {t('forgotPassword')}
                    </Link>
                </div>

                <Turnstile ref={human} onToken={setCaptchaToken} />

                <Button type="submit" disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !captchaToken)} className="yellow-btn w-full rounded-full">
                    {isSubmitting ? t('submitting') : t('submit')}
                </Button>

                <button type="button" className="footer-link mx-auto block text-[13px]" onClick={() => setWithPassword(false)}>{tLink('useLink')}</button>
            </form>
            )}
        </>
    );
};
export default SignIn;
