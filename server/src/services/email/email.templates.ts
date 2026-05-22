/**
 * TexQtic branded transactional email shell — F1-P6A
 *
 * Scope: public inquiry notification emails only (Phase 1).
 * Future expansion (F1-P6C): invite / password-reset / email-verification emails.
 *
 * Design constraints:
 *   - Inline styles only (email-client safe; no external CSS)
 *   - No external fonts
 *   - No JavaScript
 *   - No tracking pixels
 *   - Logo: absolute HTTPS URL via logoUrl param; styled text fallback when absent
 *   - Email remains readable when images are blocked
 *   - Legal footer: text-only (legal links deferred — PRIT-034 open)
 *
 * HTML escape: all dynamic content passed through escHtml() to prevent injection.
 */

export interface InquiryEmailShellOptions {
  /** Short heading displayed prominently below the logo. Rendered as <h1>. */
  heading: string;
  /** Body content paragraphs. Each item renders as one <p> in HTML; newline-joined in plain text. */
  lines: string[];
  /**
   * Absolute HTTPS URL to the full TexQtic logo PNG.
   * Constructed by callers as `${FRONTEND_URL}/brand/texqtic-logo.png`.
   * When absent or empty, a styled text brand mark is used — email remains readable
   * without the image.
   */
  logoUrl?: string;
}

export interface InquiryEmailBodies {
  html: string;
  text: string;
}

/**
 * Build branded HTML and plain-text bodies for a TexQtic inquiry email.
 *
 * HTML uses table-based layout with inline styles for maximum email-client
 * compatibility (Outlook, Gmail, Apple Mail). Plain text is always included
 * as a readable fallback.
 */
export function buildInquiryEmailBodies(opts: InquiryEmailShellOptions): InquiryEmailBodies {
  const { heading, lines, logoUrl } = opts;

  // ── Header brand block ───────────────────────────────────────────────────
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="TexQtic" width="160" height="auto" style="display:block;height:auto;max-height:48px;border:0;line-height:1;" />`
    : `<span style="font-size:20px;font-weight:700;color:#0a2036;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif;">TexQtic</span>`;

  // ── Body paragraphs ──────────────────────────────────────────────────────
  const bodyParagraphs = lines
    .map(
      l =>
        `              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${escHtml(l)}</p>`,
    )
    .join('\n');

  // ── Full HTML shell ──────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;">
          <tr>
            <td style="padding:24px 32px 20px;border-bottom:2px solid #f0f0f0;">
              ${logoBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#0a2036;line-height:1.3;">${escHtml(heading)}</h1>
${bodyParagraphs}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">TexQtic &middot; Transactional notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // ── Plain-text fallback ──────────────────────────────────────────────────
  const text = [heading, '', ...lines, '', 'TexQtic · Transactional notification'].join('\n');

  return { html, text };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Minimal HTML escape — prevents injection from dynamic content (category / slug / band). */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
