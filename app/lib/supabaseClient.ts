import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Error handling utility
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'SupabaseError'
  }
}

// Client-side Supabase client for use in browser/client components
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Utility function to handle Supabase errors consistently
export function handleSupabaseError(error: unknown): never {
  if (error instanceof SupabaseError) {
    throw error
  }

  // Handle different error formats from Supabase
  let message = 'An unexpected error occurred'

  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      message = error.message
    } else if ('error_description' in error && typeof error.error_description === 'string') {
      message = error.error_description
    } else if ('msg' in error && typeof error.msg === 'string') {
      message = error.msg
    }
  } else if (typeof error === 'string') {
    message = error
  }

  throw new SupabaseError(
    message,
    'SUPABASE_API_ERROR',
    error
  )
}

// Type-safe database query helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Re-export commonly used types for convenience
export type User = Tables<'users'>
export type Post = Tables<'posts'>
export type Comment = Tables<'comments'>
export type Story = Tables<'stories'>
export type Like = Tables<'likes'>
export type Follow = Tables<'follows'>
export type Sound = Tables<'sounds'>
export type Confessional = Tables<'confessionals'>
export type Challenge = Tables<'challenges'>
export type UserAchievement = Tables<'user_achievements'>
export type StoryReaction = Tables<'story_reactions'>
export type GameLeaderboard = Tables<'game_leaderboards'>
export type SoundBattle = Tables<'sound_battles'>
export type BattleSubmission = Tables<'battle_submissions'>
export type BattleVote = Tables<'battle_votes'>
export type Notification = Tables<'notifications'>
export type BattleTheme = Tables<'battle_themes'>