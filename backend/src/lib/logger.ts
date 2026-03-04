const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
} as const

const ACTION_COLOR: Record<string, string> = {
  created: C.green,
  updated: C.yellow,
  deleted: C.red,
  expired: C.magenta,
  ttl_extended: C.cyan,
}

const TYPE_COLOR: Record<string, string> = {
  event: C.bgBlue + C.white,
  rsvp: C.bgGreen + C.white,
  approval: C.bgYellow + C.white,
  checkin: C.cyan,
  profile: C.magenta,
  event_record: C.blue,
  unknown: C.dim,
}

function ts(): string {
  return new Date().toISOString()
}

export function logEntityEvent(
  action: string,
  entityType: string,
  summary: string,
  details: Record<string, unknown>,
): void {
  const t = `${C.dim}${ts()}${C.reset}`
  const a = `${ACTION_COLOR[action] ?? C.white}${action.toUpperCase().padEnd(12)}${C.reset}`
  const typ = `${TYPE_COLOR[entityType] ?? C.dim} ${entityType.toUpperCase()} ${C.reset}`

  console.log(`${t} ${a} ${typ} ${summary}`)
  console.log(`${C.dim}  ${JSON.stringify(details)}${C.reset}`)
}

export function logError(ctx: string, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(`${C.dim}${ts()}${C.reset} ${C.red}ERROR${C.reset} [${ctx}] ${msg}`)
}

export function logInfo(message: string): void {
  console.log(`${C.dim}${ts()}${C.reset} ${C.blue}INFO${C.reset}  ${message}`)
}
