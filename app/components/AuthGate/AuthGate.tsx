'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { LogIn, Crown, ArrowRight } from 'lucide-react'
import styles from './AuthGate.module.css'

interface AuthGateProps {
  children?: React.ReactNode
  requireAuth?: boolean
  allowGuests?: boolean
  promptMessage?: string
  ctaText?: string
  className?: string
}

export default function AuthGate({
  children,
  requireAuth = false,
  allowGuests = false,
  promptMessage = "Sign in to access this feature",
  ctaText = "Sign In",
  className = ""
}: AuthGateProps) {
  const { user } = useAuth()
  const router = useRouter()

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>
  }

  // If guests are allowed, render children but show prompt for interactions
  if (allowGuests) {
    return <>{children}</>
  }

  // If authentication is required, show sign-in prompt
  if (requireAuth) {
    return (
      <div className={`${styles.authGate} ${className}`}>
        <div className={styles.container}>
          <div className={styles.icon}>
            <LogIn size={48} />
          </div>
          <h2 className={styles.title}>Sign In Required</h2>
          <p className={styles.message}>{promptMessage}</p>
          <button
            className={styles.ctaButton}
            onClick={() => router.push('/')}
          >
            <LogIn size={20} />
            <span>{ctaText}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Hook for handling guest interactions that require authentication
export function useGuestInteraction() {
  const { user } = useAuth()
  const router = useRouter()

  const requireAuth = (action: string = "perform this action") => {
    if (!user) {
      // Could show a toast or modal here instead of direct redirect
      router.push('/')
      return false
    }
    return true
  }

  return { requireAuth, isAuthenticated: !!user }
}
