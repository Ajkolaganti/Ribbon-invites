type EmailRow = { label: string; value: string }

type EmailLayout = {
  kicker: string
  title: string
  intro: string
  rows: EmailRow[]
  note?: string
  action?: { href: string; label: string }
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

export function emailHtml(layout: EmailLayout) {
  const rows = layout.rows
    .filter((row) => row.value.trim())
    .map(
      (row) => `<tr>
        <td style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6d675f;">${escapeHtml(row.label)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.35;color:#1c1917;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('')

  const note = layout.note?.trim()
    ? `<tr><td style="padding:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c1917;">${escapeHtml(layout.note).replace(/\n/g, '<br>')}</td></tr>`
    : ''

  const href = layout.action ? safeUrl(layout.action.href) : ''
  const action = href
    ? `<tr><td style="padding:24px 0 0;">
        <a href="${escapeHtml(href)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:12px 18px;border-radius:999px;">${escapeHtml(layout.action?.label ?? 'Open')}</a>
      </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f2ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e4ddd4;border-radius:18px;">
            <tr>
              <td style="padding:28px 32px 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:28px;color:#1c1917;">Ribbon</td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#6d675f;">${escapeHtml(layout.kicker)}</td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;color:#1c1917;">${escapeHtml(layout.title)}</td>
            </tr>
            <tr>
              <td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1c1917;">${escapeHtml(layout.intro)}</td>
            </tr>
            <tr>
              <td style="padding:4px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${note}${action}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#6d675f;">Ribbon sends this because a host invited you or you replied to an invite.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
