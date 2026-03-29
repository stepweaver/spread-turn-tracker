import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Default local Supabase URL/key (from `supabase start`) so the app shell loads without `.env`.
 * Override with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real projects.
 */
const defaultLocalUrl = 'http://127.0.0.1:54321'
const defaultLocalAnon =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || defaultLocalUrl
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || defaultLocalAnon

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Using default local Supabase URL/anon key; set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.'
  )
}

export const supabase = createClient<Database>(url, anon)
