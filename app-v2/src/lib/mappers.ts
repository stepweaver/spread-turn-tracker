import type { TreatmentPlanInput, TurnLogInput } from '../domain/types'
import type { Database } from './database.types'

type PlanRow = Database['public']['Tables']['treatment_plans']['Row']
type TurnRow = Database['public']['Tables']['turn_logs']['Row']

export function planRowToInput(row: PlanRow): TreatmentPlanInput {
  return {
    topTotal: row.top_total,
    bottomTotal: row.bottom_total,
    installDate: row.install_date,
    scheduleType: row.schedule_type,
    intervalDays: row.interval_days,
  }
}

export function turnRowsToInputs(rows: TurnRow[]): TurnLogInput[] {
  return rows.map((r) => ({ date: r.date, arch: r.arch }))
}
