import { getEmailForWallet } from './privy.js'
import { sendEmail } from './email.js'
import { logInfo, logError } from './logger.js'

function checkinEmailHtml(eventTitle: string, method: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="background:linear-gradient(135deg,#f5f3ff,#fff);border-radius:16px;border:1px solid #c4b5fd;padding:32px 24px;text-align:center">
      <div style="width:48px;height:48px;background:#8b5cf6;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:24px">&#10003;</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">You're checked in!</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#78716c">
        You've been successfully checked in to <strong>${eventTitle}</strong> via <strong>${method}</strong>. Enjoy the event!
      </p>
      <div style="height:1px;background:#c4b5fd;margin:20px 0"></div>
      <p style="margin:0;font-size:12px;color:#a8a29e">Sent via Gath3r</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendCheckinEmail(
  attendeeWallet: string,
  eventTitle: string,
  method: string,
): Promise<void> {
  const email = await getEmailForWallet(attendeeWallet)

  if (!email) {
    logInfo(`[checkin-email] No email found for wallet ${attendeeWallet} — skipping notification`)
    return
  }

  const result = await sendEmail({
    to: [email],
    subject: `You're checked in to ${eventTitle}!`,
    html: checkinEmailHtml(eventTitle, method),
  })

  if (result.success) {
    logInfo(`[checkin-email] Sent check-in email to ${email} for "${eventTitle}"`)
  } else {
    logError('checkin-email', `Failed to send check-in email to ${email}: ${result.error}`)
  }
}
