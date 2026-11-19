'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { passwordValidation } from "@/lib/constants";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import React, { useRef, useState } from "react";
import Turnstile, { TURNSTILE_SITE_KEY, type TurnstileHandle } from '@/components/forms/Turnstile';


const SignUp = () => {
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const human = useRef<TurnstileHandle>(null);
    const t = useTranslations('SignUp');
    const tFields = useTranslations('AuthFields');
    const tPassword = useTranslations('Password');
    const router = useRouter()
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'US',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    },);

    const passwordValue = watch('password');

    const onSubmit = async (data: SignUpFormData) => {
        try {
            const result = await signUpWithEmail({ ...data, captchaToken });
            if (result.success) {
                router.push('/welcome');
                return;
            }
            human.current?.reset();
            toast.error(t('failed'), {
                description: result.error ?? t('couldNotCreate'),
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
            <h1 className="form-title mb-2">{t('title')}</h1>
            <p className="mb-6 text-[14px] text-faint">{t('subtitle')}</p>

            <SocialAuthButtons />

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
                <section className="flex flex-col gap-4" aria-label={t('accountSection')}>
                    <InputField
                        name="fullName"
                        label={t('fullNameLabel')}
                        placeholder={t('fullNamePlaceholder')}
                        register={register}
                        error={errors.fullName}
                        validation={{ required: t('fullNameRequired'), minLength: 2 }}
                    />
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
                    <div className="flex flex-col gap-2">
                        <InputField
                            name="password"
                            label={t('passwordLabel')}
                            placeholder={t('passwordPlaceholder')}
                            type="password"
                            register={register}
                            error={errors.password}
                            validation={passwordValidation({ required: tPassword('required'), minLength: tPassword('minLength'), pattern: tPassword('pattern') })}
                        />
                        {passwordValue ? <PasswordRequirements password={passwordValue} /> : null}
                    </div>
                </section>


                <div className="flex flex-col gap-4">
                    <Turnstile ref={human} onToken={setCaptchaToken} />
                    <Button type="submit" disabled={isSubmitting || (!!TURNSTILE_SITE_KEY && !captchaToken)} className="yellow-btn w-full rounded-full">
                        {isSubmitting ? t('submitting') : t('submit')}
                    </Button>
                    <FooterLink text={t('haveAccount')} linkText={t('signIn')} href="/sign-in" />
                </div>
            </form>
        </>
    )
}
export default SignUp;
