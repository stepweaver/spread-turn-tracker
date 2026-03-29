import type { Arch, TreatmentPlanInput, TurnLogInput } from '../types'
import { canLogTurn } from './turnQueries'

/** True if a turn for this patient/date/arch would violate uniqueness or schedule rules for `targetDate`. */
export function wouldDuplicateTurn(
  turns: TurnLogInput[],
  date: string,
  arch: Arch
): boolean {
  return turns.some((t) => t.date === date && t.arch === arch)
}

export function canLogTurnOnDate(
  plan: TreatmentPlanInput,
  turns: TurnLogInput[],
  arch: Arch,
  targetDate: string,
  today: Date | string = new Date()
): ReturnType<typeof canLogTurn> & { duplicate?: boolean } {
  if (wouldDuplicateTurn(turns, targetDate, arch)) {
    return { canLog: false, reason: 'wait', message: 'A turn for this date and arch already exists' }
  }
  return canLogTurn(plan, turns, arch, today)
}
