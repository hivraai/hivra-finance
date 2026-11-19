'use client';

import { useState } from "react";
import { LineChart } from "lucide-react";
import { sourceLogoUrl } from "@/lib/news/source-logo";

// The index provider's or the coin's own icon for a pulse tile; metals get a disc in the metal's colour.
// Anything unmapped (or an icon that fails to load) keeps the plain line-chart glyph.
const LOGO_DOMAIN: Record<string, string> = {
    SPY: 'spglobal.com', 'AMEX:SPY': 'spglobal.com',
    QQQ: 'nasdaq.com', 'NASDAQ:QQQ': 'nasdaq.com',
    DIA: 'dowjones.com', 'AMEX:DIA': 'dowjones.com',
    IWM: 'lseg.com', 'AMEX:IWM': 'lseg.com',
    'TSE:N225': 'nikkei.com', 'HKEX:HSI': 'hsi.com.hk', 'SSE:SHCOMP': 'sse.com.cn', 'KRX:KOSPI': 'krx.co.kr', 'TWSE:TAIEX': 'twse.com.tw',
    'TADAWUL:TASI': 'saudiexchange.sa', 'GPW:WIG20': 'gpw.pl', 'GPW:WIG': 'gpw.pl', 'GPW:MWIG40': 'gpw.pl', 'GPW:SWIG80': 'gpw.pl',
    'CME:ES': 'cmegroup.com', 'CME:NQ': 'cmegroup.com', 'CME:YM': 'cmegroup.com', 'CME:RTY': 'cmegroup.com',
    'NYMEX:CRUDE': 'cmegroup.com', 'NYMEX:BRENT': 'cmegroup.com', 'NYMEX:NATGAS': 'cmegroup.com', 'CBOT:ZN': 'cmegroup.com', 'CBOT:ZB': 'cmegroup.com', 'CBOE:VIX': 'cboe.com',
    'BINANCE:BTCUSDT': 'bitcoin.org', 'BINANCE:ETHUSDT': 'ethereum.org', 'BINANCE:SOLUSDT': 'solana.com', 'BINANCE:BNBUSDT': 'bnbchain.org',
};

const METAL: Record<string, string> = {
    'COMEX:GOLD': 'linear-gradient(135deg,#f6e27a,#c9a227 55%,#8a6d12)',
    'COMEX:SILVER': 'linear-gradient(135deg,#f4f5f7,#b8bcc4 55%,#7c818b)',
    'COMEX:COPPER': 'linear-gradient(135deg,#f0a77a,#b8693d 55%,#7a3f1f)',
    'COMEX:ALUMINUM': 'linear-gradient(135deg,#eef1f4,#a9b1ba 55%,#6f7882)',
    'NYMEX:PLATINUM': 'linear-gradient(135deg,#f2f3f1,#c7c9c4 55%,#8d8f89)',
    'NYMEX:PALLADIUM': 'linear-gradient(135deg,#ece9e4,#b9b2a6 55%,#80796d)',
};

export default function TileIcon({ symbol }: { symbol: string }) {
    const key = symbol.toUpperCase();
    const domain = LOGO_DOMAIN[key];
    const [failed, setFailed] = useState(false);
    if (METAL[key]) return <span className="bento-ico" style={{ background: METAL[key] }} aria-hidden />;
    if (domain && !failed) {
        return (
            <span className="bento-ico overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sourceLogoUrl(domain)} alt="" width={18} height={18} className="size-[18px]" onError={() => setFailed(true)} />
            </span>
        );
    }
    return <span className="bento-ico"><LineChart /></span>;
}
