import { supabase } from '../../lib/supabase'

export async function fetchActivePlan(patientId: string) {
  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateTreatmentPlan(
  planId: string,
  patch: {
    top_total?: number
    bottom_total?: number
    install_date?: string | null
    schedule_type?: 'every_n_days' | 'twice_per_week'
    interval_days?: number
  }
) {
  const { error } = await supabase.from('treatment_plans').update(patch).eq('id', planId)
  if (error) throw error
}
