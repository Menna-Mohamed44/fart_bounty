'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { Mail, Lock, Loader2 } from 'lucide-react'
import styles from './AuthForms.module.css'

interface SignInFormProps {
  onSuccess?: () => void
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await signIn(email, password)
      
      if (signInError) {
        // Handle different error types with user-friendly messages
        let userMessage = signInError.message
        
        if (signInError.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (signInError.message.includes('Email not confirmed')) {
          userMessage = 'Please confirm your email address before signing in. Check your inbox for the confirmation link.'
        } else if (signInError.message.includes('User not found')) {
          userMessage = 'No account found with this email. Please sign up first.'
        } else if (signInError.message.includes('Failed to fetch')) {
          userMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
        }
        
        setError(userMessage)
      } else {
        onSuccess?.()
      }
    } catch (err) {
      // Catch any unexpected errors and show a generic message
      setError('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            <Mail size={18} />
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="your@email.com"
            required
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            <Lock size={18} />
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={20} className={styles.spinner} />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className={styles.agreementText}>
        By signing in, you agree to our <a href="#" aria-label="Terms of Service">Terms</a> and <a href="#" aria-label="Privacy Policy">Privacy Policy</a>.
      </p>
    </div>
  )
}
