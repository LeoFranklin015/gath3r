import { getEmailForWallet } from './privy.js'
import { sendEmail } from './email.js'
import { logInfo, logError } from './logger.js'

function rsvpEmailHtml(eventTitle: string, status: string): string {
  const isConfirmed = status === 'confirmed'
  const heading = isConfirmed ? "You're registered!" : 'RSVP received'
  const message = isConfirmed
    ? `Your registration for <strong>${eventTitle}</strong> has been confirmed. You're all set to attend!`
    : `Your RSVP for <strong>${eventTitle}</strong> has been received and is currently <strong>${status}</strong>. You'll be notified when the host reviews your registration.`
  const badgeColor = isConfirmed ? '#3b82f6' : '#f59e0b'
  const borderColor = isConfirmed ? '#93c5fd' : '#fcd34d'
  const bgGradient = isConfirmed
    ? 'linear-gradient(135deg,#eff6ff,#fff)'
    : 'linear-gradient(135deg,#fffbeb,#fff)'
  const icon = isConfirmed ? '&#9993;' : '&#9203;'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="background:${bgGradient};border-radius:16px;border:1px solid ${borderColor};padding:32px 24px;text-align:center">
      <div style="width:48px;height:48px;background:${badgeColor};border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:24px">${icon}</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">${heading}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#78716c">${message}</p>
      <div style="height:1px;background:${borderColor};margin:20px 0"></div>
      <p style="margin:0;font-size:12px;color:#a8a29e">Sent via Gath3r</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendRsvpEmail(
  attendeeWallet: string,
  eventTitle: string,
  status: string,
): Promise<void> {
  const email = await getEmailForWallet(attendeeWallet)

  if (!email) {
    logInfo(`[rsvp-email] No email found for wallet ${attendeeWallet} — skipping notification`)
    return
  }

  const isConfirmed = status === 'confirmed'
  const subject = isConfirmed
    ? `You're registered for ${eventTitle}!`
    : `RSVP received for ${eventTitle}`

  const result = await sendEmail({
    to: [email],
    subject,
    html: rsvpEmailHtml(eventTitle, status),
  })

  if (result.success) {
    logInfo(`[rsvp-email] Sent RSVP email to ${email} for "${eventTitle}" [${status}]`)
  } else {
    logError('rsvp-email', `Failed to send RSVP email to ${email}: ${result.error}`)
  }
}
