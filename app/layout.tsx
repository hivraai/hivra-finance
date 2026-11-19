import type { Metadata, Viewport } from "next";
import { Inter, Poppins, IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import {Toaster} from "@/components/ui/sonner";
import "./globals.css";

// hivra.ai's faces: Inter for text, Poppins for headlines.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// The Latin display face has no Arabic glyphs. Only Arabic pages use this one (see globals.css),
// so it isn't preloaded on the rest.
const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Stops iOS zooming into a form field on focus; pinch-zoom still works on iOS.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d12",
  // No colorScheme here: a dark color-scheme on the page makes browsers paint the light-scheme
  // TradingView iframes with an opaque white backdrop, so every widget card turns white.
};

export const metadata: Metadata = {
  title: "HIVRA Finance",
  applicationName: "HIVRA Finance",
  appleWebApp: { capable: true, title: "HIVRA Finance", statusBarStyle: "black-translucent" },
  icons: { apple: "/hivra-finance-logo-512.png" },
  description: "Options research and backtesting with an AI analyst. Market analytics software, not investment advice.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body
                className={`${inter.variable} ${poppins.variable} ${arabic.variable} ${plexMono.variable} font-sans antialiased`}
            >
                {children}
                <Toaster/>
                <Analytics />
            </body>
        </html>
    );
}
