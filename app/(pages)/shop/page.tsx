'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Modal } from '@/app/components/Modal/Modal'
import { Crown, ExternalLink, Star, CheckCircle, Zap, Calendar, ShoppingCart, Coins } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/app/lib/supabaseClient'
import { shopItems, premiumPlans, type ShopItem } from '@/data/shop'
import styles from './store.module.css'

function MediaLibraryPage() {
  const { user } = useAuth()
  const { premiumTier, premiumSince } = usePremium()
  const { purchaseItem, fbCoins } = useCurrency()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)
  const supabase = createClient()

  const handlePremiumPurchase = async (planId: string) => {
    if (!user) return

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planId, userId: user.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('STRIPE_SECRET_KEY') || data.error?.includes('not configured')) {
          alert('Payment system is not configured yet. Please contact support.')
          return
        }
        throw new Error(data.error || 'Checkout failed')
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      setSelectedPlan(planId)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Premium upgrade failed:', error)
    }
  }

  const handleItemPurchase = async (itemId: string) => {
    setPurchaseLoading(itemId)

    const result = await purchaseItem(itemId)

    if (result.success) {
      setShowSuccessModal(true)
    } else {
      // Show error message
      alert(result.message || 'Purchase failed')
    }

    setPurchaseLoading(null)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysUntilRenewal = () => {
    if (!premiumSince) return 0
    const since = new Date(premiumSince)
    const renewal = new Date(since)
    renewal.setFullYear(renewal.getFullYear() + 1) // Assuming yearly subscription
    const diffTime = renewal.getTime() - new Date().getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const getInGameItems = () => {
    return shopItems.filter(item => item.priceFbCoins !== undefined)
  }

  const getExternalItems = () => {
    return shopItems.filter(item => !item.priceFbCoins)
  }

  const getItemsByCategory = (category: string) => {
    return shopItems.filter(item => item.category === category)
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to browse our shop">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <ShoppingCart className={styles.headerIcon} />
            <div>
              <h1>Fart Bounty Shop</h1>
              <p>Purchase items with FB coins and browse premium subscriptions</p>
            </div>
          </div>

          <div className={styles.coinsDisplay}>
            <Coins size={20} />
            <span>{fbCoins.toLocaleString()} FB Coins</span>
          </div>
        </div>

        {/* Premium Status Section */}
        {premiumTier !== 'free' ? (
          <div className={styles.premiumStatus}>
            <div className={styles.premiumStatusHeader}>
              <CheckCircle className={styles.premiumIcon} />
              <h3>Premium Member</h3>
            </div>
            <div className={styles.premiumStatusDetails}>
              <div className={styles.statusItem}>
                <Calendar size={16} />
                <span>Member since: {formatDate(premiumSince)}</span>
              </div>
              <div className={styles.statusItem}>
                <Zap size={16} />
                <span>Days until renewal: {getDaysUntilRenewal()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.premiumSection}>
            <div className={styles.premiumSectionHeader}>
              <Crown className={styles.premiumIcon} />
              <h3>Unlock Premium Features</h3>
              <p>Get the most out of Fart Bounty with premium access</p>
            </div>

            <div className={styles.premiumPlans}>
              {premiumPlans.map((plan) => (
                <div key={plan.id} className={styles.premiumPlan}>
                  <div className={styles.planHeader}>
                    <h4>{plan.name}</h4>
                    {plan.savings && (
                      <span className={styles.savingsBadge}>{plan.savings}</span>
                    )}
                  </div>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>{plan.price}</span>
                    <span className={styles.period}>{plan.period}</span>
                  </div>
                  <p className={styles.planDescription}>{plan.description}</p>
                  <ul className={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <li key={index}>
                        <CheckCircle size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={styles.subscribeButton}
                    onClick={() => handlePremiumPurchase(plan.id)}
                  >
                    Subscribe Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In-Game Shop Items */}
        {getInGameItems().length > 0 && (
          <div className={styles.shopSection}>
            <h2>Shop Items</h2>
            <p>Purchase themes, sounds, filters, and more with your FB coins</p>

            <div className={styles.itemsGrid}>
              {getInGameItems().map((item: ShopItem) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemImage}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className={styles.productImage}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={styles.placeholderImage}>
                      <span className={styles.itemType}>{item.type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className={styles.itemContent}>
                    <div className={styles.itemHeader}>
                      <h3>{item.title}</h3>
                      {item.isPremiumOnly && (
                        <div className={styles.premiumBadge}>
                          <Star size={12} />
                          Premium
                        </div>
                      )}
                    </div>
                    <p>{item.description}</p>
                    <div className={styles.itemMeta}>
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>Type:</span>
                        <span className={styles.metaValue}>{item.type}</span>
                      </div>
                      {item.metadata && (
                        <div className={styles.metaRow}>
                          <span className={styles.metaLabel}>Details:</span>
                          <span className={styles.metaValue}>
                            {JSON.stringify(item.metadata)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles.itemFooter}>
                      <div className={styles.priceSection}>
                        <div className={styles.price}>
                          <Coins size={16} />
                          <span>{item.priceFbCoins}</span>
                        </div>
                        {item.price && (
                          <div className={styles.usdPrice}>
                            {item.price}
                          </div>
                        )}
                      </div>
                      <div className={styles.actions}>
                        {item.isPremiumOnly && premiumTier === 'free' ? (
                          <div className={styles.premiumRequired}>
                            Premium Required
                          </div>
                        ) : (
                          <button
                            className={styles.purchaseButton}
                            onClick={() => handleItemPurchase(item.id)}
                            disabled={purchaseLoading === item.id}
                          >
                            {purchaseLoading === item.id ? (
                              <div className={styles.loadingSpinner}></div>
                            ) : (
                              <>
                                <ShoppingCart size={16} />
                                Purchase
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Merchandise Section */}
        {getExternalItems().length > 0 && (
          <div className={styles.merchandiseSection}>
            <h2>Exclusive Merchandise</h2>
            <p>Show your love for Fart Bounty with our official merchandise</p>

            <div className={styles.itemsGrid}>
              {getExternalItems().map((item: ShopItem) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemImage}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={300}
                      height={200}
                      className={styles.productImage}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                    <div className={styles.placeholderImage}>
                      <span className={styles.itemType}>{item.type.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className={styles.itemContent}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className={styles.itemFooter}>
                      <span className={styles.price}>{item.price}</span>
                      <a
                        href={item.redbubbleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.buyButton}
                      >
                        View on Redbubble
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Modal */}
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="🎉 Purchase Successful!"
        >
          <div className={styles.successContent}>
            <div className={styles.successIcon}>
              <CheckCircle size={48} color="var(--accent-primary)" />
            </div>
            <h3>Item Added to Assets!</h3>
            <p>Your purchase has been completed successfully. Check your Assets page to see your new item.</p>
            <p className={styles.successNote}>
              <strong>Note:</strong> In a production environment, this would be connected to Stripe for real payment processing.
            </p>
          </div>
        </Modal>
      </div>
    </AuthGate>
  )
}

export default MediaLibraryPage
