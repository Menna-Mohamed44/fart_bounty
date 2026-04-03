'use client'

import { createContext, useContext, useMemo, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth, AuthUser } from './AuthContext'

// Premium tier types
export type PremiumTier = 'free' | 'premium' | 'premium_pro' | 'unlimited'

// Tier configuration — every limit and feature flag is per-tier
export interface TierConfig {
  id: PremiumTier
  name: string
  price: string
  dailyCreations: number | 'Unlimited'
  maxPostLength: number
  maxAvatarSize: number
  canUseGifAvatar: boolean
  canUploadBanner: boolean
  canUsePremiumThemes: boolean
  canUsePremiumEffects: boolean
  canUseExtraEffects: boolean
  soundLibrary: string
  editingTools: 'none' | 'basic' | 'advanced' | 'full'
  ads: 'full' | 'fewer' | 'none'
  hasMonthlyGifts: boolean
  extras: string[]
}

export const TIER_CONFIGS: Record<PremiumTier, TierConfig> = {
  free: {
    id: 'free',
    name: 'Regular',
    price: 'FREE',
    dailyCreations: 10,
    maxPostLength: 250,
    maxAvatarSize: 2 * 1024 * 1024,
    canUseGifAvatar: false,
    canUploadBanner: false,
    canUsePremiumThemes: false,
    canUsePremiumEffects: false,
    canUseExtraEffects: false,
    soundLibrary: 'Basic sound library',
    editingTools: 'none',
    ads: 'full',
    hasMonthlyGifts: false,
    extras: ['Community access'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: '$7.99/mo',
    dailyCreations: 50,
    maxPostLength: 500,
    maxAvatarSize: 5 * 1024 * 1024,
    canUseGifAvatar: true,
    canUploadBanner: true,
    canUsePremiumThemes: true,
    canUsePremiumEffects: true,
    canUseExtraEffects: false,
    soundLibrary: 'Extended sound library',
    editingTools: 'basic',
    ads: 'fewer',
    hasMonthlyGifts: false,
    extras: ['Basic editing tools', 'Fewer ads'],
  },
  premium_pro: {
    id: 'premium_pro',
    name: 'Premium Pro',
    price: '$14.99/mo',
    dailyCreations: 200,
    maxPostLength: 1500,
    maxAvatarSize: 7 * 1024 * 1024,
    canUseGifAvatar: true,
    canUploadBanner: true,
    canUsePremiumThemes: true,
    canUsePremiumEffects: true,
    canUseExtraEffects: true,
    soundLibrary: 'Full sound catalog',
    editingTools: 'advanced',
    ads: 'none',
    hasMonthlyGifts: true,
    extras: ['Advanced editing', 'Monthly digital gifts'],
  },
  unlimited: {
    id: 'unlimited',
    name: 'Unlimited Access',
    price: '$24.99/mo',
    dailyCreations: 'Unlimited',
    maxPostLength: 3000,
    maxAvatarSize: 10 * 1024 * 1024,
    canUseGifAvatar: true,
    canUploadBanner: true,
    canUsePremiumThemes: true,
    canUsePremiumEffects: true,
    canUseExtraEffects: true,
    soundLibrary: 'Complete access',
    editingTools: 'full',
    ads: 'none',
    hasMonthlyGifts: true,
    extras: ['Unlimited creations', 'Complete access', 'No ads'],
  },
}

// Premium context state interface — all derived from tierConfig
interface PremiumContextType {
  // Core status
  premiumTier: PremiumTier
  premiumSince: string | null
  tierConfig: TierConfig

  // Content creation limits (from tierConfig)
  maxPostLength: number
  dailyCreations: number | 'Unlimited'

  // Daily usage tracking
  dailyUsage: number
  canCreate: boolean
  remainingCreations: number | 'Unlimited'
  incrementUsage: () => void
  resetUsage: () => void

  // Feature access flags (from tierConfig)
  canUploadBanner: boolean
  canUsePremiumThemes: boolean
  canUseGifAvatar: boolean
  maxAvatarSize: number
  canUsePremiumEffects: boolean
  canUseExtraEffects: boolean
  hasNoAds: boolean
  hasFewerAds: boolean
  hasMonthlyGifts: boolean

  // User info for convenience
  user: AuthUser | null
}

// Create the context
const PremiumContext = createContext<PremiumContextType | undefined>(undefined)

// Premium provider props
interface PremiumProviderProps {
  children: ReactNode
}

// Helper to get today's date string (YYYY-MM-DD)
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// Helper to read usage from localStorage
function getStoredUsage(userId: string): { date: string; count: number } {
  if (typeof window === 'undefined') return { date: getTodayKey(), count: 0 }
  try {
    const raw = localStorage.getItem(`fb_daily_usage_${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.date === getTodayKey()) {
        return parsed
      }
    }
  } catch {}
  return { date: getTodayKey(), count: 0 }
}

// Helper to save usage to localStorage
function saveStoredUsage(userId: string, count: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    `fb_daily_usage_${userId}`,
    JSON.stringify({ date: getTodayKey(), count })
  )
}

// Premium provider component
export function PremiumProvider({ children }: PremiumProviderProps) {
  const { user } = useAuth()
  const [dailyUsage, setDailyUsage] = useState(0)

  // Load usage from localStorage on mount / user change
  useEffect(() => {
    if (user?.id) {
      const stored = getStoredUsage(user.id)
      setDailyUsage(stored.count)
    } else {
      setDailyUsage(0)
    }
  }, [user?.id])

  const incrementUsage = useCallback(() => {
    if (!user?.id) return
    setDailyUsage((prev) => {
      const next = prev + 1
      saveStoredUsage(user.id, next)
      return next
    })
  }, [user?.id])

  const resetUsage = useCallback(() => {
    if (!user?.id) return
    setDailyUsage(0)
    saveStoredUsage(user.id, 0)
  }, [user?.id])

  // Compute premium-related values — everything derived from tierConfig
  const premiumContextValue = useMemo((): PremiumContextType => {
    const rawTier = (user as any)?.premium_tier as PremiumTier | undefined
    const premiumTier: PremiumTier = rawTier && rawTier in TIER_CONFIGS ? rawTier : 'free'
    const premiumSince = user?.premium_since ?? null
    const tierConfig = TIER_CONFIGS[premiumTier]

    // Usage limit calculations
    const limit = tierConfig.dailyCreations
    const canCreate = limit === 'Unlimited' || dailyUsage < limit
    const remainingCreations: number | 'Unlimited' =
      limit === 'Unlimited' ? 'Unlimited' : Math.max(0, limit - dailyUsage)

    return {
      // Core status
      premiumTier,
      premiumSince,
      tierConfig,

      // Content creation limits
      maxPostLength: tierConfig.maxPostLength,
      dailyCreations: tierConfig.dailyCreations,

      // Daily usage tracking
      dailyUsage,
      canCreate,
      remainingCreations,
      incrementUsage,
      resetUsage,

      // Feature access flags — all from tierConfig
      canUploadBanner: tierConfig.canUploadBanner,
      canUsePremiumThemes: tierConfig.canUsePremiumThemes,
      canUseGifAvatar: tierConfig.canUseGifAvatar,
      maxAvatarSize: tierConfig.maxAvatarSize,
      canUsePremiumEffects: tierConfig.canUsePremiumEffects,
      canUseExtraEffects: tierConfig.canUseExtraEffects,
      hasNoAds: tierConfig.ads === 'none',
      hasFewerAds: tierConfig.ads === 'fewer' || tierConfig.ads === 'none',
      hasMonthlyGifts: tierConfig.hasMonthlyGifts,

      // User info
      user,
    }
  }, [user, dailyUsage, incrementUsage, resetUsage])

  return (
    <PremiumContext.Provider value={premiumContextValue}>
      {children}
    </PremiumContext.Provider>
  )
}

// Custom hook to use premium context
export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext)

  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider')
  }

  return context
}

// Convenience hooks
export function useMaxPostLength(): number {
  const { maxPostLength } = usePremium()
  return maxPostLength
}

export function useCanUploadBanner(): boolean {
  const { canUploadBanner } = usePremium()
  return canUploadBanner
}

export function useCanUsePremiumThemes(): boolean {
  const { canUsePremiumThemes } = usePremium()
  return canUsePremiumThemes
}
