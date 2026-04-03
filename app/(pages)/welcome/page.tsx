
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Trophy, Users, Star, PartyPopper } from 'lucide-react'
import styles from './welcome.module.css'
import WelcomeGiftsModal from '@/app/components/WelcomeGiftsModal/WelcomeGiftsModal'
import { useAuth } from '@/app/context/AuthContext'

export default function WelcomePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WelcomePage />
    </Suspense>
  )
}

function WelcomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading } = useAuth()
  const [showGiftsModal, setShowGiftsModal] = useState(false)
  const [isAllowed, setIsAllowed] = useState(false)
  const waitStartRef = useRef<number | null>(null)

  // Only allow access for authenticated users coming from a fresh signup.
  // This prevents accidentally breaking the normal sign-in -> /home flow.
  useEffect(() => {
    if (loading) {
      console.log('🔄 Welcome page: waiting for auth to load')
      return
    }

    const urlNew = searchParams.get('new')
    const allowByUrl = urlNew === '1'
    const flag = typeof window !== 'undefined' ? sessionStorage.getItem('is_new_signup') : null

    console.log('🎯 Welcome page check:', { 
      session: !!session, 
      urlNew, 
      allowByUrl, 
      flag,
      isAllowed 
    })

    // After OAuth callback, session can briefly be null even though it's being established.
    // If we arrived via the explicit new-user URL param, wait a bit before deciding.
    if (!session) {
      if (!allowByUrl) {
        console.log('❌ No session and no URL flag, redirecting to landing')
        router.replace('/')
        return
      }

      if (waitStartRef.current === null) {
        waitStartRef.current = Date.now()
      }

      const elapsed = Date.now() - waitStartRef.current
      if (elapsed > 7000) {
        console.log('⏱️ Timeout waiting for session, redirecting to landing')
        router.replace('/')
        return
      }

      console.log('⏳ Waiting for session...')
      const t = window.setTimeout(() => {
        // Force the effect to re-run by updating state; we keep it minimal.
        setIsAllowed(false)
      }, 250)

      return () => window.clearTimeout(t)
    }

    // If authenticated and we have the URL param, always allow (this is a new signup)
    waitStartRef.current = null
    
    if (allowByUrl) {
      console.log('✅ URL param present, allowing welcome page')
      // Persist the flag for the rest of this flow
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('is_new_signup', 'true')
      }
      setIsAllowed(true)
      return
    }

    // No URL param - check sessionStorage flag
    if (flag === 'true') {
      console.log('✅ SessionStorage flag present, allowing welcome page')
      setIsAllowed(true)
      return
    }

    // Not a new signup, redirect to home
    console.log('🏠 Not a new signup, redirecting to home')
    router.replace('/home')
  }, [loading, session, router, searchParams, isAllowed])

  const features = [
    {
      icon: <Trophy size={20} />,
      title: 'Epic Challenges',
      color: '#ff8a65'
    },
    {
      icon: <Star size={20} />,
      title: 'Hilarious Videos',
      color: '#ffd54f'
    },
    {
      icon: <Users size={20} />,
      title: 'Amazing Community',
      color: '#4fc3f7'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Exclusive Content',
      color: '#ce93d8'
    }
  ]

  const handleEnter = () => {
    setShowGiftsModal(true)
  }

  const handleAcceptGifts = () => {
    setShowGiftsModal(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('is_new_signup')
    }
    router.push('/home')
  }

  if (!isAllowed) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.welcomeBadge}>
            WELCOME ABROAD!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.welcomeBadge}>
          WELCOME ABROAD!
        </div>

        <div className={styles.title}>You're Now Part of</div>

        <div className={styles.brandName}>FART BOUNTY</div>

        <p className={styles.subtitle}>
          Get ready for the most hilarious journey of your life! Challenge friends, 
          share epic stories, and join the ultimate fart community. Your adventure starts now!
        </p>

        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureTitleRow}>
                <span
                  className={styles.featureIcon}
                  style={{ color: feature.color }}
                >
                  {feature.icon}
                </span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.enterButton} onClick={handleEnter}>
          ENTER FART BOUNTY
        </button>

        <div className={styles.funMessage}>
          <PartyPopper size={20} />
          <span>Let the fart-tastic fun begin!</span>
        </div>
      </div>

      {showGiftsModal && (
        <WelcomeGiftsModal onAccept={handleAcceptGifts} />
      )}
    </div>
  )
}
