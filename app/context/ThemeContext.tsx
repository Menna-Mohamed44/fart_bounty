'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { usePremium } from './PremiumContext'

// Theme token interface
interface ThemeTokens {
  // Background colors
  '--bg-primary': string
  '--bg-secondary': string
  '--bg-tertiary': string
  '--bg-accent': string

  // Gradient backgrounds
  '--gradient-primary': string
  '--gradient-secondary': string
  '--gradient-accent': string
  '--gradient-success': string

  // Text colors
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
  '--text-accent': string

  // Interactive colors
  '--accent-primary': string
  '--accent-secondary': string
  '--accent-hover': string

  // Gradient accents
  '--gradient-accent-primary': string
  '--gradient-accent-hover': string

  // Status colors
  '--success': string
  '--warning': string
  '--error': string
  '--info': string

  // Border colors
  '--border-primary': string
  '--border-secondary': string

  // Special colors
  '--shadow': string
  '--shadow-strong': string
  '--overlay': string
}

// Theme interface
interface Theme {
  id: string
  displayName: string
  tokens: ThemeTokens
  isPremiumOnly: boolean
}

// Theme context state interface
interface ThemeContextType {
  themes: Theme[]
  currentThemeId: string
  currentTheme: Theme | null
  setTheme: (themeId: string) => void
  availableThemes: Theme[] // Only themes user can access
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Theme storage key
const THEME_STORAGE_KEY = 'fart-bounty-theme'

// Default theme - Ultra Dark Greenish Fart Bounty theme with sophisticated gradients
const defaultTheme: Theme = {
  id: 'default',
  displayName: 'Fart Bounty Dark',
  isPremiumOnly: false,
  tokens: {
    '--bg-primary': '#010d04',       // Ultra dark green/black
    '--bg-secondary': '#0f1a12',     // Very dark green
    '--bg-tertiary': '#1a2d1f',      // Dark green with subtle gradient potential
    '--bg-accent': '#0a1410',        // Dark greenish accent

    // Gradient backgrounds for sophistication
    '--gradient-primary': 'linear-gradient(135deg, #050a07 0%, #0a1410 50%,rgb(22, 44, 37) 100%)',
    '--gradient-secondary': 'linear-gradient(135deg, #0f1a12 0%, #1a2d1f 50%,rgb(47, 86, 71) 100%)',
    '--gradient-accent': 'radial-gradient(ellipse at top, #0a1410,rgb(3, 55, 44))',
    '--gradient-success': 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',

    '--text-primary': '#f8fef9',     // Pure white-green for maximum contrast
    '--text-secondary': '#d0e6d9',   // Light green-gray
    '--text-muted': '#9bb0a3',       // Medium green-gray
    '--text-accent': '#4ade80',      // Bright green accent

    '--accent-primary': '#22c55e',   // Bright green
    '--accent-secondary': '#16a34a', // Slightly darker green
    '--accent-hover': '#15803d',     // Darker green for hover

    // Gradient accents for interactive elements
    '--gradient-accent-primary': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    '--gradient-accent-hover': 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',

    '--success': '#22c55e',          // Green
    '--warning': '#f59e0b',          // Orange/amber
    '--error': '#ef4444',            // Red
    '--info': '#3b82f6',             // Blue

    '--border-primary': '#1a2d1f',   // Dark green
    '--border-secondary': '#4ade80', // Bright green

    '--shadow': 'rgba(34, 197, 94, 0.15)',   // Greener shadow with more opacity
    '--shadow-strong': 'rgba(34, 197, 94, 0.25)',
    '--overlay': 'rgba(5, 10, 7, 0.9)',       // Ultra dark overlay
  },
}

// Additional free theme - Clean and professional dark gray
const cleanTheme: Theme = {
  id: 'clean',
  displayName: 'Clean Professional',
  isPremiumOnly: false,
  tokens: {
    '--bg-primary': '#0f0f0f',       // Clean dark gray
    '--bg-secondary': '#1a1a1a',     // Medium dark gray
    '--bg-tertiary': '#2d2d2d',      // Light dark gray
    '--bg-accent': '#1f1f1f',        // Slightly lighter accent

    '--gradient-primary': 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d2d2d 100%)',
    '--gradient-secondary': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3a3a3a 100%)',
    '--gradient-accent': 'radial-gradient(ellipse at top, #1a1a1a, #0f0f0f)',
    '--gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',

    '--text-primary': '#ffffff',     // Pure white
    '--text-secondary': '#e5e5e5',   // Light gray
    '--text-muted': '#a3a3a3',       // Medium gray
    '--text-accent': '#3b82f6',      // Blue accent

    '--accent-primary': '#3b82f6',   // Blue
    '--accent-secondary': '#2563eb', // Darker blue
    '--accent-hover': '#1d4ed8',     // Even darker blue

    '--gradient-accent-primary': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    '--gradient-accent-hover': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',

    '--success': '#10b981',          // Emerald green
    '--warning': '#f59e0b',          // Amber
    '--error': '#ef4444',            // Red
    '--info': '#3b82f6',             // Blue

    '--border-primary': '#2d2d2d',   // Light dark gray
    '--border-secondary': '#3b82f6', // Blue

    '--shadow': 'rgba(59, 130, 246, 0.15)',
    '--shadow-strong': 'rgba(59, 130, 246, 0.25)',
    '--overlay': 'rgba(15, 15, 15, 0.9)',
  },
}

// Premium themes
const premiumThemes: Theme[] = [
  {
    id: 'neon',
    displayName: 'Neon Nights',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#0a0a0a',
      '--bg-secondary': '#151515',
      '--bg-tertiary': '#1f1f1f',
      '--bg-accent': '#0a0f0a',

      '--gradient-primary': 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 50%, #151515 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #151515 0%, #1f1f1f 50%, #2a2a2a 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #0f0f0f, #0a0a0a)',
      '--gradient-success': 'linear-gradient(135deg, #00ff00 0%, #00cc00 50%, #00aa00 100%)',

      '--text-primary': '#ffffff',
      '--text-secondary': '#e8e8e8',
      '--text-muted': '#b8b8b8',
      '--text-accent': '#00ff88',

      '--accent-primary': '#00ff88',
      '--accent-secondary': '#00cc66',
      '--accent-hover': '#00aa44',

      '--gradient-accent-primary': 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',

      '--success': '#00ff00',
      '--warning': '#ffaa00',
      '--error': '#ff4444',
      '--info': '#4488ff',

      '--border-primary': '#333333',
      '--border-secondary': '#00ff88',

      '--shadow': 'rgba(0, 255, 136, 0.2)',
      '--shadow-strong': 'rgba(0, 255, 136, 0.3)',
      '--overlay': 'rgba(0, 0, 0, 0.95)',
    },
  },
  {
    id: 'sunset',
    displayName: 'Sunset Vibes',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#1a0f0a',      // Dark reddish-brown
      '--bg-secondary': '#2d1810',    // Darker reddish
      '--bg-tertiary': '#4a2c1a',     // Medium dark reddish
      '--bg-accent': '#0f1a0a',       // Dark greenish accent

      '--gradient-primary': 'linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #4a2c1a 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #2d1810 0%, #4a2c1a 50%, #5a3d2a 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #2d1810, #1a0f0a)',
      '--gradient-success': 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',

      '--text-primary': '#fff5f0',    // Warm off-white
      '--text-secondary': '#f0d5c0',  // Warm light orange
      '--text-muted': '#e0c5a0',      // Warm medium orange
      '--text-accent': '#ff6b35',     // Orange accent

      '--accent-primary': '#ff6b35',  // Orange
      '--accent-secondary': '#e55a2b', // Darker orange
      '--accent-hover': '#cc4a22',    // Even darker orange

      '--gradient-accent-primary': 'linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #e55a2b 0%, #cc4a22 100%)',

      '--success': '#22c55e',         // Green
      '--warning': '#ffaa00',         // Yellow-orange
      '--error': '#ff4444',           // Red
      '--info': '#4488ff',            // Blue

      '--border-primary': '#4a2c1a',  // Medium dark reddish
      '--border-secondary': '#ff6b35', // Orange

      '--shadow': 'rgba(255, 107, 53, 0.15)',
      '--shadow-strong': 'rgba(255, 107, 53, 0.25)',
      '--overlay': 'rgba(26, 15, 10, 0.85)',
    },
  },
  {
    id: 'ocean',
    displayName: 'Ocean Depths',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#0a141a',      // Very dark blue-green
      '--bg-secondary': '#1a2a35',    // Dark blue-green
      '--bg-tertiary': '#2a3f4a',     // Medium dark blue-green
      '--bg-accent': '#0f1a1f',       // Dark greenish accent

      '--gradient-primary': 'linear-gradient(135deg, #0a141a 0%, #1a2a35 50%, #2a3f4a 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #1a2a35 0%, #2a3f4a 50%, #3a4f5a 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #1a2a35, #0a141a)',
      '--gradient-success': 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',

      '--text-primary': '#f0f8ff',    // Very light blue-white
      '--text-secondary': '#c7e0f0',  // Light blue-gray
      '--text-muted': '#8fb3cc',      // Medium blue-gray
      '--text-accent': '#22d3ee',     // Cyan accent

      '--accent-primary': '#22d3ee',  // Cyan
      '--accent-secondary': '#0891b2', // Darker cyan
      '--accent-hover': '#0e7490',    // Even darker cyan

      '--gradient-accent-primary': 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',

      '--success': '#22c55e',         // Green
      '--warning': '#f59e0b',         // Orange
      '--error': '#ff4444',           // Red
      '--info': '#3b82f6',            // Blue

      '--border-primary': '#2a3f4a',  // Medium dark blue-green
      '--border-secondary': '#22d3ee', // Cyan

      '--shadow': 'rgba(34, 211, 238, 0.15)',
      '--shadow-strong': 'rgba(34, 211, 238, 0.25)',
      '--overlay': 'rgba(10, 20, 26, 0.85)',
    },
  },
  {
    id: 'mystic',
    displayName: 'Mystic Purple',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#1a0f1a',      // Dark purple base
      '--bg-secondary': '#2d1f2d',    // Medium purple
      '--bg-tertiary': '#3f2f3f',     // Light purple
      '--bg-accent': '#1f1a2d',       // Purple accent

      '--gradient-primary': 'linear-gradient(135deg, #1a0f1a 0%, #2d1f2d 50%, #3f2f3f 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #2d1f2d 0%, #3f2f3f 50%, #4f3f4f 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #2d1f2d, #1a0f1a)',
      '--gradient-success': 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7c3aed 100%)',

      '--text-primary': '#f3f0ff',    // Light purple-white
      '--text-secondary': '#e0d4f0',  // Light purple-gray
      '--text-muted': '#c4b5d4',       // Medium purple-gray
      '--text-accent': '#c084fc',     // Purple accent

      '--accent-primary': '#a855f7',  // Purple
      '--accent-secondary': '#9333ea', // Darker purple
      '--accent-hover': '#7c3aed',    // Even darker purple

      '--gradient-accent-primary': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',

      '--success': '#10b981',         // Emerald green
      '--warning': '#f59e0b',         // Amber
      '--error': '#ef4444',           // Red
      '--info': '#8b5cf6',            // Purple info

      '--border-primary': '#3f2f3f',  // Light purple
      '--border-secondary': '#a855f7', // Purple

      '--shadow': 'rgba(168, 85, 247, 0.15)',
      '--shadow-strong': 'rgba(168, 85, 247, 0.25)',
      '--overlay': 'rgba(26, 15, 26, 0.85)',
    },
  },
  {
    id: 'golden',
    displayName: 'Golden Luxe',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#1a150a',      // Dark golden brown
      '--bg-secondary': '#2d2415',    // Medium golden
      '--bg-tertiary': '#4a3d2a',     // Light golden
      '--bg-accent': '#2a1f0f',       // Golden accent

      '--gradient-primary': 'linear-gradient(135deg, #1a150a 0%, #2d2415 50%, #4a3d2a 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #2d2415 0%, #4a3d2a 50%, #5a4d3a 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #2d2415, #1a150a)',
      '--gradient-success': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',

      '--text-primary': '#fff8f0',    // Warm off-white
      '--text-secondary': '#f5e6d3',  // Warm light orange
      '--text-muted': '#e6d5c1',      // Warm medium orange
      '--text-accent': '#fbbf24',     // Golden accent

      '--accent-primary': '#f59e0b',  // Amber/gold
      '--accent-secondary': '#d97706', // Darker gold
      '--accent-hover': '#b45309',    // Even darker gold

      '--gradient-accent-primary': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',

      '--success': '#10b981',         // Emerald green
      '--warning': '#f59e0b',         // Amber
      '--error': '#ef4444',           // Red
      '--info': '#f59e0b',            // Golden info

      '--border-primary': '#4a3d2a',  // Light golden
      '--border-secondary': '#f59e0b', // Gold

      '--shadow': 'rgba(245, 158, 11, 0.15)',
      '--shadow-strong': 'rgba(245, 158, 11, 0.25)',
      '--overlay': 'rgba(26, 21, 10, 0.85)',
    },
  },
  {
    id: 'arctic',
    displayName: 'Arctic Frost',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#0f1419',      // Dark blue-gray
      '--bg-secondary': '#1e2a35',    // Medium blue-gray
      '--bg-tertiary': '#2d3f4a',     // Light blue-gray
      '--bg-accent': '#1a2530',       // Blue-gray accent

      '--gradient-primary': 'linear-gradient(135deg, #0f1419 0%, #1e2a35 50%, #2d3f4a 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #1e2a35 0%, #2d3f4a 50%, #3c4f5a 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #1e2a35, #0f1419)',
      '--gradient-success': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',

      '--text-primary': '#f0f9ff',    // Light blue-white
      '--text-secondary': '#e0f2fe',  // Light cyan
      '--text-muted': '#bae6fd',      // Medium cyan
      '--text-accent': '#22d3ee',     // Cyan accent

      '--accent-primary': '#06b6d4',  // Cyan
      '--accent-secondary': '#0891b2', // Darker cyan
      '--accent-hover': '#0e7490',    // Even darker cyan

      '--gradient-accent-primary': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',

      '--success': '#10b981',         // Emerald green
      '--warning': '#f59e0b',         // Amber
      '--error': '#ef4444',           // Red
      '--info': '#06b6d4',            // Cyan info

      '--border-primary': '#2d3f4a',  // Light blue-gray
      '--border-secondary': '#06b6d4', // Cyan

      '--shadow': 'rgba(6, 182, 212, 0.15)',
      '--shadow-strong': 'rgba(6, 182, 212, 0.25)',
      '--overlay': 'rgba(15, 20, 25, 0.85)',
    },
  },
  {
    id: 'deepred',
    displayName: 'Deep Red',
    isPremiumOnly: true,
    tokens: {
      '--bg-primary': '#1a0f0f',      // Dark red base
      '--bg-secondary': '#2d1a1a',    // Medium dark red
      '--bg-tertiary': '#3f2d2d',     // Light dark red
      '--bg-accent': '#2a1f1f',       // Red accent

      '--gradient-primary': 'linear-gradient(135deg, #1a0f0f 0%, #2d1a1a 50%, #3f2d2d 100%)',
      '--gradient-secondary': 'linear-gradient(135deg, #2d1a1a 0%, #3f2d2d 50%, #4f3f3f 100%)',
      '--gradient-accent': 'radial-gradient(ellipse at top, #2d1a1a, #1a0f0f)',
      '--gradient-success': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',

      '--text-primary': '#fef2f2',    // Light red-white
      '--text-secondary': '#fecaca',  // Light red
      '--text-muted': '#fca5a5',      // Medium red
      '--text-accent': '#f87171',     // Red accent

      '--accent-primary': '#dc2626',  // Red
      '--accent-secondary': '#b91c1c', // Darker red
      '--accent-hover': '#991b1b',    // Even darker red

      '--gradient-accent-primary': 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      '--gradient-accent-hover': 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',

      '--success': '#10b981',         // Emerald green
      '--warning': '#f59e0b',         // Amber
      '--error': '#dc2626',           // Red
      '--info': '#dc2626',            // Red info

      '--border-primary': '#3f2d2d',  // Light dark red
      '--border-secondary': '#dc2626', // Red

      '--shadow': 'rgba(220, 38, 38, 0.15)',
      '--shadow-strong': 'rgba(220, 38, 38, 0.25)',
      '--overlay': 'rgba(26, 15, 15, 0.85)',
    },
  },
]

// All available themes
const allThemes = [defaultTheme, cleanTheme, ...premiumThemes]

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode
}

// Theme provider component
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { canUsePremiumThemes } = usePremium()
  const [currentThemeId, setCurrentThemeId] = useState<string>('default')

  // Load theme from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme) {
      // Only set theme if it's available to the user
      const theme = allThemes.find(t => t.id === storedTheme)
      if (theme && (!theme.isPremiumOnly || canUsePremiumThemes)) {
        setCurrentThemeId(storedTheme)
      }
    }
  }, [canUsePremiumThemes])

  // Apply theme tokens to :root
  useEffect(() => {
    const theme = allThemes.find(t => t.id === currentThemeId)
    if (theme) {
      const root = document.documentElement
      Object.entries(theme.tokens).forEach(([property, value]) => {
        root.style.setProperty(property, value)
      })
    }
  }, [currentThemeId])

  // Set theme function
  const setTheme = (themeId: string) => {
    const theme = allThemes.find(t => t.id === themeId)
    if (theme && (!theme.isPremiumOnly || canUsePremiumThemes)) {
      setCurrentThemeId(themeId)
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    }
  }

  // Get available themes based on premium status
  const availableThemes = allThemes.filter(theme => !theme.isPremiumOnly || canUsePremiumThemes)

  // Get current theme
  const currentTheme = allThemes.find(t => t.id === currentThemeId) || defaultTheme

  const value: ThemeContextType = {
    themes: allThemes,
    currentThemeId,
    currentTheme,
    setTheme,
    availableThemes,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook to use theme context
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}

// Convenience hooks
export function useCurrentTheme() {
  const { currentTheme } = useTheme()
  return currentTheme
}

export function useAvailableThemes() {
  const { availableThemes } = useTheme()
  return availableThemes
}

export function useSetTheme() {
  const { setTheme } = useTheme()
  return setTheme
}

// Export themes for use in other components
export { defaultTheme, premiumThemes, allThemes }
export type { Theme, ThemeTokens }