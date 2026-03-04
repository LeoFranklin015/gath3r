import { logInfo, logError } from './logger.js'

const WORKER_URL = 'https://cloudflare.philosanjay5.workers.dev/'

interface SendEmailInput {
  to: string[]
  subject: string
  html: string
}

interface SendEmailResult {
  success: boolean
  data?: unknown
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const json = await res.json() as Record<string, unknown>

    if (!res.ok || json.error) {
      const err = String(json.error ?? `HTTP ${res.status}`)
      logError('sendEmail', err)
      return { success: false, error: err }
    }

    logInfo(`Email sent to ${input.to.join(', ')}: "${input.subject}"`)
    return { success: true, data: json.data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logError('sendEmail', msg)
    return { success: false, error: msg }
  }
}
