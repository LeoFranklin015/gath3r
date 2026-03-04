export interface CalendarEvent {
  title: string
  description: string
  location: string
  startTime: number // unix seconds
  endTime: number   // unix seconds
  url?: string
}

function fmtICS(ts: number): string {
  return new Date(ts * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '')
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function generateICS(event: CalendarEvent): string {
  const now = fmtICS(Date.now() / 1000)
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@gath3r.app`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gath3r//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmtICS(event.startTime)}`,
    `DTEND:${fmtICS(event.endTime)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    ...(event.url ? [`URL:${event.url}`] : []),
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function googleCalendarURL(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmtICS(event.startTime)}/${fmtICS(event.endTime)}`,
    details: event.description || '',
    location: event.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
