import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "HIVRA Finance",
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
