import { createClient } from "@supabase/supabase-js"

/**
 * In Vercel v0 preview mode there are no env vars, so we fall back
 * to dummy values to avoid the "supabaseUrl is required" crash.
 * Replace these in production with real NEXT_PUBLIC_SUPABASE_* envs.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://demo.supabase.co" // <— harmless placeholder
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key" // <— harmless placeholder

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars are missing. Using placeholder credentials – database calls will fail until real keys are provided.",
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  name: string
  role: "coach" | "client"
  phone?: string
  date_of_birth?: string
  height_cm?: number
  weight_kg?: number
  fitness_goal?: string
  workouts_per_week?: number
  profile_image_url?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  country?: string
  country_name?: string
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  coach_id: string
  name: string
  category: string
  type: "Weighted" | "Bodyweight" | "Cardio"
  description?: string
  image_url?: string
  video_url?: string
  created_at: string
  updated_at: string
}

export interface TrainingPlan {
  id: string
  coach_id: string
  client_id: string
  name: string
  duration: string
  status: "Draft" | "Active" | "Completed" | "Paused"
  difficulty?: "Beginner" | "Intermediate" | "Advanced"
  estimated_duration?: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
  client?: User
}

export interface PlanExercise {
  id: string
  plan_id: string
  exercise_id: string
  sets: number
  reps?: number
  weight?: number
  time_minutes?: number
  rest_seconds: number
  tempo?: string
  order_index: number
  exercise?: Exercise
}

export interface WorkoutSession {
  id: string
  client_id: string
  plan_id: string
  scheduled_date: string
  completed_date?: string
  status: "Scheduled" | "In Progress" | "Completed" | "Skipped"
  duration_minutes?: number
  created_at: string
  updated_at: string
  training_plan?: TrainingPlan
}

export interface ExerciseFeedback {
  id: string
  session_id: string
  exercise_id: string
  completed: boolean
  feedback?: string
  actual_sets?: number
  actual_reps?: number
  actual_weight?: number
  created_at: string
  updated_at: string
  exercise?: Exercise
}

export interface Invoice {
  id: string
  coach_id: string
  client_id: string
  amount: number
  sessions_count: number
  status: "Pending" | "Paid" | "Overdue" | "Cancelled"
  due_date: string
  paid_date?: string
  created_at: string
  updated_at: string
  client?: User
}
