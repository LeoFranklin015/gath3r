import { Router } from 'express'
import { sendEmail } from '../lib/email.js'

export const emailRouter = Router()

// POST /email { to: ["a@b.com"], subject: "...", html: "..." }
emailRouter.post('/email', async (req, res) => {
  const { to, subject, html } = req.body ?? {}

  if (!to || !Array.isArray(to) || !to.length) {
    res.status(400).json({ error: '"to" must be a non-empty array of emails' })
    return
  }
  if (!subject || typeof subject !== 'string') {
    res.status(400).json({ error: '"subject" is required' })
    return
  }
  if (!html || typeof html !== 'string') {
    res.status(400).json({ error: '"html" is required' })
    return
  }

  const result = await sendEmail({ to, subject, html })
  res.status(result.success ? 200 : 502).json(result)
})
