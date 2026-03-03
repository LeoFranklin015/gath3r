import type { EventPayload, ArkivEntity } from '@/lib/arkiv/types'

interface EventCardProps {
  event: ArkivEntity<EventPayload>
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const { payload } = event
  const eventDate = new Date(payload.startTime * 1000)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <p className="text-xs text-zinc-500 mb-1">
        
        {eventDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
        {payload.location ? ` · ${payload.location}` : ''}
      </p>
      <h3 className="text-sm font-semibold text-white">{payload.title}</h3>
      {payload.description && (
        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{payload.description}</p>
      )}
      {payload.tags && payload.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {payload.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
