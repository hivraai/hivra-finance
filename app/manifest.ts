import type { MetadataRoute } from "next";

// "Add to Home Screen": opens full screen, like an app, straight into the dashboard.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "HIVRA Finance",
        short_name: "HIVRA Finance",
        description: "Options research and backtesting with an AI analyst.",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0d12",
        theme_color: "#0b0d12",
        icons: [
            { src: "/hivra-finance-logo.png", sizes: "120x120", type: "image/png" },
            { src: "/hivra-finance-logo-512.png", sizes: "512x512", type: "image/png" },
            { src: "/hivra-finance-logo-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
