import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import { ensureHouseholdForUser } from '../household/api'
import { fetchPrimaryPatient } from '../patient/api'
import { fetchActivePlan } from '../treatment-plan/api'

export function useTrackerScope() {
  const queryClient = useQueryClient()
  const { session, loading: authLoading } = useAuth()
  const userId = session?.user.id

  const q = useQuery({
    queryKey: ['tracker-scope', userId],
    enabled: !!userId && !authLoading,
    queryFn: async () => {
      const householdId = await ensureHouseholdForUser(userId!)
      const patient = await fetchPrimaryPatient(householdId)
      if (!patient) throw new Error('No patient in household')
      const plan = await fetchActivePlan(patient.id)
      if (!plan) throw new Error('No active treatment plan')
      return { householdId, patient, plan }
    },
  })

  useEffect(() => {
    if (q.data && userId) {
      void queryClient.invalidateQueries({ queryKey: ['households', userId] })
    }
  }, [q.data, queryClient, userId])

  return q
}
