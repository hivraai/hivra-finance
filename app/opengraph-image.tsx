import { ImageResponse } from 'next/og';

// The share card for every page without its own (link previews on X, LinkedIn, WhatsApp, Slack, iMessage).
export const alt = 'HIVRA Finance: AI analyst, options desk and backtests';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CANDLES = [
    { h: 120, b: 60, up: true }, { h: 150, b: 90, up: false }, { h: 170, b: 80, up: true }, { h: 140, b: 110, up: true },
    { h: 210, b: 120, up: true }, { h: 180, b: 150, up: false }, { h: 240, b: 140, up: true }, { h: 290, b: 170, up: true },
];

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0b0d12', padding: 72, fontFamily: 'sans-serif', color: '#f4f4f5' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#12141a', border: '3px solid #4f7cf7', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, padding: 12 }}>
                            <div style={{ width: 8, height: 18, background: '#4f7cf7', borderRadius: 2 }} />
                            <div style={{ width: 8, height: 28, background: '#7aa2ff', borderRadius: 2 }} />
                            <div style={{ width: 8, height: 36, background: '#4f7cf7', borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
                            HIVRA<span style={{ color: '#7aa2ff', marginLeft: 12 }}>Finance</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 640 }}>
                            Research the trade before you make it.
                        </div>
                        <div style={{ fontSize: 28, color: '#a1a1aa', maxWidth: 620 }}>
                            AI analyst · options desk with Greeks · backtests since 2018
                        </div>
                    </div>
                    <div style={{ display: 'flex', fontSize: 24, color: '#71717a' }}>finance.hivra.ai</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, paddingBottom: 40 }}>
                    {CANDLES.map((c, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: c.h + 40, justifyContent: 'flex-end' }}>
                            <div style={{ width: 4, height: c.h, background: c.up ? '#22c55e' : '#ef4444', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ position: 'absolute', width: 28, height: c.b * 0.6, background: c.up ? '#22c55e' : '#ef4444', borderRadius: 4 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        size,
    );
}
