/** Hand-maintained; align with supabase/migrations. Regenerate with `supabase gen types` when schema changes. */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string
          created_at?: string
        }
        Update: {
          display_name?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name?: string
          created_at?: string
        }
        Update: {
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: 'owner' | 'caregiver' | 'viewer'
          created_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role: 'owner' | 'caregiver' | 'viewer'
          created_at?: string
        }
        Update: {
          role?: 'owner' | 'caregiver' | 'viewer'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      patients: {
        Row: {
          id: string
          household_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patients_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
      treatment_plans: {
        Row: {
          id: string
          household_id: string
          patient_id: string
          top_total: number
          bottom_total: number
          install_date: string | null
          schedule_type: 'every_n_days' | 'twice_per_week'
          interval_days: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          patient_id: string
          top_total: number
          bottom_total: number
          install_date?: string | null
          schedule_type: 'every_n_days' | 'twice_per_week'
          interval_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          top_total?: number
          bottom_total?: number
          install_date?: string | null
          schedule_type?: 'every_n_days' | 'twice_per_week'
          interval_days?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'treatment_plans_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatment_plans_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
        ]
      }
      turn_logs: {
        Row: {
          id: string
          household_id: string
          patient_id: string
          date: string
          arch: 'top' | 'bottom'
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          patient_id: string
          date: string
          arch: 'top' | 'bottom'
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          date?: string
          arch?: 'top' | 'bottom'
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'turn_logs_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turn_logs_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'turn_logs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      treatment_notes: {
        Row: {
          id: string
          household_id: string
          patient_id: string
          date: string
          note: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          patient_id: string
          date: string
          note: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          date?: string
          note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'treatment_notes_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatment_notes_patient_id_fkey'
            columns: ['patient_id']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatment_notes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      bootstrap_household: {
        Args: { household_name?: string }
        Returns: string
      }
    }
  }
}
