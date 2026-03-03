'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface EventFormData {
  title: string
  description: string
  location: string
  city: string
  startTime: number   // unix timestamp
  endTime: number     // unix timestamp
  maxCapacity: number
  requiresApproval: boolean
  tags: string[]
  imageUrl: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
}

// Format Date to datetime-local value string (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(s: string): number {
  // getTime() returns integer ms, but floor both to guarantee an integer Unix timestamp
  return Math.floor(Math.floor(new Date(s).getTime()) / 1000)
}

function defaultTimes() {
  const start = new Date(Date.now() + 60 * 60 * 1000)       // +1 h
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000)     // +2 h
  return { start: toDatetimeLocal(start), end: toDatetimeLocal(end) }
}

export function CreateEventModal({ open, onClose, onSubmit }: Props) {
  const defaults = defaultTimes()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [startTime, setStartTime] = useState(defaults.start)
  const [endTime, setEndTime] = useState(defaults.end)
  const [maxCapacity, setMaxCapacity] = useState('0')
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [tags, setTags] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const t = defaultTimes()
      setTitle('')
      setDescription('')
      setLocation('')
      setCity('')
      setStartTime(t.start)
      setEndTime(t.end)
      setMaxCapacity('0')
      setRequiresApproval(true)
      setTags('')
      setImageUrl('')
      setError(null)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const start = fromDatetimeLocal(startTime)
    const end = fromDatetimeLocal(endTime)

    if (!title.trim()) { setError('Title is required.'); return }
    if (!city.trim()) { setError('City is required (used for indexing).'); return }
    if (!startTime || !endTime) { setError('Start and end times are required.'); return }
    if (end <= start) { setError('End time must be after start time.'); return }

    const data: EventFormData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      city: city.trim(),
      startTime: start,
      endTime: end,
      maxCapacity: Math.max(0, parseInt(maxCapacity, 10) || 0),
      requiresApproval,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      imageUrl: imageUrl.trim(),
    }

    setSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-white">Create Event</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh]">
            <div className="px-5 py-4 space-y-4">

              <Field label="Title" required>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Event title"
                  className={inputCls}
                  required
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <Input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Full address"
                    className={inputCls}
                  />
                </Field>
                <Field label="City" required>
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="City"
                    className={inputCls}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" required>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className={`${inputCls} [color-scheme:dark]`}
                    required
                  />
                </Field>
                <Field label="End" required>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className={`${inputCls} [color-scheme:dark]`}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Capacity">
                  <Input
                    type="number"
                    min="0"
                    value={maxCapacity}
                    onChange={e => setMaxCapacity(e.target.value)}
                    placeholder="0 = unlimited"
                    className={inputCls}
                  />
                </Field>
                <Field label="Tags">
                  <Input
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="web3, meetup, dev"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Image URL">
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
              </Field>

              {/* Requires Approval toggle */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div>
                  <p className="text-sm text-zinc-200 font-medium">Requires Approval</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Attendees need host approval before they can check in
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requiresApproval}
                  onClick={() => setRequiresApproval(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    requiresApproval ? 'bg-white' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-zinc-950 shadow transform transition-transform ${
                      requiresApproval ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-800 flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="rounded-xl min-w-28"
              >
                {submitting ? '⏳ Publishing\u2026' : 'Create & Publish'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

const inputCls =
  'h-9 text-sm bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 rounded-xl w-full'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {required && <span className="text-xs text-zinc-600">*</span>}
      </label>
      {children}
    </div>
  )
}
