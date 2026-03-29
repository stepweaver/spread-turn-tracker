import { INSTALL_TURN_COUNT } from '../../lib/constants'
import { countTurnsForArch } from '../schedule/turnQueries'
import type { Arch, TreatmentPlanInput, TurnLogInput } from '../types'

export interface ProgressForArch {
  logged: number
  doneDisplay: number
  total: number
  remaining: number
  percentage: number
}

export function calculateProgress(
  plan: TreatmentPlanInput,
  turnLogs: TurnLogInput[],
  arch: Arch
): ProgressForArch {
  const logged = countTurnsForArch(turnLogs, arch)
  const doneDisplay = logged + INSTALL_TURN_COUNT
  const total = arch === 'top' ? plan.topTotal : plan.bottomTotal
  const remaining = Math.max(0, total - doneDisplay)
  const percentage = total > 0 ? Math.round((doneDisplay / total) * 100) : 0
  return { logged, doneDisplay, total, remaining, percentage }
}
