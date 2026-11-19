import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
    devIndicators: false,
    // /whats-new was live briefly before the changelog replaced it
    async redirects() {
        return [{ source: '/whats-new', destination: '/changelog', permanent: true }];
    },
    // Security headers (audit 2026-11-19: the site sent only Vercel's default
    // HSTS). Same set hivra.ai sends, but framing is refused outright — nothing
    // embeds this app, and /profile (password change) must not load in a
    // stranger's iframe. TradingView's widgets are iframes INSIDE our pages,
    // which frame-ancestors does not touch.
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
                ],
            },
        ];
    },
    turbopack: {
        root: process.cwd(),
    },
    // No remote images: every next/image src is a local file. Allowing a public upload host here (i.ibb.co was)
    // lets anyone feed files to the image optimizer on self-hosted servers.
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    }
};

export default withNextIntl(nextConfig);
