'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useCurrency } from './CurrencyContext'
import { createClient } from '@/app/lib/supabaseClient'
import type { SoundBattle, BattleTheme, Sound } from '@/app/lib/supabaseClient'

interface BattleWithDetails extends SoundBattle {
  challenger?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  opponent?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  challenger_submission?: {
    sound_id: string
    sound?: Sound
  }
  opponent_submission?: {
    sound_id: string
    sound?: Sound
  }
  vote_count?: {
    challenger_votes: number
    opponent_votes: number
    total_votes: number
  }
  user_vote?: string | null
}

interface BattlesContextType {
  loading: boolean
  createChallenge: (
    opponentId: string,
    theme: string,
    wagerAmount: number,
    submissionPeriodHours: number,
    votingPeriodHours: number
  ) => Promise<{ success: boolean; message?: string; battleId?: string }>
  acceptChallenge: (battleId: string) => Promise<{ success: boolean; message?: string }>
  declineChallenge: (battleId: string) => Promise<{ success: boolean; message?: string }>
  submitToBattle: (battleId: string, soundId: string) => Promise<{ success: boolean; message?: string }>
  voteInBattle: (battleId: string, votedForUserId: string) => Promise<{ success: boolean; message?: string }>
  getBattleDetails: (battleId: string) => Promise<BattleWithDetails | null>
  getMyBattles: () => Promise<BattleWithDetails[]>
  getVotingBattles: () => Promise<BattleWithDetails[]>
  getBattleThemes: () => Promise<BattleTheme[]>
}

const BattlesContext = createContext<BattlesContextType | undefined>(undefined)

export function BattlesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { refreshBalance } = useCurrency()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const createChallenge = async (
    opponentId: string,
    theme: string,
    wagerAmount: number,
    submissionPeriodHours: number,
    votingPeriodHours: number
  ): Promise<{ success: boolean; message?: string; battleId?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in to create a challenge' }
    }

    setLoading(true)

    try {
      const { data, error } = await (supabase.rpc as any)('create_battle_challenge', {
        p_challenger_id: user.id,
        p_opponent_id: opponentId,
        p_theme: theme,
        p_wager_amount: wagerAmount,
        p_submission_period_hours: submissionPeriodHours,
        p_voting_period_hours: votingPeriodHours,
      })

      if (error) throw error

      // Refresh user's coin balance
      await refreshBalance()

      return {
        success: true,
        message: 'Challenge sent successfully!',
        battleId: data
      }
    } catch (error: any) {
      console.error('Failed to create challenge:', error)
      return {
        success: false,
        message: error.message || 'Failed to create challenge. Please try again.'
      }
    } finally {
      setLoading(false)
    }
  }

  const acceptChallenge = async (battleId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in to accept a challenge' }
    }

    setLoading(true)

    try {
      const { error } = await (supabase.rpc as any)('accept_battle_challenge', {
        p_battle_id: battleId,
        p_opponent_id: user.id,
      })

      if (error) throw error

      // Refresh user's coin balance
      await refreshBalance()

      return {
        success: true,
        message: 'Challenge accepted! Start creating your sound!'
      }
    } catch (error: any) {
      console.error('Failed to accept challenge:', error)
      return {
        success: false,
        message: error.message || 'Failed to accept challenge. Please try again.'
      }
    } finally {
      setLoading(false)
    }
  }

  const declineChallenge = async (battleId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in' }
    }

    setLoading(true)

    try {
      const { error } = await (supabase.rpc as any)('cancel_battle', {
        p_battle_id: battleId,
        p_user_id: user.id,
      })

      if (error) throw error

      return {
        success: true,
        message: 'Challenge declined'
      }
    } catch (error: any) {
      console.error('Failed to decline challenge:', error)
      return {
        success: false,
        message: error.message || 'Failed to decline challenge'
      }
    } finally {
      setLoading(false)
    }
  }

  const submitToBattle = async (battleId: string, soundId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in' }
    }

    setLoading(true)

    try {
      const { error } = await (supabase.rpc as any)('submit_to_battle', {
        p_battle_id: battleId,
        p_user_id: user.id,
        p_sound_id: soundId,
      })

      if (error) throw error

      return {
        success: true,
        message: 'Sound submitted successfully!'
      }
    } catch (error: any) {
      console.error('Failed to submit to battle:', error)
      return {
        success: false,
        message: error.message || 'Failed to submit sound'
      }
    } finally {
      setLoading(false)
    }
  }

  const voteInBattle = async (battleId: string, votedForUserId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in to vote' }
    }

    setLoading(true)

    try {
      const { error } = await (supabase.rpc as any)('vote_in_battle', {
        p_battle_id: battleId,
        p_voter_id: user.id,
        p_voted_for_user_id: votedForUserId,
      })

      if (error) throw error

      // Refresh user's coin balance (voter gets 5 coins)
      await refreshBalance()

      return {
        success: true,
        message: 'Vote submitted! You earned 5 FB coins!'
      }
    } catch (error: any) {
      console.error('Failed to vote in battle:', error)
      return {
        success: false,
        message: error.message || 'Failed to submit vote'
      }
    } finally {
      setLoading(false)
    }
  }

  const getBattleDetails = async (battleId: string): Promise<BattleWithDetails | null> => {
    try {
      const { data: battle, error } = await supabase
        .from('sound_battles')
        .select(`
          *,
          challenger:users!sound_battles_challenger_id_fkey(id, username, display_name, avatar_url),
          opponent:users!sound_battles_opponent_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('id', battleId)
        .single()

      if (error) throw error
      if (!battle) return null

      // Fetch submissions
      const { data: submissions } = await supabase
        .from('battle_submissions')
        .select(`
          *,
          sound:sounds(*)
        `)
        .eq('battle_id', battleId)

      // Fetch vote counts
      const { data: votes } = await supabase
        .from('battle_votes')
        .select('voted_for_user_id')
        .eq('battle_id', battleId)

      // Get user's vote if they voted
      const { data: userVote } = user
        ? await supabase
            .from('battle_votes')
            .select('voted_for_user_id')
            .eq('battle_id', battleId)
            .eq('voter_id', user.id)
            .maybeSingle()
        : { data: null }

      const battleData = battle as any
      const challengerSubmission = (submissions as any)?.find((s: any) => s.user_id === battleData.challenger_id)
      const opponentSubmission = (submissions as any)?.find((s: any) => s.user_id === battleData.opponent_id)

      const challengerVotes = (votes as any)?.filter((v: any) => v.voted_for_user_id === battleData.challenger_id).length || 0
      const opponentVotes = (votes as any)?.filter((v: any) => v.voted_for_user_id === battleData.opponent_id).length || 0

      return {
        ...(battle as any),
        challenger: Array.isArray((battle as any).challenger) ? (battle as any).challenger[0] : (battle as any).challenger,
        opponent: Array.isArray((battle as any).opponent) ? (battle as any).opponent[0] : (battle as any).opponent,
        challenger_submission: challengerSubmission ? {
          sound_id: challengerSubmission.sound_id,
          sound: Array.isArray(challengerSubmission.sound) ? challengerSubmission.sound[0] : challengerSubmission.sound
        } : undefined,
        opponent_submission: opponentSubmission ? {
          sound_id: opponentSubmission.sound_id,
          sound: Array.isArray(opponentSubmission.sound) ? opponentSubmission.sound[0] : opponentSubmission.sound
        } : undefined,
        vote_count: {
          challenger_votes: challengerVotes,
          opponent_votes: opponentVotes,
          total_votes: challengerVotes + opponentVotes
        },
        user_vote: (userVote as any)?.voted_for_user_id || null
      }
    } catch (error) {
      console.error('Failed to get battle details:', error)
      return null
    }
  }

  const getMyBattles = async (): Promise<BattleWithDetails[]> => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('sound_battles')
        .select(`
          *,
          challenger:users!sound_battles_challenger_id_fkey(id, username, display_name, avatar_url),
          opponent:users!sound_battles_opponent_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch detailed info for each battle
      const battlesWithDetails = await Promise.all(
        (data || []).map(async (battle: any) => {
          const details = await getBattleDetails(battle.id)
          return details || battle as BattleWithDetails
        })
      )

      return battlesWithDetails
    } catch (error) {
      console.error('Failed to get my battles:', error)
      return []
    }
  }

  const getVotingBattles = async (): Promise<BattleWithDetails[]> => {
    try {
      const { data, error } = await supabase
        .from('sound_battles')
        .select(`
          *,
          challenger:users!sound_battles_challenger_id_fkey(id, username, display_name, avatar_url),
          opponent:users!sound_battles_opponent_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('status', 'voting')
        .order('voting_deadline', { ascending: true })

      if (error) throw error

      // Fetch detailed info for each battle
      const battlesWithDetails = await Promise.all(
        (data || []).map(async (battle: any) => {
          const details = await getBattleDetails(battle.id)
          return details || battle as BattleWithDetails
        })
      )

      return battlesWithDetails
    } catch (error) {
      console.error('Failed to get voting battles:', error)
      return []
    }
  }

  const getBattleThemes = async (): Promise<BattleTheme[]> => {
    try {
      const { data, error } = await supabase
        .from('battle_themes')
        .select('*')
        .eq('is_active', true)
        .order('difficulty')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get battle themes:', error)
      return []
    }
  }

  const value: BattlesContextType = {
    loading,
    createChallenge,
    acceptChallenge,
    declineChallenge,
    submitToBattle,
    voteInBattle,
    getBattleDetails,
    getMyBattles,
    getVotingBattles,
    getBattleThemes,
  }

  return (
    <BattlesContext.Provider value={value}>
      {children}
    </BattlesContext.Provider>
  )
}

export function useBattles() {
  const context = useContext(BattlesContext)
  if (context === undefined) {
    throw new Error('useBattles must be used within a BattlesProvider')
  }
  return context
}

export type { BattleWithDetails }
