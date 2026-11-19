import { escapeHtml } from "@/lib/utils";

// One look for every HIVRA Finance email: dark card, the HIVRA Finance mark, one blue pill button.
// Table layout and inline styles only, so Gmail, Outlook and Apple Mail render it the same.
// `body` is trusted markup built by the caller from escaped text; everything else is escaped here.
export function emailLayout({ lang, preheader, heading, body, cta, href, note, footer }: {
    lang: string; preheader: string; heading: string; body: string;
    cta?: string; href?: string; note?: string; footer: string;
}): string {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const button = cta && href
        ? `<tr><td style="padding:8px 0 4px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#4f7cf7;color:#ffffff;padding:13px 26px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:15px;">${escapeHtml(cta)}</a></td></tr>`
        : '';
    const noteRow = note ? `<tr><td style="padding:24px 0 0;color:#71717a;font-size:12.5px;line-height:1.6;">${escapeHtml(note)}</td></tr>` : '';
    return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${dir}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#0b0d12;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b0d12;"><tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
    <tr><td style="padding:0 4px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="vertical-align:middle;"><img src="https://finance.hivra.ai/hivra-finance-logo.png" width="32" height="32" alt="" style="display:block;border-radius:8px;"></td>
        <td style="vertical-align:middle;padding:0 10px;font-family:Inter,Arial,sans-serif;font-size:16px;font-weight:800;letter-spacing:-0.02em;color:#f4f4f5;">HIVRA <span style="color:#7aa2ff;">Finance</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#12141a;border:1px solid #23262f;border-radius:16px;padding:32px;font-family:Inter,Arial,sans-serif;color:#e4e4e7;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="padding:0 0 14px;font-size:24px;font-weight:700;letter-spacing:-0.03em;color:#ffffff;line-height:1.25;">${escapeHtml(heading)}</td></tr>
        <tr><td style="padding:0 0 22px;font-size:15px;line-height:1.65;color:#a1a1aa;">${body}</td></tr>
        ${button}
        ${noteRow}
      </table>
    </td></tr>
    <tr><td style="padding:20px 4px 0;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.6;color:#52525b;">${footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// A feature list row: bold title, muted line under it.
export function featureRows(items: { title: string; body: string }[]): string {
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 4px;">${items.map((i) => `
<tr><td style="padding:10px 0;border-top:1px solid #23262f;">
  <div style="font-size:14px;font-weight:700;color:#f4f4f5;">${escapeHtml(i.title)}</div>
  <div style="font-size:13.5px;line-height:1.55;color:#a1a1aa;padding-top:2px;">${escapeHtml(i.body)}</div>
</td></tr>`).join('')}</table>`;
}

// The members' WhatsApp group: a green "Join" pill and the QR to scan from a computer.
// `href` and `qrSrc` come from lib/community.ts (env-only invite link, signed QR URL), never from user input.
export function whatsappBlock({ title, body, cta, scan, href, qrSrc }: {
    title: string; body: string; cta: string; scan: string; href: string; qrSrc: string;
}): string {
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 0;background:#0e1a14;border:1px solid #1d3a2a;border-radius:14px;">
<tr><td style="padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
    <td style="vertical-align:top;">
      <div style="font-size:15px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</div>
      <div style="font-size:13.5px;line-height:1.55;color:#a1a1aa;padding:4px 0 14px;">${escapeHtml(body)}</div>
      <a href="${escapeHtml(href)}" style="display:inline-block;background:#25d366;color:#0b0d12;padding:11px 20px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(cta)}</a>
    </td>
    <td width="112" style="vertical-align:top;padding-left:16px;text-align:center;">
      <img src="${escapeHtml(qrSrc)}" width="112" height="112" alt="QR" style="display:block;border-radius:10px;background:#ffffff;">
      <div style="font-size:11px;color:#71717a;padding-top:6px;">${escapeHtml(scan)}</div>
    </td>
  </tr></table>
</td></tr></table>`;
}
