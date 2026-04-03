'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient, handleSupabaseError, type User as DatabaseUser, type Tables, type Inserts } from '../lib/supabaseClient'
import { generateDisplayName, generateUniqueUsername } from '../lib/usernameGenerator'

// Extended user type that includes database fields
export interface AuthUser extends DatabaseUser {
  // Add any additional computed fields if needed
}

// Auth context state interface
interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ user: AuthUser | null; error: AuthError | null }>
  signInWithGoogle: (isSignup?: boolean) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  refreshUser: () => Promise<{ user: AuthUser | null; error: AuthError | null }>
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (mounted) {
          setSession(session)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          } else {
            setUser(null)
          }
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setLoading(false)
          handleSupabaseError(error)
        }
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return

        setSession(session)

        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<void> => {
    try {
      console.log('🔍 Fetching user profile for ID:', userId)
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.log('⚠️ Profile fetch error:', { code: error.code, message: error.message, details: error.details })
        // If profile doesn't exist, try to create it from auth metadata
        if (error.code === 'PGRST116') { // No rows returned
          console.log('🆕 Profile not found, creating new profile for user:', userId)
          await createUserProfile(userId)
          return // Return early after creating profile
        } else {
          console.error('❌ Unexpected error fetching profile:', error)
          // Don't throw - let the user continue even if profile fetch fails
          return
        }
      }
      
      if (profile) {
        const userProfile = profile as AuthUser
        console.log('✅ Profile loaded successfully:', { id: userProfile.id, username: userProfile.username })
        
        // Check if username needs sanitization (contains invalid characters like spaces)
        const sanitizedUsername = userProfile.username.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        if (sanitizedUsername !== userProfile.username) {
          console.log('Username contains invalid characters, sanitizing:', userProfile.username, '->', sanitizedUsername)
          // Update username in database
          const { error: updateError } = await (supabase as any)
            .from('users')
            .update({ username: sanitizedUsername })
            .eq('id', userProfile.id)
          
          if (updateError) {
            console.error('Failed to sanitize username:', updateError)
          } else {
            console.log('Username sanitized successfully')
            userProfile.username = sanitizedUsername
          }
        }
        
        setUser(userProfile)
      } else {
        console.warn('Profile query returned no data and no error')
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', {
        error,
        userId,
        errorType: typeof error,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : []
      })
      // Don't throw here - just log the error and continue
      // The user might still be authenticated even if profile fetch fails
    }
  }

  // Create user profile if it doesn't exist
  const createUserProfile = async (userId: string): Promise<void> => {
    try {
      console.log('👤 Starting profile creation for user:', userId)
      
      // Get user metadata from auth
      const { data: { user: authUser }, error: getUserError } = await supabase.auth.getUser()

      if (getUserError) {
        console.error('❌ Error getting auth user:', getUserError)
        return
      }

      if (!authUser) {
        console.error('❌ No auth user found')
        return
      }

      console.log('📋 Auth user metadata:', authUser.user_metadata)

      // Generate random username and display name if not provided
      let username = authUser.user_metadata?.username
      let display_name = authUser.user_metadata?.display_name
      
      // If no username in metadata, generate a unique one
      if (!username) {
        console.log('🎲 No username in metadata, generating unique one...')
        username = await generateUniqueUsername(supabase)
        console.log('✨ Generated username:', username)
      } else {
        // Ensure valid username format
        username = username.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        console.log('🔧 Sanitized existing username:', username)
      }
      
      // If no display name, generate a random one
      if (!display_name) {
        console.log('🎲 No display name in metadata, generating one...')
        display_name = generateDisplayName()
        console.log('✨ Generated display name:', display_name)
      }
      
      console.log('💾 Creating user profile with:', { userId, username, display_name })

      const userData: Inserts<'users'> = {
        id: userId,
        username: username,
        display_name: display_name,
      }

      // First, ensure we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('❌ No active session found, cannot create profile')
        return
      }

      console.log('✅ Active session confirmed, proceeding with profile creation')

      const { data, error } = await (supabase as any)
        .from('users')
        .insert([userData])
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating user profile:')
        console.error('   Code:', error.code)
        console.error('   Message:', error.message)
        console.error('   Details:', error.details)
        console.error('   Hint:', error.hint)
        console.error('   User data:', userData)
        
        // If username conflict, generate a new unique one
        if (error.code === '23505') { // Unique constraint violation
          console.log('⚠️ Username conflict detected, generating new unique username...')
          const uniqueUsername = await generateUniqueUsername(supabase)
          console.log('🔄 Retrying with new username:', uniqueUsername)
          
          const { data: retryData, error: retryError } = await (supabase as any)
            .from('users')
            .insert([{ ...userData, username: uniqueUsername }])
            .select()
            .single()
          
          if (retryError) {
            console.error('❌ Retry failed:', retryError.message)
            return
          }
          
          if (retryData) {
            setUser(retryData as AuthUser)
            console.log('✅ Profile created with unique username:', retryData.username)
          }
        } else if (error.code === '42501') {
          console.error('❌ Permission denied - RLS policy blocking insert')
          console.error('   This usually means auth.uid() does not match the user id')
          console.error('   Session user:', session.user.id)
          console.error('   Trying to insert:', userId)
        }
      } else if (data) {
        setUser(data as AuthUser)
        console.log('✅ User profile created successfully:', { id: data.id, username: data.username, display_name: data.display_name })
      } else {
        console.error('❌ No data returned from insert operation')
      }
    } catch (error) {
      console.error('❌ Exception in createUserProfile:', error)
      if (error && typeof error === 'object') {
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
      }
    }
  }

  // Sign in method
  const signIn = async (email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { user: null, error }
      }

      // User profile will be fetched automatically via the auth state listener
      return { user: user, error: null }
    } catch (error: any) {
      // Return a generic error without throwing
      return { 
        user: null, 
        error: { 
          message: error?.message || 'Failed to sign in',
          name: 'AuthError',
          status: error?.status || 500
        } as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign up method
  const signUp = async (email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
    setLoading(true)

    try {
      // Sign up without username/displayName - will be auto-generated
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { user: null, error }
      }

      // User profile will be created automatically via the auth state listener
      // Username and display name will be auto-generated in createUserProfile
      return { user: user, error: null }
    } catch (error: any) {
      // Return a generic error without throwing
      return { 
        user: null, 
        error: { 
          message: error?.message || 'Failed to sign up',
          name: 'AuthError',
          status: error?.status || 500
        } as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async (isSignup: boolean = false): Promise<{ error: AuthError | null }> => {
    try {
      // Save the flow type to BOTH localStorage AND pass via URL
      const flowType = isSignup ? 'signup' : 'signin'
      console.log('🔐 Google OAuth starting, isSignup:', isSignup, 'flowType:', flowType)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('oauth_flow', flowType)
        // Also store in sessionStorage as backup
        sessionStorage.setItem('oauth_flow', flowType)
        // Store an explicit post-auth redirect to make the callback deterministic
        const redirectTarget = isSignup ? '/welcome' : '/home'
        localStorage.setItem('post_auth_redirect', redirectTarget)
        sessionStorage.setItem('post_auth_redirect', redirectTarget)
        console.log('📝 Saved oauth_flow:', flowType)
      }

      // Pass the flow type in the redirect URL as well
      const nextTarget = isSignup ? '/welcome' : '/home'
      const redirectUrl = `${window.location.origin}/auth/callback?flow=${flowType}&next=${encodeURIComponent(nextTarget)}`
      console.log('🔗 Redirect URL:', redirectUrl)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error: any) {
      return {
        error: {
          message: error?.message || 'Failed to sign in with Google',
          name: 'AuthError',
          status: error?.status || 500
        } as AuthError
      }
    }
  }

  // Sign out method
  const signOut = async (): Promise<{ error: AuthError | null }> => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        return { error }
      }

      // State will be cleared automatically via the auth state listener
      return { error: null }
    } catch (error: any) {
      // Return a generic error without throwing
      return { 
        error: { 
          message: error?.message || 'Failed to sign out',
          name: 'AuthError',
          status: error?.status || 500
        } as AuthError 
      }
    } finally {
      setLoading(false)
    }
  }

  // Refresh user profile
  const refreshUser = async (): Promise<{ user: AuthUser | null; error: AuthError | null }> => {
    if (!session?.user?.id) {
      return { user: null, error: null }
    }

    try {
      await fetchUserProfile(session.user.id)
      return { user, error: null }
    } catch (error: any) {
      // Return a generic error without throwing
      return { 
        user: null, 
        error: { 
          message: error?.message || 'Failed to refresh user profile',
          name: 'AuthError',
          status: error?.status || 500
        } as AuthError 
      }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}