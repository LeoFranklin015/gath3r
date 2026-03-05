"use client"

import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"

export type TimeFilter = "all" | "today" | "this-week" | "this-month"
export type PriceFilter = "all" | "free" | "paid"
export type AccessFilter = "all" | "open" | "invite-only"

export interface DiscoverFiltersProps {
  availableCities: string[]
  cityFilter: string | undefined
  timeFilter: TimeFilter
  priceFilter: PriceFilter
  accessFilter: AccessFilter
  onCityChange: (city: string | undefined) => void
  onTimeChange: (t: TimeFilter) => void
  onPriceChange: (p: PriceFilter) => void
  onAccessChange: (a: AccessFilter) => void
}

type FilterKey = "city" | "time" | "price" | "access"

const TIME_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
]

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
]

const ACCESS_OPTIONS: { value: AccessFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "invite-only", label: "Invite Only" },
]

export function DiscoverFilters({
  availableCities,
  cityFilter,
  timeFilter,
  priceFilter,
  accessFilter,
  onCityChange,
  onTimeChange,
  onPriceChange,
  onAccessChange,
}: DiscoverFiltersProps) {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)

  const toggle = (key: FilterKey) =>
    setOpenFilter((prev) => (prev === key ? null : key))

  const cityLabel = cityFilter ?? "City"
  const timeLabel =
    timeFilter === "all" ? "When" : TIME_OPTIONS.find((o) => o.value === timeFilter)!.label
  const priceLabel =
    priceFilter === "all" ? "Price" : PRICE_OPTIONS.find((o) => o.value === priceFilter)!.label
  const accessLabel =
    accessFilter === "all" ? "Access" : ACCESS_OPTIONS.find((o) => o.value === accessFilter)!.label

  return (
    <div className="relative z-10">
      {/* Chip strip */}
      <div
        className="flex items-center gap-2 overflow-x-auto px-5 py-2.5"
        style={{ scrollbarWidth: "none" }}
      >
        <Chip
          label={cityLabel}
          active={cityFilter !== undefined}
          onClick={() => toggle("city")}
        />
        <Chip
          label={timeLabel}
          active={timeFilter !== "all"}
          onClick={() => toggle("time")}
        />
        <Chip
          label={priceLabel}
          active={priceFilter !== "all"}
          onClick={() => toggle("price")}
        />
        <Chip
          label={accessLabel}
          active={accessFilter !== "all"}
          onClick={() => toggle("access")}
        />
      </div>

      {/* Dropdown panel */}
      {openFilter && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenFilter(null)}
          />
          <div className="absolute inset-x-0 top-full z-50 mx-4 mt-1 rounded-2xl border border-border/80 bg-background p-2 shadow-xl">
            {openFilter === "city" && (
              <DropdownOptions
                options={[
                  { value: undefined as string | undefined, label: "All Cities" },
                  ...availableCities.map((c) => ({ value: c as string | undefined, label: c })),
                ]}
                selected={cityFilter}
                onSelect={(v) => {
                  onCityChange(v as string | undefined)
                  setOpenFilter(null)
                }}
              />
            )}
            {openFilter === "time" && (
              <DropdownOptions
                options={TIME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                selected={timeFilter}
                onSelect={(v) => {
                  onTimeChange(v as TimeFilter)
                  setOpenFilter(null)
                }}
              />
            )}
            {openFilter === "price" && (
              <DropdownOptions
                options={PRICE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                selected={priceFilter}
                onSelect={(v) => {
                  onPriceChange(v as PriceFilter)
                  setOpenFilter(null)
                }}
              />
            )}
            {openFilter === "access" && (
              <DropdownOptions
                options={ACCESS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                selected={accessFilter}
                onSelect={(v) => {
                  onAccessChange(v as AccessFilter)
                  setOpenFilter(null)
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Private sub-components ─── */

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "border border-border bg-background text-muted-foreground"
      }`}
    >
      {label}
      <ChevronDown className="h-3 w-3" />
    </button>
  )
}

function DropdownOptions<T>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[]
  selected: T
  onSelect: (value: T) => void
}) {
  return (
    <div className="flex flex-col">
      {options.map((opt) => (
        <button
          key={String(opt.value ?? "all")}
          onClick={() => onSelect(opt.value)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/60 active:bg-muted"
        >
          <span>{opt.label}</span>
          {selected === opt.value && <Check className="h-4 w-4 text-foreground" />}
        </button>
      ))}
    </div>
  )
}
