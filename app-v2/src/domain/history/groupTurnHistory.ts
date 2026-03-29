import { compareISODates } from '../../lib/dates'
import type { Arch } from '../types'

export interface TurnLogRow {
  id: string
  date: string
  arch: Arch
  note: string | null
}

export interface HistoryDayGroup {
  date: string
  top: TurnLogRow | null
  bottom: TurnLogRow | null
  note: string | null
}

/** Newest dates first; within a day keeps top/bottom rows. */
export function groupTurnHistory(turns: TurnLogRow[], limit = 20): HistoryDayGroup[] {
  const byDate = new Map<string, TurnLogRow[]>()
  for (const t of turns) {
    const list = byDate.get(t.date) ?? []
    list.push(t)
    byDate.set(t.date, list)
  }

  const sortedDates = [...byDate.keys()].sort((a, b) => compareISODates(b, a))

  return sortedDates.slice(0, limit).map((date) => {
    const dateTurns = byDate.get(date) ?? []
    const top = dateTurns.find((t) => t.arch === 'top') ?? null
    const bottom = dateTurns.find((t) => t.arch === 'bottom') ?? null
    const note = top?.note ?? bottom?.note ?? null
    return { date, top, bottom, note }
  })
}

/** Sort like API: date desc, then created_at desc */
export function sortTurnsForDisplay<T extends { date: string; created_at?: string }>(
  turns: T[]
): T[] {
  return [...turns].sort((a, b) => {
    const c = compareISODates(b.date, a.date)
    if (c !== 0) return c
    const ac = a.created_at ?? ''
    const bc = b.created_at ?? ''
    return bc.localeCompare(ac)
  })
}

export function mostRecentTurnId(
  turns: (TurnLogRow & { created_at?: string })[]
): string | null {
  if (turns.length === 0) return null
  const sorted = sortTurnsForDisplay(turns)
  return sorted[0]?.id ?? null
}
