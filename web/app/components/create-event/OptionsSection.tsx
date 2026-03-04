"use client"

import { useState, useRef, useEffect } from "react"
import { Ticket, ShieldCheck, Users } from "lucide-react"

interface OptionsSectionProps {
  ticketPrice: number
  requiresApproval: boolean
  maxCapacity: number
  onTicketPriceChange: (val: number) => void
  onRequiresApprovalChange: (val: boolean) => void
  onMaxCapacityChange: (val: number) => void
}

export function OptionsSection({
  ticketPrice,
  requiresApproval,
  maxCapacity,
  onTicketPriceChange,
  onRequiresApprovalChange,
  onMaxCapacityChange,
}: OptionsSectionProps) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [priceText, setPriceText] = useState("")
  const priceRef = useRef<HTMLInputElement>(null)
  const capRef = useRef<HTMLInputElement>(null)

  const isPriced = ticketPrice > 0

  useEffect(() => {
    if (editingPrice) priceRef.current?.focus()
  }, [editingPrice])

  useEffect(() => {
    if (editingCapacity) capRef.current?.focus()
  }, [editingCapacity])

  const openPriceEdit = () => {
    setPriceText(ticketPrice > 0 ? String(ticketPrice) : "")
    setEditingPrice(true)
  }

  const commitPrice = () => {
    const parsed = parseFloat(priceText)
    onTicketPriceChange(isNaN(parsed) || parsed < 0 ? 0 : parsed)
    setEditingPrice(false)
  }

  const formatPrice = (price: number) => {
    if (price === 0) return "Free"
    // Show full precision — no rounding
    return `${price} ETH`
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Ticket Price */}
      <div className="flex items-center justify-between bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Ticket Price</span>
        </div>
        {editingPrice ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={priceRef}
              type="text"
              inputMode="decimal"
              value={priceText}
              onChange={(e) => {
                // Allow digits, dots, and empty
                const v = e.target.value
                if (v === "" || /^\d*\.?\d*$/.test(v)) setPriceText(v)
              }}
              onBlur={commitPrice}
              onKeyDown={(e) => { if (e.key === "Enter") commitPrice() }}
              placeholder="0.00"
              className="h-8 w-24 rounded-xl border border-primary/30 bg-primary/5 px-2.5 text-right text-sm font-medium text-foreground outline-none"
            />
            <span className="text-xs font-medium text-muted-foreground">ETH</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPriceEdit}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60"
          >
            {formatPrice(ticketPrice)}
          </button>
        )}
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Require Approval */}
      <div className="flex items-center justify-between bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Require Approval</span>
            {isPriced && (
              <span className="text-[11px] text-muted-foreground/70">Auto-off for paid events</span>
            )}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={requiresApproval}
          disabled={isPriced}
          onClick={() => onRequiresApprovalChange(!requiresApproval)}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
            isPriced
              ? "cursor-not-allowed bg-muted"
              : requiresApproval
                ? "bg-primary"
                : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 translate-y-1 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              requiresApproval && !isPriced ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="mx-4 h-px bg-border" />

      {/* Capacity */}
      <div className="flex items-center justify-between bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Capacity</span>
        </div>
        {editingCapacity ? (
          <input
            ref={capRef}
            type="number"
            min="0"
            value={maxCapacity || ""}
            onChange={(e) => onMaxCapacityChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            onBlur={() => setEditingCapacity(false)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditingCapacity(false) }}
            placeholder="0"
            className="h-8 w-20 rounded-xl border border-primary/30 bg-primary/5 px-2.5 text-right text-sm font-medium text-foreground outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingCapacity(true)}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60"
          >
            {maxCapacity > 0 ? maxCapacity : "Unlimited"}
          </button>
        )}
      </div>
    </div>
  )
}
