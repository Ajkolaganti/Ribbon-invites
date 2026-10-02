type EmailRow = { label: string; value: string }

type EmailLayout = {
  kicker: string
  title: string
  intro: string
  accent?: string
  poster?: { src: string; alt: string; href?: string }
  rows?: EmailRow[]
  note?: string
  action?: { href: string; label: string }
  secondary?: { href: string; label: string }
  footer?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch {
    return ''
  }
  return ''
}

function button(href: string, label: string, filled: boolean) {
  const url = safeUrl(href)
  if (!url) return ''
  const style = filled
    ? 'display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:12px 18px;border-radius:999px;'
    : 'display:inline-block;background:#ffffff;color:#1c1917;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:11px 18px;border-radius:999px;border:1px solid #1c1917;'
  return `<a href="${escapeHtml(url)}" style="${style}">${escapeHtml(label)}</a>`
}

export function emailHtml(layout: EmailLayout) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(layout.accent ?? '') ? layout.accent : '#1c1917'
  const posterSrc = layout.poster ? safeUrl(layout.poster.src) : ''
  const posterHref = layout.poster?.href ? safeUrl(layout.poster.href) : ''
  const image = posterSrc
    ? `<img src="${escapeHtml(posterSrc)}" alt="${escapeHtml(layout.poster?.alt ?? 'Ribbon film')}" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:16px;" />`
    : ''
  const poster = image
    ? `<tr><td style="padding:18px 28px 0;">${posterHref ? `<a href="${escapeHtml(posterHref)}" style="text-decoration:none;">${image}</a>` : image}</td></tr>`
    : ''

  const rows = (layout.rows ?? [])
    .filter((row) => row.value.trim())
    .map(
      (row) => `<tr>
        <td style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6d675f;">${escapeHtml(row.label)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.35;color:#1c1917;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('')

  const note = layout.note?.trim()
    ? `<tr><td style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c1917;">${escapeHtml(layout.note).replace(/\n/g, '<br>')}</td></tr>`
    : ''

  const primary = layout.action ? button(layout.action.href, layout.action.label, true) : ''
  const secondary = layout.secondary ? button(layout.secondary.href, layout.secondary.label, false) : ''
  const actions =
    primary || secondary
      ? `<tr><td style="padding:22px 0 0;">${primary}${secondary ? `&nbsp;&nbsp;${secondary}` : ''}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f2ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e4ddd4;border-radius:18px;overflow:hidden;">
            <tr><td style="height:4px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:22px 28px 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;letter-spacing:-0.03em;color:#1c1917;">Ribbon</td>
            </tr>
            ${poster}
            <tr>
              <td style="padding:20px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;color:#6d675f;">${escapeHtml(layout.kicker)}</td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.05;letter-spacing:-0.03em;color:#1c1917;">${escapeHtml(layout.title)}</td>
            </tr>
            <tr>
              <td style="padding:12px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1c1917;">${escapeHtml(layout.intro)}</td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${note}${actions}</table>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6d675f;">${escapeHtml(layout.footer ?? 'Invites that play like a short film.')}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
