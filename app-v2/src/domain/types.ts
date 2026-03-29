export type ScheduleType = 'every_n_days' | 'twice_per_week'
export type Arch = 'top' | 'bottom'

export interface TreatmentPlanInput {
  topTotal: number
  bottomTotal: number
  installDate: string | null
  scheduleType: ScheduleType
  intervalDays: number
}

export interface TurnLogInput {
  date: string
  arch: Arch
}

export type ArchStatus = 'complete' | 'wait' | 'ready'

export interface CanLogTurnResult {
  canLog: boolean
  reason?: 'complete' | 'wait'
  daysRemaining?: number
  message?: string
}
