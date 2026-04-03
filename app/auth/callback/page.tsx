'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Prevent multiple executions due to HMR
    if (typeof window !== 'undefined' && (window as any).__callbackHandled) {
      console.log('⚠️ Callback already handled, skipping')
      return
    }

    // Add timeout fallback - if nothing happens in 10 seconds, redirect to home
    const timeoutId = setTimeout(() => {
      console.log('⏱️ Timeout reached, forcing redirect to /home')
      window.location.href = '/home'
    }, 10000)

    const handleCallback = async () => {
      try {
        console.log('🔄 OAuth callback started')
        console.log('📍 Full URL:', window.location.href)
        console.log('📍 Search params:', window.location.search)
        console.log('📍 Hash:', window.location.hash)
        
        const supabase = createClient()
        
        // Check for flow type from multiple sources (URL > sessionStorage > localStorage)
        const urlParams = new URLSearchParams(window.location.search)
        const oauthError = urlParams.get('error') || urlParams.get('error_code')
        const oauthErrorDescription = urlParams.get('error_description')
        if (oauthError) {
          console.log('❌ OAuth error:', oauthError, oauthErrorDescription)
          clearTimeout(timeoutId)
          window.location.href = '/'
          return
        }

        const urlFlow = urlParams.get('flow')
        const urlNext = urlParams.get('next')
        const sessionFlow = sessionStorage.getItem('oauth_flow')
        const localFlow = localStorage.getItem('oauth_flow')

        const sessionRedirect = sessionStorage.getItem('post_auth_redirect')
        const localRedirect = localStorage.getItem('post_auth_redirect')
        // URL next param is the most reliable signal across OAuth redirects
        const explicitRedirect = urlNext || sessionRedirect || localRedirect
        
        // Use URL param first, then sessionStorage, then localStorage
        const savedFlow = urlFlow || sessionFlow || localFlow
        console.log('📝 Flow sources - URL:', urlFlow, 'Session:', sessionFlow, 'Local:', localFlow)
        console.log('📝 Using flow:', savedFlow)
        console.log('🧭 post_auth_redirect (explicit):', explicitRedirect)

        const isLikelyNewUser = (user: any) => {
          try {
            const createdAt = user?.created_at ? new Date(user.created_at).getTime() : null
            const lastSignInAt = user?.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : null
            if (!createdAt) return false

            const now = Date.now()
            const createdRecently = now - createdAt < 2 * 60 * 1000

            if (lastSignInAt) {
              return createdRecently && Math.abs(lastSignInAt - createdAt) < 60 * 1000
            }

            return createdRecently
          } catch {
            return false
          }
        }

        const waitForSession = async (timeoutMs: number): Promise<any | null> => {
          const started = Date.now()
          while (Date.now() - started < timeoutMs) {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) return session
            await new Promise(resolve => setTimeout(resolve, 250))
          }
          return null
        }

        const isMissingProfileRow = async (userId: string): Promise<boolean> => {
          try {
            const { data, error } = await (supabase as any)
              .from('users')
              .select('id')
              .eq('id', userId)
              .maybeSingle()

            if (error) {
              return false
            }

            return !data
          } catch {
            return false
          }
        }
        
        // Try to get code from URL params
        const code = urlParams.get('code')
        
        console.log('📝 Code present:', !!code)
        
        // If there's a hash with access_token, Supabase handles it automatically
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('🔑 Hash-based auth detected, waiting for session...')
          const session = await waitForSession(6000)
          
          if (session) {
            console.log('✅ Session from hash established')
            clearTimeout(timeoutId)
            localStorage.removeItem('oauth_flow')
            sessionStorage.removeItem('oauth_flow')

            // Clean up stored redirects
            localStorage.removeItem('post_auth_redirect')
            sessionStorage.removeItem('post_auth_redirect')

            const missingProfile = await isMissingProfileRow(session.user.id)
            const treatAsSignup = isLikelyNewUser(session.user) && missingProfile
            if (treatAsSignup) {
              console.log('🟢 Signup flow - redirecting to /welcome')
              sessionStorage.setItem('is_new_signup', 'true')
              window.location.href = '/welcome?new=1'
            } else {
              console.log('🔵 Signin flow - redirecting to /home')
              window.location.href = '/home'
            }
            return
          }

          console.log('❌ No session established from hash within timeout')
          clearTimeout(timeoutId)
          window.location.href = '/'
          return
        }
        
        // Handle code-based flow (PKCE)
        if (code) {
          console.log('🔑 Exchanging code for session...')
          const { error, data } = await supabase.auth.exchangeCodeForSession(code)
          
          console.log('📊 Exchange result - error:', error, 'data:', data)
          
          if (error || !data?.session) {
            console.log('❌ Exchange failed:', error)
            clearTimeout(timeoutId);
            (window as any).__callbackHandled = true
            window.location.href = '/home'
            return
          }
          
          console.log('✅ Session established successfully')
          console.log('👤 User:', data.session.user.id)
          console.log('🧭 Explicit redirect:', explicitRedirect)
          console.log('📝 Saved flow:', savedFlow)
          
          clearTimeout(timeoutId);
          (window as any).__callbackHandled = true
          localStorage.removeItem('oauth_flow')
          sessionStorage.removeItem('oauth_flow')

          // Clean up stored redirects
          console.log('🧹 Cleaning up stored redirects')
          localStorage.removeItem('post_auth_redirect')
          sessionStorage.removeItem('post_auth_redirect')

          const missingProfile = await isMissingProfileRow(data.session.user.id)
          console.log('🔍 Missing profile check:', missingProfile)
          const treatAsSignup = isLikelyNewUser(data.session.user) && missingProfile
          console.log('🎭 Treat as signup:', treatAsSignup)
          
          if (treatAsSignup) {
            console.log('🟢 Signup flow - redirecting to /welcome')
            sessionStorage.setItem('is_new_signup', 'true')
            window.location.href = '/welcome?new=1'
          } else {
            console.log('🔵 Signin flow - redirecting to /home')
            window.location.href = '/home'
          }
          return
        }
        
        // No code and no hash - check if there's already a session
        console.log('⏳ Checking for existing session...')
        const session = await waitForSession(6000)
        
        if (session) {
          console.log('✅ Found existing session')
          clearTimeout(timeoutId)
          localStorage.removeItem('oauth_flow')
          sessionStorage.removeItem('oauth_flow')

          // Clean up stored redirects
          localStorage.removeItem('post_auth_redirect')
          sessionStorage.removeItem('post_auth_redirect')

          const missingProfile = await isMissingProfileRow(session.user.id)
          const treatAsSignup = isLikelyNewUser(session.user) && missingProfile
          if (treatAsSignup) {
            console.log('🟢 Signup flow - redirecting to /welcome')
            sessionStorage.setItem('is_new_signup', 'true')
            window.location.href = '/welcome?new=1'
          } else {
            console.log('🔵 Signin flow - redirecting to /home')
            window.location.href = '/home'
          }
        } else {
          console.log('❌ No session found within timeout, redirecting to landing')
          clearTimeout(timeoutId)
          window.location.href = '/'
        }
        
      } catch (err) {
        console.log('❌ Error in callback:', err)
        clearTimeout(timeoutId)
        window.location.href = '/home'
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top, #0d221c 0%, #050909 65%)',
      color: '#e8ffee',
      padding: '2rem',
      fontSize: '14px'
    }}>
      <div style={{
        width: 'min(420px, 92vw)',
        borderRadius: '26px',
        border: '1px solid rgba(46, 255, 190, 0.3)',
        background: 'rgba(8, 20, 16, 0.85)',
        boxShadow: '0 26px 70px rgba(0, 0, 0, 0.48)',
        padding: '2.6rem 2.3rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: '-45px',
          background: 'conic-gradient(from 140deg, rgba(46, 255, 190, 0.22), transparent 58%)',
          filter: 'blur(80px)',
          opacity: 0.75,
          zIndex: 0,
          animation: 'pulseGlow 6s ease-in-out infinite'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(46, 255, 190, 0.18), rgba(41, 173, 255, 0.18))',
            display: 'grid',
            placeItems: 'center',
            marginBottom: '1.6rem'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              border: '3px solid rgba(46, 255, 190, 0.45)',
              borderTopColor: '#2effbe',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
          <h1 style={{
            margin: '0 0 0.8rem',
            fontSize: '1.75rem',
            letterSpacing: '-0.03em',
            fontWeight: 700
          }}>Securing your session…</h1>
          <p style={{
            margin: '0 0 1.9rem',
            lineHeight: 1.6,
            color: 'rgba(223, 255, 240, 0.8)'
          }}>Hang tight while we sync your account and connect you to Fart Bounty.</p>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '7px',
            borderRadius: '999px',
            background: 'rgba(26, 60, 52, 0.72)',
            overflow: 'hidden',
            marginBottom: '1.1rem'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(46, 255, 190, 0.35), transparent 70%)',
              mixBlendMode: 'screen'
            }} />
            <div style={{
              height: '100%',
              width: '45%',
              borderRadius: 'inherit',
              background: 'linear-gradient(90deg, #2effbe, #3ef5ff)',
              animation: 'loadingBar 2.1s ease-in-out infinite'
            }} />
          </div>
          <span style={{
            display: 'inline-block',
            fontSize: '0.75rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(178, 255, 226, 0.78)'
          }}>Syncing your account</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes loadingBar {
          0% { transform: translateX(-105%); }
          50% { transform: translateX(15%); }
          100% { transform: translateX(105%); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: rotate(0deg); }
          50% { opacity: 0.85; transform: rotate(16deg); }
        }

        @media (max-width: 480px) {
          div[style*='min(420px'] {
            padding: 2.1rem 1.9rem;
          }

          h1[style] {
            font-size: 1.55rem !important;
          }

          p[style] {
            font-size: 0.95rem !important;
          }
        }
      `}</style>
    </div>
  )
}
