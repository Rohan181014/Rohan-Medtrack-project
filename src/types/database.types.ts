export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          user_id: string
          name: string
          dose: string
          frequency_per_day: number
          start_date: string
          end_date: string | null
          category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          dose: string
          frequency_per_day: number
          start_date: string
          end_date?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          dose?: string
          frequency_per_day?: number
          start_date?: string
          end_date?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dose_logs: {
        Row: {
          id: string
          medication_id: string
          timestamp_taken: string
          scheduled_time: string
          taken_on_time: boolean
          reward_earned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          timestamp_taken: string
          scheduled_time: string
          taken_on_time: boolean
          reward_earned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          timestamp_taken?: string
          scheduled_time?: string
          taken_on_time?: boolean
          reward_earned?: boolean
          created_at?: string
        }
      }
    }
    Functions: {
      get_adherence_summary: {
        Args: { p_user_id: string }
        Returns: Json
      }
      log_dose: {
        Args: {
          p_medication_id: string
          p_scheduled_time: string
          p_actual_time: string
        }
        Returns: Json
      }
    }
  }
} 