import { betterAuth } from "better-auth";
import {mongodbAdapter} from "better-auth/adapters/mongodb";
import {connectToDatabase, isWorkersRuntime} from "@/database/mongoose";
import {nextCookies} from "better-auth/next-js";
import { captcha, magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { after } from "next/server";
import { cache } from "react";
import { sendPasswordResetEmail } from "@/lib/nodemailer/reset-password";
import { sendMagicLinkEmail } from "@/lib/nodemailer/magic-link";
import { inngest } from "@/lib/inngest/client";
import { resolveLocale } from "@/i18n/locale";


type MongoDb = Parameters<typeof mongodbAdapter>[0];

// Typed from the real config, so additional user fields (country, ...) show up in session types
const createAuth = (database: MongoDb) => betterAuth({
        database: mongodbAdapter(database),
       secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
        // Onboarding answers live on the user so the profile page can show and edit them
        user: {
            additionalFields: {
                country: { type: "string", required: false },
                investmentGoals: { type: "string", required: false },
                riskTolerance: { type: "string", required: false },
                preferredIndustry: { type: "string", required: false },
            },
        },
        emailAndPassword: {
            enabled: true,
            disableSignUp: false,
            requireEmailVerification: false,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            autoSignIn: true,
            // A reset is how a victim takes an account back: sign out every other session (off by default)
            revokeSessionsOnPasswordReset: true,
            sendResetPassword: async ({ user, url }) => {
                // Read the cookie now, while the user's request is still in scope
                const locale = await resolveLocale().catch(() => undefined);
                // Sent after the response (no timing hint about which emails exist), but inside the request's
                // lifetime: a bare un-awaited promise is frozen with the function on Vercel and never sends.
                after(() => sendPasswordResetEmail({
                    email: user.email,
                    name: user.name,
                    resetUrl: url,
                    locale,
                }).then((r) => console.log('Password reset email:', r?.status ?? 'sent'))
                  .catch((error) => {
                    console.error('Failed to send password reset email:', error);
                }));
            },
        },
        // Signed session cookie for 5 min: pages stop paying a MongoDB round trip per request.
        // Trade-off: a revoked session can stay valid for up to 5 minutes.
        session: {
            cookieCache: { enabled: true, maxAge: 5 * 60 },
        },
        // No account linking. Sign-up doesn't verify emails, so linking a Google/GitHub identity to an
        // existing account with the same email would let someone pre-register a victim's address and
        // later capture their social sign-in. This switch also blocks explicit linking (still true in 1.7);
        // when social sign-in ships, `disableImplicitLinking: true` keeps explicit linking and drops only the email match.
        account: {
            accountLinking: { enabled: false },
        },
        // Providers stay disabled until their env vars are set
        socialProviders: {
            google: {
                enabled: !!process.env.GOOGLE_CLIENT_ID,
                clientId: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            },
            github: {
                enabled: !!process.env.GITHUB_CLIENT_ID,
                clientId: process.env.GITHUB_CLIENT_ID as string,
                clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            },
        },
        // Only Cloudflare overwrites cf-connecting-ip; anywhere else a client can send its own and dodge the
        // rate limiter. On Workers x-forwarded-for keeps whatever the client sent first, so it is not trusted there.
        advanced: {
            ipAddress: {
                ipAddressHeaders: isWorkersRuntime() ? ["cf-connecting-ip"] : ["x-forwarded-for"],
            },
        },
        // Every new account (email link, Google, password) gets the welcome email from one place.
        databaseHooks: {
            user: {
                create: {
                    after: async (user) => {
                        const u = user as typeof user & { country?: string; investmentGoals?: string; riskTolerance?: string; preferredIndustry?: string };
                        const locale = await resolveLocale().catch(() => undefined);
                        await inngest.send({
                            name: 'app/user.created',
                            data: {
                                email: u.email, name: u.name,
                                country: u.country ?? 'US', investmentGoals: u.investmentGoals ?? 'Growth',
                                riskTolerance: u.riskTolerance ?? 'Medium', preferredIndustry: u.preferredIndustry ?? 'Technology',
                                locale,
                            },
                        }).catch((e) => console.error('welcome event failed', e));
                    },
                },
            },
        },
        plugins: [
            // Passwordless: a one-time sign-in link by email, valid 15 minutes. Creates the account on first use.
            magicLink({
                expiresIn: 15 * 60,
                rateLimit: { window: 60, max: 3 },
                sendMagicLink: async ({ email, url }) => {
                    const locale = await resolveLocale().catch(() => undefined);
                    // Awaited, not after(): the form says "check your email" only once it has really gone out.
                    await sendMagicLinkEmail({ email, url, locale });
                },
            }),
            // With Turnstile on, the HTTP endpoints need a token too; the app's own forms go through server
            // actions that verify it, so this closes the door a bot would use to skip the form.
            ...(process.env.TURNSTILE_SECRET_KEY
                ? [captcha({
                    provider: "cloudflare-turnstile", secretKey: process.env.TURNSTILE_SECRET_KEY,
                    endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset", "/sign-in/magic-link"],
                })]
                : []),
            nextCookies(),
        ],
});

let authInstance: ReturnType<typeof createAuth> | null = null;

export const getAuth = async () => {
    // Better Auth keeps the Db it was given. On Workers that Db is this request's
    // createConnection; caching the instance would point a later request at dead sockets.
    if (!isWorkersRuntime() && authInstance) return authInstance;

    // Without a secret better-auth falls back to a public default anyone could forge sessions with (1.7 refuses it in
    // production too); fail here first, before connecting. Checked on first use, not at import, so `next build` needs no secrets.
    if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET && !process.env.AUTH_SECRET) {
        throw new Error('BETTER_AUTH_SECRET must be set in production');
    }

    const mongoose = await connectToDatabase();
    const database = mongoose.connection.db;
    if (!database) {
        throw new Error("MongoDB connection not found!");
    }

    const instance = createAuth(database);
    if (!isWorkersRuntime()) authInstance = instance;
    return instance;
}

type Auth = ReturnType<typeof createAuth>;

// Connects on first use, not at import: `next build` imports this module while collecting page data, and a
// top-level `await getAuth()` made every build (Docker, Railway, CI) need a reachable MongoDB.
export const auth = {
    api: new Proxy({} as Auth['api'], {
        get: (_, method) => async (...args: unknown[]) => {
            const { api } = await getAuth();
            return (api[method as keyof Auth['api']] as (...a: unknown[]) => unknown)(...args);
        },
    }),
    handler: async (request: Request) => (await getAuth()).handler(request),
};

// One session lookup per request, shared by layouts, pages and actions
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

// Server actions are public endpoints: never trust a userId sent from the client.
export const requireUserId = async () => {
    const session = await getSession();
    if (!session?.user) throw new Error("Unauthorized");
    return session.user.id;
}
