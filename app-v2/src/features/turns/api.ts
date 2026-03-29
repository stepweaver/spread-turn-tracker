import { supabase } from '../../lib/supabase'
import type { TurnLogPayload } from './schema'

export async function fetchTurnLogs(patientId: string) {
  const { data, error } = await supabase
    .from('turn_logs')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function insertTurnLogs(
  householdId: string,
  patientId: string,
  userId: string,
  turns: TurnLogPayload[]
) {
  const rows = turns.map((t) => ({
    household_id: householdId,
    patient_id: patientId,
    date: t.date,
    arch: t.arch,
    note: t.note,
    created_by: userId,
  }))

  const { data, error } = await supabase.from('turn_logs').insert(rows).select()
  if (error) throw error
  return data
}

export async function deleteTurnLog(turnId: string) {
  const { error } = await supabase.from('turn_logs').delete().eq('id', turnId)
  if (error) throw error
}

export async function deleteAllTurnLogsForPatient(patientId: string) {
  const { error } = await supabase.from('turn_logs').delete().eq('patient_id', patientId)
  if (error) throw error
}
