import {
  addDays,
  compareISODates,
  daysBetweenCalendar,
  getWeekStart,
  parseLocalDate,
  todayISODateLocal,
} from '../../lib/dates'
import { INSTALL_TURN_COUNT } from '../../lib/constants'
import type {
  Arch,
  ArchStatus,
  CanLogTurnResult,
  TreatmentPlanInput,
  TurnLogInput,
} from '../types'

export function countTurnsForArch(turns: TurnLogInput[], arch: Arch): number {
  return turns.filter((t) => t.arch === arch).length
}

/** Latest logged date across arches (legacy dashboard “last logged”). */
export function lastLoggedDisplayDate(turns: TurnLogInput[]): string | null {
  const top = lastDateForArch(turns, 'top')
  const bottom = lastDateForArch(turns, 'bottom')
  if (top && bottom) {
    return compareISODates(top, bottom) > 0 ? top : bottom
  }
  return top ?? bottom
}

export function lastDateForArch(turns: TurnLogInput[], arch: Arch): string | null {
  const forArch = turns.filter((t) => t.arch === arch)
  if (forArch.length === 0) return null
  return forArch.reduce((latest, t) =>
    compareISODates(t.date, latest) > 0 ? t.date : latest
  , forArch[0].date)
}

export function getTurnsThisWeek(
  turns: TurnLogInput[],
  arch: Arch,
  today: Date | string
): number {
  const todayDate = typeof today === 'string' ? parseLocalDate(today) : new Date(today)
  todayDate.setHours(0, 0, 0, 0)
  const weekStart = getWeekStart(todayDate)
  const weekEnd = addDays(weekStart, 6)
  weekEnd.setHours(23, 59, 59, 999)

  return turns.filter((turn) => {
    if (turn.arch !== arch) return false
    const turnDate = parseLocalDate(turn.date)
    return turnDate >= weekStart && turnDate <= weekEnd
  }).length
}

export function canLogTurn(
  plan: TreatmentPlanInput,
  turns: TurnLogInput[],
  arch: Arch,
  today: Date | string = new Date()
): CanLogTurnResult {
  const logged = countTurnsForArch(turns, arch)
  const done = logged + INSTALL_TURN_COUNT
  const total = arch === 'top' ? plan.topTotal : plan.bottomTotal
  const lastDate = lastDateForArch(turns, arch)

  if (done >= total) {
    return { canLog: false, reason: 'complete' }
  }

  if (plan.scheduleType === 'twice_per_week') {
    const turnsThisWeek = getTurnsThisWeek(turns, arch, today)
    if (turnsThisWeek >= 2) {
      return {
        canLog: false,
        reason: 'wait',
        message: 'Already logged 2 turns this week',
      }
    }
    return { canLog: true }
  }

  if (!lastDate) {
    return { canLog: true }
  }

  const todayMid = typeof today === 'string' ? parseLocalDate(today) : new Date(today)
  todayMid.setHours(0, 0, 0, 0)
  const lastTurn = parseLocalDate(lastDate)
  lastTurn.setHours(0, 0, 0, 0)
  const daysSince = daysBetweenCalendar(lastTurn, todayMid)

  if (daysSince < plan.intervalDays) {
    return {
      canLog: false,
      reason: 'wait',
      daysRemaining: plan.intervalDays - daysSince,
    }
  }
  return { canLog: true }
}

export function getNextDueDate(
  plan: TreatmentPlanInput,
  turns: TurnLogInput[],
  arch: Arch,
  today: Date | string = new Date()
): Date | null {
  const logged = countTurnsForArch(turns, arch)
  const done = logged + INSTALL_TURN_COUNT
  const total = arch === 'top' ? plan.topTotal : plan.bottomTotal
  const lastDate = lastDateForArch(turns, arch)

  if (done >= total) {
    return null
  }

  const todayDate = typeof today === 'string' ? parseLocalDate(today) : new Date(today)
  todayDate.setHours(0, 0, 0, 0)

  if (plan.scheduleType === 'twice_per_week') {
    const turnsThisWeek = getTurnsThisWeek(turns, arch, today)
    if (turnsThisWeek < 2) {
      return new Date(todayDate)
    }
    const weekStart = getWeekStart(todayDate)
    return addDays(weekStart, 7)
  }

  if (!lastDate) {
    if (plan.installDate) {
      return addDays(parseLocalDate(plan.installDate), plan.intervalDays)
    }
    return null
  }
  return addDays(parseLocalDate(lastDate), plan.intervalDays)
}

export function getArchStatus(
  plan: TreatmentPlanInput,
  turns: TurnLogInput[],
  arch: Arch,
  today: Date | string = new Date()
): ArchStatus {
  const logged = countTurnsForArch(turns, arch)
  const done = logged + INSTALL_TURN_COUNT
  const total = arch === 'top' ? plan.topTotal : plan.bottomTotal

  if (done >= total) {
    return 'complete'
  }

  const c = canLogTurn(plan, turns, arch, today)
  if (!c.canLog) {
    return c.reason === 'complete' ? 'complete' : 'wait'
  }
  return 'ready'
}

/** Combined “next due” for dashboard: earlier of top/bottom; clamp to today if not in the future (legacy UX). */
export function getDisplayNextDueDate(
  plan: TreatmentPlanInput,
  turns: TurnLogInput[],
  today: Date | string = new Date()
): Date | null {
  const topNext = getNextDueDate(plan, turns, 'top', today)
  const bottomNext = getNextDueDate(plan, turns, 'bottom', today)

  let nextDue: Date | null = null
  if (topNext && bottomNext) {
    nextDue = topNext < bottomNext ? new Date(topNext) : new Date(bottomNext)
  } else {
    nextDue = topNext ? new Date(topNext) : bottomNext ? new Date(bottomNext) : null
  }

  if (!nextDue) return null

  const todayStr = typeof today === 'string' ? today : todayISODateLocal(today)
  const todayMid = parseLocalDate(todayStr)
  todayMid.setHours(0, 0, 0, 0)

  const nextDay = new Date(
    nextDue.getFullYear(),
    nextDue.getMonth(),
    nextDue.getDate()
  )
  if (nextDay.getTime() <= todayMid.getTime()) {
    return todayMid
  }
  return nextDue
}
