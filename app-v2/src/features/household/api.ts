import { supabase } from '../../lib/supabase'
import type { HouseholdOption } from './types'

const STORAGE_KEY = 'stt_selected_household_id'

export function getStoredHouseholdId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setStoredHouseholdId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

export async function listHouseholdsForUser(userId: string): Promise<HouseholdOption[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households ( id, name )')
    .eq('user_id', userId)

  if (error) throw error
  const rows = data ?? []
  return rows
    .map((row) => {
      const h = row.households as { id: string; name: string } | null
      if (!h) return null
      return {
        householdId: row.household_id,
        name: h.name,
        role: row.role,
      } satisfies HouseholdOption
    })
    .filter((x): x is HouseholdOption => x != null)
}

export async function ensureHouseholdForUser(userId: string): Promise<string> {
  let list = await listHouseholdsForUser(userId)
  if (list.length === 0) {
    const { data, error } = await supabase.rpc('bootstrap_household', {
      household_name: 'Household',
    })
    if (error) throw error
    const bootId = data as string
    list = await listHouseholdsForUser(userId)
    if (list.length === 0) {
      setStoredHouseholdId(bootId)
      return bootId
    }
  }

  const stored = getStoredHouseholdId()
  if (stored && list.some((h) => h.householdId === stored)) {
    return stored
  }
  const first = list[0].householdId
  setStoredHouseholdId(first)
  return first
}
