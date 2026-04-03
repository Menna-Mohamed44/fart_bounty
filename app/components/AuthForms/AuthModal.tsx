'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '../Modal/Modal'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { useAuth } from '@/app/context/AuthContext'
import { X, Facebook } from 'lucide-react'
import styles from './AuthForms.module.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const { signInWithGoogle } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  // Reset mode when modal opens
  const handleClose = () => {
    onClose()
    // Reset to initial mode after a short delay to avoid visual glitch
    setTimeout(() => setMode(initialMode), 200)
  }

  const handleSuccess = () => {
    console.log('🎯 handleSuccess called, mode:', mode)
    
    // Mark that we're handling a signup to prevent landing page auto-redirect
    if (mode === 'signup') {
      console.log('🟢 Signup mode - setting flag and redirecting to /welcome')
      sessionStorage.setItem('is_new_signup', 'true')
      console.log('📝 sessionStorage flag set:', sessionStorage.getItem('is_new_signup'))
      onClose() // Close modal immediately
      window.location.href = '/welcome' // Use direct navigation instead of router
    } else {
      console.log('🔵 Signin mode - redirecting to /home')
      onClose()
      router.push('/home')
    }
  }

  const handleModeToggle = (nextMode: 'signin' | 'signup') => {
    if (mode !== nextMode) {
      setMode(nextMode)
    }
  }


  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      hideHeader
    >
      <div className={styles.authContent}>
        <button
          type="button"
          className={styles.inlineClose}
          onClick={handleClose}
          aria-label="Close authentication modal"
        >
          <X size={20} />
        </button>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Welcome!</h2>
          <p className={styles.cardSubtitle}>Step into the ultimate fart community</p>
        </div>

        <div className={styles.modeToggle} role="tablist" aria-label="Authentication modes">
          <button
            type="button"
            className={`${styles.toggleButton} ${mode === 'signin' ? styles.toggleButtonActive : ''}`}
            onClick={() => handleModeToggle('signin')}
            aria-pressed={mode === 'signin'}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${mode === 'signup' ? styles.toggleButtonActive : ''}`}
            onClick={() => handleModeToggle('signup')}
            aria-pressed={mode === 'signup'}
          >
            Sign Up
          </button>
        </div>

        <div className={styles.socialButtons}>
          <button
            type="button"
            className={styles.googleButton}
            onClick={async () => {
              console.log('🔵 Google button clicked - current mode:', mode)
              setGoogleError(null)
              setGoogleLoading(true)
              const isSignupMode = mode === 'signup'
              console.log('🔵 isSignupMode:', isSignupMode)
              try {
                const { error } = await signInWithGoogle(isSignupMode)
                if (error) {
                  setGoogleError(error.message || 'Failed to sign in with Google')
                }
              } catch (err) {
                console.error('❌ Google auth error:', err)
                setGoogleError('Something went wrong. Please try again.')
              } finally {
                setGoogleLoading(false)
              }
            }}
            disabled={googleLoading}
          >
            <span className={styles.socialIcon} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" role="img">
                <title>Google</title>
                <path d="M17.64 9.2045C17.64 8.56636 17.5827 7.94818 17.4764 7.35227H9V10.857H13.8436C13.635 11.9823 13.0009 12.9232 12.0601 13.5573V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.2045Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0601 13.5573C11.2532 14.0973 10.2164 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.7099C3.78409 10.1699 3.68182 9.59541 3.68182 9.00041C3.68182 8.4055 3.78409 7.831 3.96409 7.291V4.95917H0.957273C0.347727 6.17368 0 7.54732 0 9.00041C0 10.4535 0.347727 11.8273 0.957273 13.0418L3.96409 10.7099Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3277 3.57955 11.5082 4.03636 12.4445 4.92955L15.0227 2.35136C13.4632 0.891818 11.4264 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
            </span>
            Google
          </button>

          <button
            type="button"
            className={styles.facebookButton}
            onClick={async () => {
              setGoogleError(null)
              setFacebookLoading(true)
              try {
                console.log('Facebook auth not yet implemented')
                setGoogleError('Facebook sign-in coming soon!')
              } finally {
                setFacebookLoading(false)
              }
            }}
            disabled={facebookLoading}
          >
            <span className={styles.socialIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img">
                <title>Facebook</title>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
              </svg>
            </span>
            Facebook
          </button>

          <button
            type="button"
            className={styles.appleButton}
            onClick={async () => {
              setGoogleError(null)
              setAppleLoading(true)
              try {
                console.log('Apple auth not yet implemented')
                setGoogleError('Apple sign-in coming soon!')
              } finally {
                setAppleLoading(false)
              }
            }}
            disabled={appleLoading}
          >
            <span className={styles.socialIcon} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img">
                <title>Apple</title>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#ffffff"/>
              </svg>
            </span>
            Apple
          </button>
        </div>

        {googleError && (
          <div className={styles.error} style={{ marginTop: '1rem' }}>
            {googleError}
          </div>
        )}

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.formWrapper}>
          {mode === 'signin' ? (
            <SignInForm onSuccess={handleSuccess} />
          ) : (
            <SignUpForm onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </Modal>
  )
}
