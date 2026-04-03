'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { Mail, Lock, Loader2 } from 'lucide-react'
import styles from './AuthForms.module.css'

interface SignUpFormProps {
  onSuccess?: () => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error: signUpError, user: signUpUser } = await signUp(
        email,
        password
      )
      
      console.log('📋 SignUp result - Error:', signUpError, 'User:', signUpUser)
      
      if (signUpError) {
        console.log('❌ SignUp error:', signUpError.message)
        // Handle different error types with user-friendly messages
        let userMessage = signUpError.message
        
        if (signUpError.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (signUpError.message.includes('Password should be at least')) {
          userMessage = 'Password must be at least 6 characters long.'
        } else if (signUpError.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address.'
        } else if (signUpError.message.includes('Failed to fetch')) {
          userMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
        } else if (signUpError.message.includes('Username already taken')) {
          userMessage = 'This username is already taken. Please choose a different one.'
        }
        
        setError(userMessage)
      } else {
        console.log('✅ SignUp successful, calling onSuccess...')
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
            minLength={6}
          />
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            <Lock size={18} />
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
            placeholder="••••••••"
            required
            disabled={loading}
            minLength={6}
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
              Creating Account...
            </>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      <p className={styles.agreementText}>
        By signing up, you agree to our <a href="#" aria-label="Terms of Service">Terms</a> and <a href="#" aria-label="Privacy Policy">Privacy Policy</a>. A random username will be generated for you, which you can change anytime in settings.
      </p>
    </div>
  )
}
