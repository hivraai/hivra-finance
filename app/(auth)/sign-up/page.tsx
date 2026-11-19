'use client';

import { useTranslations } from "next-intl";
import SocialAuthButtons from "@/components/forms/SocialAuthButtons";
import EmailLinkForm from "@/components/forms/EmailLinkForm";
import FooterLink from "@/components/forms/FooterLink";

// Passwordless sign-up: Google, or name + email and we email a link. Preferences keep their defaults
// and are edited later in Profile.
const SignUp = () => {
    const t = useTranslations('SignUp');
    return (
        <>
            <h1 className="form-title mb-1.5 text-center">{t('title')}</h1>
            <p className="mb-6 text-center text-[14px] text-faint">{t('subtitle')}</p>
            <SocialAuthButtons />
            <EmailLinkForm withName />
            <div className="mt-4"><FooterLink text={t('haveAccount')} linkText={t('signIn')} href="/sign-in" /></div>
        </>
    );
};
export default SignUp;
