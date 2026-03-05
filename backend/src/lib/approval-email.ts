import { getEmailForWallet } from './privy.js'
import { sendEmail } from './email.js'
import { logInfo, logError } from './logger.js'

function approvalEmailHtml(eventTitle: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="background:linear-gradient(135deg,#ecfdf5,#fff);border-radius:16px;border:1px solid #86efac;padding:32px 24px;text-align:center">
      <div style="width:48px;height:48px;background:#22c55e;border-radius:12px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:24px">&#10003;</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1c1917">You're approved!</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#78716c">
        Congratulations! Your registration for <strong>${eventTitle}</strong> has been approved by the host.
      </p>
      <p style="margin:0 0 20px;font-size:14px;color:#78716c">
        You're all set to attend. We look forward to seeing you there!
      </p>
      <div style="height:1px;background:#86efac;margin:20px 0"></div>
      <p style="margin:0;font-size:12px;color:#a8a29e">Sent via Gath3r</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendApprovalEmail(
  attendeeWallet: string,
  eventTitle: string,
): Promise<void> {
  const email = await getEmailForWallet(attendeeWallet)

  if (!email) {
    logInfo(`[approval-email] No email found for wallet ${attendeeWallet} — skipping notification`)
    return
  }

  const result = await sendEmail({
    to: [email],
    subject: `You're approved for ${eventTitle}!`,
    html: approvalEmailHtml(eventTitle),
  })

  if (result.success) {
    logInfo(`[approval-email] Sent approval email to ${email} for "${eventTitle}"`)
  } else {
    logError('approval-email', `Failed to send approval email to ${email}: ${result.error}`)
  }
}
