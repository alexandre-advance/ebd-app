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
      churches: {
        Row: {
          id: string
          name: string
          subscription_status: 'active' | 'inactive' | 'canceled'
          subscription_plan: 'basic' | 'premium'
          subscription_expires_at: string | null
          created_at: string
          street: string | null
          number: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
        }
        Insert: {
          id?: string
          name: string
          subscription_status?: 'active' | 'inactive' | 'canceled'
          subscription_plan?: 'basic' | 'premium'
          subscription_expires_at?: string | null
          created_at?: string
          street?: string | null
          number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
        }
        Update: {
          id?: string
          name?: string
          subscription_status?: 'active' | 'inactive' | 'canceled'
          subscription_plan?: 'basic' | 'premium'
          subscription_expires_at?: string | null
          created_at?: string
          street?: string | null
          number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
        }
      }
      congregations: {
        Row: {
          id: string
          church_id: string
          name: string
          address: string | null
          created_at: string
          street: string | null
          number: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
        }
        Insert: {
          id?: string
          church_id: string
          name: string
          address?: string | null
          created_at?: string
          street?: string | null
          number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
        }
        Update: {
          id?: string
          church_id?: string
          name?: string
          address?: string | null
          created_at?: string
          street?: string | null
          number?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
        }
      }
      rooms: {
        Row: {
          id: string
          congregation_id: string
          name: string
          description: string | null
          category: string
          subcategory: string | null
          min_age: number
          max_age: number
          marital_status: 'solteiro' | 'casado' | 'qualquer' | null
          created_at: string
        }
        Insert: {
          id?: string
          congregation_id: string
          name: string
          description?: string | null
          category: string
          subcategory?: string | null
          min_age?: number
          max_age?: number
          marital_status?: 'solteiro' | 'casado' | 'qualquer' | null
          created_at?: string
        }
        Update: {
          id?: string
          congregation_id?: string
          name?: string
          description?: string | null
          category?: string
          subcategory?: string | null
          min_age?: number
          max_age?: number
          marital_status?: 'solteiro' | 'casado' | 'qualquer' | null
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          room_id: string
          full_name: string
          birth_date: string | null
          marital_status: 'Solteiro' | 'Casado' | 'Outro' | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          full_name: string
          birth_date?: string | null
          marital_status?: 'Solteiro' | 'Casado' | 'Outro' | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          full_name?: string
          birth_date?: string | null
          marital_status?: 'Solteiro' | 'Casado' | 'Outro' | null
          created_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          room_id: string
          title: string
          description: string | null
          date: string
          attendance_count: number
          visitors_count: number
          bibles_count: number
          magazines_count: number
          offerings_amount: number
          is_draft: boolean
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          title: string
          description?: string | null
          date: string
          attendance_count?: number
          visitors_count?: number
          bibles_count?: number
          magazines_count?: number
          offerings_amount?: number
          is_draft?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          title?: string
          description?: string | null
          date?: string
          attendance_count?: number
          visitors_count?: number
          bibles_count?: number
          magazines_count?: number
          offerings_amount?: number
          is_draft?: boolean
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          church_id: string | null
          congregation_id: string | null
          name: string | null
          role: 'ADMIN_MASTER' | 'ADMIN_APP' | 'SECRETARIO' | null
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          church_id?: string | null
          congregation_id?: string | null
          name?: string | null
          role?: 'ADMIN_MASTER' | 'ADMIN_APP' | 'SECRETARIO' | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          church_id?: string | null
          congregation_id?: string | null
          name?: string | null
          role?: 'ADMIN_MASTER' | 'ADMIN_APP' | 'SECRETARIO' | null
          email?: string | null
          created_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          lesson_id: string
          student_id: string
          present: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          student_id: string
          present?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          student_id?: string
          present?: boolean
          created_at?: string
        }
      }
    }
  }
}

export type Church = Database['public']['Tables']['churches']['Row']
export type Congregation = Database['public']['Tables']['congregations']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type Attendance = Database['public']['Tables']['attendance']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
