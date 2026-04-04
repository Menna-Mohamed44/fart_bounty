'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'
import { AuthModal } from './components/AuthForms/AuthModal'
import styles from './LandingPage.module.css'
import { Medal, Trophy, Users, Sparkles, ShieldCheck, Mail, MessageCircle, Brain, Menu, X } from 'lucide-react'

export default function LandingPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const mq = window.matchMedia('(max-width: 768px)')
    if (!mq.matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  // Redirect authenticated users to home page
  // BUT: Skip redirect if this is a new signup (AuthModal handles that)
  useEffect(() => {
    console.log('🔍 Landing page useEffect - session:', !!session)
    
    if (session) {
      // Check if this is a new signup
      const isNewSignup = sessionStorage.getItem('is_new_signup')
      console.log('📝 is_new_signup flag:', isNewSignup)
      
      if (isNewSignup === 'true') {
        // Clear the flag - AuthModal will handle the redirect to /welcome
        console.log('🟢 New signup detected - NOT redirecting to home')
        sessionStorage.removeItem('is_new_signup')
      } else {
        // Regular signin - redirect to home
        console.log('🔵 Existing user - redirecting to /home')
        router.push('/home')
      }
    }
  }, [session, router])

  const openSignInModal = () => {
    console.log('🔵 openSignInModal clicked')
    setAuthModalMode('signin')
    setIsAuthModalOpen(true)
  }

  const openSignUpModal = () => {
    console.log('🟢 openSignUpModal clicked')
    setAuthModalMode('signup')
    setIsAuthModalOpen(true)
  }

  return (
    <>
    <div className={styles.page}>
      <header className={styles.navbar}>
        {mobileMenuOpen && (
          <div
            className={styles.navBackdrop}
            aria-hidden="true"
            onClick={closeMobileMenu}
          />
        )}
        <div className={styles.navInner}>
          <div
            className={styles.navBrand}
            onClick={() => {
              closeMobileMenu()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            Fart Bounty
          </div>
          <button
            type="button"
            className={styles.navToggle}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-primary-nav"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? <X size={26} strokeWidth={2.25} /> : <Menu size={26} strokeWidth={2.25} />}
          </button>
          <nav
            id="landing-primary-nav"
            className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ''}`}
            aria-label="Primary"
          >
            <a href="#features" className={styles.navLink} onClick={closeMobileMenu}>
              Features
            </a>
            <a href="#about" className={styles.navLink} onClick={closeMobileMenu}>
              About
            </a>
            <a href="#contact" className={styles.navLink} onClick={closeMobileMenu}>
              Contact
            </a>
            <button
              type="button"
              className={styles.navSignIn}
              onClick={() => {
                closeMobileMenu()
                openSignInModal()
              }}
            >
              Sign In
            </button>
          </nav>
        </div>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.brand}>
            <div className={styles.brandEmblem} aria-hidden>
              <img src="/transparent-mask.png" alt="Fart Bounty gas mask" className={styles.brandImage} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitleTop}>FART</span>
              <span className={styles.brandTitleBottom}>BOUNTY</span>
            </div>
          </div>

          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Welcome to the ultimate 
              <span style={{ color: '#0bda51', WebkitTextFillColor: '#0bda51', backgroundClip: 'unset', WebkitBackgroundClip: 'unset' }}> Fart Community!</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Challenge friends, watch and upload media, and get access to the most entertaining fart‑focused platform ever created!
            </p>
            <div className={styles.ctas}>
              <button className={styles.primaryCta} onClick={openSignUpModal}>Start Your Journey!</button>
              <button className={styles.secondaryCta} onClick={openSignInModal}>Sign In</button>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <h2 className={styles.featuresTitle}>Features</h2>
          <div className={styles.features}>
            <div className={styles.card}>
              <div className={styles.cardIcon}><Medal /></div>
              <h3>Fart Challenges</h3>
              <p className={styles.cardMiniText}>Compete in hilarious challenges :)</p>
              <p>Take on fart challenges, compete with friends, learn about Fart Legends and become a part of the glory!</p>
              <button className={styles.cardButton} onClick={openSignInModal}>Sign In Now</button>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}><Trophy /></div>
              <h3>Fart Gold</h3>
              <p className={styles.cardMiniText}>Your fart adventure starts now</p>
              <p>Get access to awesome features like the Bounty Blaster Pro, The Fart Confessional, and the Fart Hall of Fame!</p>
              <button className={styles.cardButton} onClick={openSignInModal}>Destiny Awaits</button>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}><Users /></div>
              <h3>Community</h3>
              <p className={styles.cardMiniText}>Connect with other fart enthusiasts!</p>
              <p>Create Groups, Share Stories, and get access to the latest fart news and merchandise!</p>
              <button className={styles.cardButton} onClick={openSignUpModal}>Join Fart Bounty</button>
            </div>
            <div className={styles.card}>
              <div className={styles.cardIcon}><Sparkles /></div>
              <h3>The Best Farts</h3>
              <p className={styles.cardMiniText}>Fart Bounty is loaded with entertainment</p>
              <p>See funny fart videos, get weekly fart art, and go premium for Full Access to all of the fart sounds!</p>
              <button className={styles.cardButton} onClick={openSignUpModal}>Go Premium</button>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className={styles.infoSection}>
        <div className={styles.infoInner}>
          <h2 className={styles.infoTitle}>About</h2>
          <p className={styles.infoSubtitle}>
            Fart Bounty is a community built around creativity and laughs. Share sounds and stories, take on challenges,
            and climb the Hall of Fame while keeping things light and fun.
          </p>

          <div className={styles.infoCards}>
            <div className={`${styles.card} ${styles.infoCard}`}>
              <div className={styles.cardIcon}><ShieldCheck /></div>
              <h3>Safe & Fun Environment</h3>
              <p>We've created a judgment-free zone where everyone can laugh, share, and enjoy the lighter side of life. Our community guidelines ensure a positive experience for all members.</p>
            </div>
            <div className={`${styles.card} ${styles.infoCard}`}>
              <div className={styles.cardIcon}><Users /></div>
              <h3>Growing Community</h3>
              <p>Join thousands of members from around the world who share your sense of humor. Connect with like-minded people and make lasting friendships through laughter.</p>
            </div>
            <div className={`${styles.card} ${styles.infoCard}`}>
              <div className={styles.cardIcon}><Brain /></div>
              <h3>AI-Powered Fun</h3>
              <p>Experience cutting-edge AI technology that generates unique fart sounds, creates personalized content, and enhances your overall experience on the platform.</p>
            </div>
            <div className={`${styles.card} ${styles.infoCard}`}>
              <div className={styles.cardIcon}><Trophy /></div>
              <h3>Competitive Spirit</h3>
              <p>Participate in challenges, climb leaderboards, earn badges, and compete with friends in various games and activities designed to bring out your competitive side.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className={`${styles.infoSection} ${styles.contactSection}`}>
        <div className={styles.infoInner}>
          <h2 className={styles.infoTitle}>Contact</h2>
          <p className={styles.infoSubtitle}>
            Got questions or need a hand? Reach out through the channels below and our crew will get back to you fast.
          </p>

          <div className={styles.contactGrid}>
            <div className={`${styles.card} ${styles.contactCard}`}>
              <div className={styles.cardIcon}><Mail /></div>
              <h3>Email Support</h3>
              <p>Need detailed assistance? Send us a message with screenshots, stories, or requests and we’ll reply within 24 hours.</p>
              <a className={styles.cardLink} href="mailto:support@fartbounty.app">support@fartbounty.app</a>
            </div>
            <div className={`${styles.card} ${styles.contactCard}`}>
              <div className={styles.cardIcon}><MessageCircle /></div>
              <h3>Live Chat</h3>
              <p>Chat with the team in real time for quick answers, troubleshooting, or just to share a fresh fart victory.</p>
              <button className={styles.cardButton} onClick={() => router.push('/chat')}>Start Live Chat</button>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <nav className={styles.footerNav} aria-label="Footer">
            <a className={styles.footerLink} href="#features">Features</a>
            <a className={styles.footerLink} href="#about">About</a>
            <a className={styles.footerLink} href="#contact">Contact</a>
            <a className={styles.footerLink} href="mailto:support@fartbounty.app">Support</a>
          </nav>
          <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} Fart Bounty. All rights reserved. Stay gassy, stay classy.</p>
        </div>
      </footer>
    </div>

    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      initialMode={authModalMode}
    />
    </>
  )
}
