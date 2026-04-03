'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium, PremiumTier, TIER_CONFIGS } from '@/app/context/PremiumContext'
import styles from './PremiumTiersModal.module.css'

interface PremiumTiersModalProps {
  isOpen: boolean
  onClose: () => void
}

// Card color variant mapping
const CARD_VARIANTS: Record<PremiumTier, string> = {
  free: 'cardTeal',
  premium: 'cardGreen',
  premium_pro: 'cardOrange',
  unlimited: 'cardRed',
}

// Button style mapping
const BUTTON_STYLES: Record<PremiumTier, string> = {
  free: styles.buttonTeal,
  premium: styles.buttonGreen,
  premium_pro: styles.buttonOrange,
  unlimited: styles.buttonRed,
}

// Button labels
const BUTTON_LABELS: Record<PremiumTier, string> = {
  free: 'Get Started',
  premium: 'Choose',
  premium_pro: 'Choose',
  unlimited: 'Choose',
}

// Ordered tiers for "previous tier" lookups
const TIER_ORDER: PremiumTier[] = ['free', 'premium', 'premium_pro', 'unlimited']

// Label helpers
const EDITING_LABELS: Record<string, string> = {
  none: 'Basic controls (2)',
  basic: 'Basic editing (6 controls)',
  advanced: 'Advanced editing (9 controls)',
  full: 'Full editing suite (all 12)',
}
const ADS_LABELS: Record<string, string> = {
  full: 'Ads supported',
  fewer: 'Fewer ads',
  none: 'No ads',
}

type FeatureItem = { text: string; highlightFirst?: boolean; allGreen?: boolean; isHeader?: boolean }

// Build incremental feature list — only shows what's NEW vs. the previous tier
function buildFeatures(tier: PremiumTier): FeatureItem[] {
  const c = TIER_CONFIGS[tier]
  const idx = TIER_ORDER.indexOf(tier)
  const prev = idx > 0 ? TIER_CONFIGS[TIER_ORDER[idx - 1]] : null
  const isUnlimited = tier === 'unlimited'
  const style = isUnlimited ? { allGreen: true } : { highlightFirst: true }

  // Free tier: show everything as the base
  if (!prev) {
    return [
      { text: `${c.dailyCreations} daily creations` },
      { text: `${c.maxPostLength} char posts` },
      { text: c.soundLibrary },
      { text: EDITING_LABELS[c.editingTools] },
      { text: `${c.maxAvatarSize / (1024 * 1024)}MB avatar uploads` },
      { text: ADS_LABELS[c.ads] },
      { text: 'Community access' },
    ]
  }

  // Paid tiers: "Everything in X, plus:" header + only deltas
  const features: FeatureItem[] = [
    { text: `Everything in ${prev.name}, plus:`, isHeader: true },
  ]

  // Upgraded numeric values
  if (c.dailyCreations !== prev.dailyCreations) {
    const label = c.dailyCreations === 'Unlimited' ? 'Unlimited creations' : `${c.dailyCreations} daily creations`
    features.push({ text: label, ...style })
  }
  if (c.maxPostLength !== prev.maxPostLength) {
    features.push({ text: `${c.maxPostLength} char posts`, ...style })
  }
  if (c.soundLibrary !== prev.soundLibrary) {
    features.push({ text: c.soundLibrary, ...style })
  }
  if (c.editingTools !== prev.editingTools) {
    features.push({ text: EDITING_LABELS[c.editingTools], ...style })
  }
  if (c.maxAvatarSize !== prev.maxAvatarSize) {
    features.push({ text: `${c.maxAvatarSize / (1024 * 1024)}MB avatar uploads`, ...style })
  }

  // Newly unlocked boolean features
  if (c.canUseGifAvatar && !prev.canUseGifAvatar) {
    features.push({ text: 'GIF avatars', ...style })
  }
  if (c.canUploadBanner && !prev.canUploadBanner) {
    features.push({ text: 'Custom banner', ...style })
  }
  if (c.canUsePremiumThemes && !prev.canUsePremiumThemes) {
    features.push({ text: 'Premium themes', ...style })
  }
  if (c.canUsePremiumEffects && !prev.canUsePremiumEffects) {
    features.push({ text: 'Premium effects', ...style })
  }
  if (c.canUseExtraEffects && !prev.canUseExtraEffects) {
    features.push({ text: 'Extra effects pack', ...style })
  }
  if (c.ads !== prev.ads) {
    features.push({ text: ADS_LABELS[c.ads], ...style })
  }
  if (c.hasMonthlyGifts && !prev.hasMonthlyGifts) {
    features.push({ text: 'Monthly digital gifts', ...style })
  }

  return features
}

function FeatureText({ text, highlightFirst, allGreen }: { text: string; highlightFirst?: boolean; allGreen?: boolean }) {
  if (allGreen) {
    return <span className={styles.featureAllGreen}>{text}</span>
  }
  if (highlightFirst) {
    const spaceIdx = text.indexOf(' ')
    if (spaceIdx > 0) {
      return (
        <>
          <span className={styles.featureHighlight}>{text.slice(0, spaceIdx)}</span>
          {text.slice(spaceIdx)}
        </>
      )
    }
  }
  return <>{text}</>
}

export default function PremiumTiersModal({ isOpen, onClose }: PremiumTiersModalProps) {
  const { user, refreshUser } = useAuth()
  const { premiumTier } = usePremium()
  const [loading, setLoading] = useState<PremiumTier | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelectTier = async (tier: PremiumTier) => {
    if (!user) return
    if (tier === premiumTier) return

    setLoading(tier)
    try {
      // Call our checkout API
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userId: user.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('STRIPE_SECRET_KEY') || data.error?.includes('not configured')) {
          alert('Payment system is not configured yet. Please contact support.')
          return
        }
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Free tier handled server-side directly
      if (data.free) {
        await refreshUser()
        setSuccessMsg(`You're now on the ${TIER_CONFIGS[tier].name} plan!`)
        setTimeout(() => {
          setSuccessMsg(null)
          onClose()
        }, 2000)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
        return
      }
    } catch (err) {
      console.error('Error selecting tier:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const tiers: PremiumTier[] = ['free', 'premium', 'premium_pro', 'unlimited']

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={28} strokeWidth={3} />
        </button>

        <h2 className={styles.title}>
          <span className={styles.titleWhite}>Choose your </span>
          <span className={styles.titleGreen}>Bounty Level!</span>
        </h2>

        <div className={styles.cardsContainer}>
          {tiers.map((tier) => {
            const config = TIER_CONFIGS[tier]
            const features = buildFeatures(tier)
            const isCurrent = tier === premiumTier
            const isLoading = loading === tier

            return (
              <div key={tier} className={styles.card}>
                {/* MOST POPULAR ribbon for premium_pro */}
                {tier === 'premium_pro' && (
                  <div className={styles.ribbon}>MOST POPULAR</div>
                )}

                {/* Current tier badge */}
                {isCurrent && (
                  <div className={styles.currentBadge}>CURRENT</div>
                )}

                <div className={`${styles.cardBody} ${styles[CARD_VARIANTS[tier]]}`}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardTitle}>{config.name}</div>
                    <div className={`${styles.cardPrice} ${
                      tier === 'free' ? styles.priceFree :
                      tier === 'premium' ? styles.priceGreen :
                      tier === 'premium_pro' ? styles.priceOrange :
                      styles.priceRed
                    }`}>
                      {config.price}
                    </div>

                    <ul className={styles.featureList}>
                      {features.map((feat, i) =>
                        feat.isHeader ? (
                          <li key={i} className={styles.featureHeader}>{feat.text}</li>
                        ) : (
                          <li key={i} className={styles.featureItem}>
                            <FeatureText
                              text={feat.text}
                              highlightFirst={feat.highlightFirst}
                              allGreen={feat.allGreen}
                            />
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className={styles.cardButtonArea}>
                    <button
                      className={`${styles.cardButton} ${BUTTON_STYLES[tier]} ${isCurrent ? styles.buttonActive : ''}`}
                      onClick={() => handleSelectTier(tier)}
                      disabled={isCurrent || isLoading}
                    >
                      {isCurrent ? 'Current Plan' : BUTTON_LABELS[tier]}
                    </button>
                  </div>

                  {isLoading && (
                    <div className={styles.loadingOverlay}>
                      <div className={styles.spinner} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {successMsg && (
        <div className={styles.successToast}>{successMsg}</div>
      )}
    </div>
  )
}
