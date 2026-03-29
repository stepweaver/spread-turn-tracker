/** Parse YYYY-MM-DD as local calendar date (matches legacy app.js). */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3) return new Date(dateStr)
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

export function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISODateLocal(now = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return toISODateLocal(d)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function daysBetweenCalendar(a: Date, b: Date): number {
  const dateA = new Date(a)
  const dateB = new Date(b)
  dateA.setHours(0, 0, 0, 0)
  dateB.setHours(0, 0, 0, 0)
  return Math.floor((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))
}

/** Monday-start week (ISO-style weekday), matching legacy app.js getWeekStart. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function compareISODates(a: string, b: string): number {
  return a.localeCompare(b)
}

export function formatDateDisplay(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const d = parseLocalDate(iso)
  if (Number.isNaN(d.getTime())) return 'Invalid'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
