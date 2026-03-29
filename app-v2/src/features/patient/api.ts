import { supabase } from '../../lib/supabase'

export async function fetchPrimaryPatient(householdId: string) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updatePatientName(patientId: string, name: string) {
  const { error } = await supabase.from('patients').update({ name }).eq('id', patientId)
  if (error) throw error
}
