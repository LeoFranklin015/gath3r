import { Router } from 'express'
import { generateICS, googleCalendarURL, type CalendarEvent } from '../lib/calendar.js'
import { sendEmail } from '../lib/email.js'

export const calendarRouter = Router()

// POST /calendar/invite — Send a calendar invite email
// Body: { to: string[], title, description, location, startTime, endTime, eventUrl? }
calendarRouter.post('/calendar/invite', async (req, res) => {
  const { to, title, description, location, startTime, endTime, eventUrl } = req.body ?? {}

  if (!to || !Array.isArray(to) || !to.length) {
    res.status(400).json({ error: '"to" must be a non-empty array of emails' })
    return
  }
  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: '"title" is required' })
    return
  }
  if (!startTime || !endTime) {
    res.status(400).json({ error: '"startTime" and "endTime" are required (unix seconds)' })
    return
  }

  const event: CalendarEvent = {
    title,
    description: description || '',
    location: location || '',
    startTime,
    endTime,
    url: eventUrl,
  }

  const gcalURL = googleCalendarURL(event)
  const icsContent = generateICS(event)
  const icsBase64 = Buffer.from(icsContent).toString('base64')
  const icsDataURI = `data:text/calendar;base64,${icsBase64}`

  const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const fmtTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <div style="background: #18181b; border-radius: 16px; padding: 24px; color: #fff;">
        <p style="font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">You're invited</p>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #fff;">${title}</h1>

        <div style="background: #27272a; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 14px; color: #d4d4d8;">
            <strong style="color: #a1a1aa;">Date:</strong> ${fmtDate(startTime)}
          </p>
          <p style="margin: 0 0 6px; font-size: 14px; color: #d4d4d8;">
            <strong style="color: #a1a1aa;">Time:</strong> ${fmtTime(startTime)} — ${fmtTime(endTime)}
          </p>
          ${location ? `<p style="margin: 0; font-size: 14px; color: #d4d4d8;"><strong style="color: #a1a1aa;">Location:</strong> ${location}</p>` : ''}
        </div>

        ${description ? `<p style="font-size: 14px; color: #a1a1aa; margin: 0 0 20px; line-height: 1.5;">${description}</p>` : ''}

        <div style="text-align: center; margin: 20px 0;">
          <a href="${gcalURL}"
             style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Add to Google Calendar
          </a>
        </div>

        <div style="text-align: center; margin: 12px 0;">
          <a href="${icsDataURI}"
             download="${title.replace(/[^a-zA-Z0-9 ]/g, '')}.ics"
             style="font-size: 13px; color: #60a5fa; text-decoration: underline;">
            Download .ics for Apple Calendar / Outlook
          </a>
        </div>
      </div>
      <p style="text-align: center; font-size: 11px; color: #52525b; margin-top: 16px;">
        Sent via Gath3r
      </p>
    </div>
  `

  const result = await sendEmail({
    to,
    subject: `You're invited: ${title}`,
    html,
  })

  res.status(result.success ? 200 : 502).json(result)
})

// GET /calendar/:eventId/download.ics — Serve .ics file for direct download
// Query: ?title=...&description=...&location=...&startTime=...&endTime=...
calendarRouter.get('/calendar/download.ics', (req, res) => {
  const { title, description, location, startTime, endTime } = req.query

  if (!title || !startTime || !endTime) {
    res.status(400).json({ error: 'title, startTime, endTime are required query params' })
    return
  }

  const event: CalendarEvent = {
    title: String(title),
    description: String(description || ''),
    location: String(location || ''),
    startTime: Number(startTime),
    endTime: Number(endTime),
  }

  const ics = generateICS(event)

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${String(title).replace(/[^a-zA-Z0-9 ]/g, '')}.ics"`)
  res.send(ics)
})
