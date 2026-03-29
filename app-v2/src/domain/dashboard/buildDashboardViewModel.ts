import { calculateProgress } from '../progress/calculateProgress'
import {
  canLogTurn,
  getArchStatus,
  getDisplayNextDueDate,
  getNextDueDate,
  lastLoggedDisplayDate,
} from '../schedule/turnQueries'
import type { ArchStatus, TreatmentPlanInput, TurnLogInput } from '../types'

export type OverallStatus = 'complete' | 'ready' | 'wait'

export interface DashboardViewModel {
  topProgress: ReturnType<typeof calculateProgress>
  bottomProgress: ReturnType<typeof calculateProgress>
  topStatus: ArchStatus
  bottomStatus: ArchStatus
  overallStatus: OverallStatus
  topNextDue: Date | null
  bottomNextDue: Date | null
  displayNextDue: Date | null
  lastLoggedDate: string | null
  topCanLog: ReturnType<typeof canLogTurn>
  bottomCanLog: ReturnType<typeof canLogTurn>
  bothCanLog: boolean
  topComplete: boolean
  bottomComplete: boolean
  scheduleHint: string
}

export function buildDashboardViewModel(
  plan: TreatmentPlanInput,
  turnLogs: TurnLogInput[],
  today: Date | string = new Date()
): DashboardViewModel {
  const topProgress = calculateProgress(plan, turnLogs, 'top')
  const bottomProgress = calculateProgress(plan, turnLogs, 'bottom')
  const topStatus = getArchStatus(plan, turnLogs, 'top', today)
  const bottomStatus = getArchStatus(plan, turnLogs, 'bottom', today)

  const overallStatus: OverallStatus =
    topStatus === 'complete' && bottomStatus === 'complete'
      ? 'complete'
      : topStatus === 'ready' || bottomStatus === 'ready'
        ? 'ready'
        : 'wait'

  const topNextDue = getNextDueDate(plan, turnLogs, 'top', today)
  const bottomNextDue = getNextDueDate(plan, turnLogs, 'bottom', today)
  const displayNextDue = getDisplayNextDueDate(plan, turnLogs, today)
  const lastLogged = lastLoggedDisplayDate(turnLogs)

  const topCanLog = canLogTurn(plan, turnLogs, 'top', today)
  const bottomCanLog = canLogTurn(plan, turnLogs, 'bottom', today)
  const bothCanLog = topCanLog.canLog && bottomCanLog.canLog
  const topComplete = topStatus === 'complete'
  const bottomComplete = bottomStatus === 'complete'

  const scheduleHint =
    plan.scheduleType === 'twice_per_week'
      ? 'twice per week'
      : plan.intervalDays === 1
        ? 'every day'
        : `every ${plan.intervalDays} days`

  return {
    topProgress,
    bottomProgress,
    topStatus,
    bottomStatus,
    overallStatus,
    topNextDue,
    bottomNextDue,
    displayNextDue,
    lastLoggedDate: lastLogged,
    topCanLog,
    bottomCanLog,
    bothCanLog,
    topComplete,
    bottomComplete,
    scheduleHint,
  }
}
