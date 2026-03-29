import { supabase } from '../../lib/supabase'

export async function fetchTreatmentNotes(patientId: string) {
  const { data, error } = await supabase
    .from('treatment_notes')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function insertTreatmentNote(
  householdId: string,
  patientId: string,
  userId: string,
  date: string,
  note: string
) {
  const { data, error } = await supabase
    .from('treatment_notes')
    .insert({
      household_id: householdId,
      patient_id: patientId,
      date,
      note,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTreatmentNote(noteId: string, date: string, note: string) {
  const { error } = await supabase
    .from('treatment_notes')
    .update({ date, note })
    .eq('id', noteId)

  if (error) throw error
}

export async function deleteTreatmentNote(noteId: string) {
  const { error } = await supabase.from('treatment_notes').delete().eq('id', noteId)
  if (error) throw error
}
