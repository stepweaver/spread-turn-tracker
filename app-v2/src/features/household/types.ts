export interface HouseholdOption {
  householdId: string
  name: string
  role: 'owner' | 'caregiver' | 'viewer'
}
