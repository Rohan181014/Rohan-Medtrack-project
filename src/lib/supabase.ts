import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Profile helpers
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const updateProfile = async (userId: string, updates: Database['public']['Tables']['profiles']['Update']) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  return { data, error }
}

// Medication helpers
export const getMedications = async () => {
  const { data, error } = await supabase
    .from('medications')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
  return { data, error }
}

export const addMedication = async (medication: Database['public']['Tables']['medications']['Insert']) => {
  const { data, error } = await supabase
    .from('medications')
    .insert(medication)
    .select()
    .single()
  return { data, error }
}

export const updateMedication = async (
  id: string,
  updates: Database['public']['Tables']['medications']['Update']
) => {
  const { data, error } = await supabase
    .from('medications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteMedication = async (id: string) => {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', id)
  return { error }
}

// Dose logging helpers
export const logDose = async (
  medicationId: string,
  scheduledTime: string,
  actualTime: string
) => {
  const { data, error } = await supabase
    .rpc('log_dose', {
      p_medication_id: medicationId,
      p_scheduled_time: scheduledTime,
      p_actual_time: actualTime,
    })
  return { data, error }
}

// Adherence helpers
export const getAdherenceSummary = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .rpc('get_adherence_summary', {
      p_user_id: user.id,
    })
  return { data, error }
} 