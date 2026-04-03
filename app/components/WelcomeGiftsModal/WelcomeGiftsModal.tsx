'use client'

import { useState } from 'react'
import { 
  Zap, 
  Shield, 
  Image, 
  Tag, 
  Star, 
  UserCheck, 
  Mail, 
  Crown,
  PartyPopper
} from 'lucide-react'
import styles from './WelcomeGiftsModal.module.css'

interface WelcomeGiftsModalProps {
  onAccept: () => void
}

export default function WelcomeGiftsModal({ onAccept }: WelcomeGiftsModalProps) {
  const [playSoundOnAccept, setPlaySoundOnAccept] = useState(true)

  const gifts = [
    { icon: <Zap size={20} />, label: 'INSTANT GAS', value: '10' },
    { icon: <Shield size={20} />, label: 'BOUNTY BACKS', value: '' },
    { icon: <Image size={20} />, label: '15 INTRO PICS', value: '(WELCOME HOME)' },
    { icon: <Image size={20} />, label: 'SNEAK ATTACK', value: '' },
    { icon: <Image size={20} />, label: 'BUFFET BLUES', value: '' },
    { icon: <Tag size={20} />, label: 'DROPSHIP', value: 'DISCOUNT CODE' }
  ]

  const handleAccept = () => {
    if (playSoundOnAccept) {
      // Play fart sound logic here
      console.log('Playing fart sound!')
    }
    onAccept()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.decorations} aria-hidden="true">
          <img
            src="/emoji transparent.png"
            alt=""
            className={styles.decorationLeft}
            draggable={false}
          />
          <img
            src="/gift box 2.png"
            alt=""
            className={styles.decorationRight}
            draggable={false}
          />
        </div>

        <div className={styles.header}>
          <h2 className={styles.title}>Enjoy Your Fart Bounty</h2>
          <p className={styles.subtitle}>Welcome Gifts!</p>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.soundOption}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={playSoundOnAccept}
                onChange={(e) => setPlaySoundOnAccept(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Play fart sound when accepting</span>
            </label>
          </div>

          <div className={styles.giftsContainer}>
            {/* Row 1 - 3 gifts */}
            <div className={styles.giftsRow}>
              {gifts.slice(0, 3).map((gift, index) => (
                <div key={index} className={styles.giftCard}>
                  <div className={styles.giftIcon}>{gift.icon}</div>
                  <div className={styles.giftLabel}>
                    {gift.label}
                    {gift.value && <span className={styles.giftValue}>{gift.value}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Row 2 - 3 gifts */}
            <div className={styles.giftsRow}>
              {gifts.slice(3, 6).map((gift, index) => (
                <div key={index + 3} className={styles.giftCard}>
                  <div className={styles.giftIcon}>{gift.icon}</div>
                  <div className={styles.giftLabel}>
                    {gift.label}
                    {gift.value && <span className={styles.giftValue}>{gift.value}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Row 4 - Premium (full width) */}
            <div className={styles.premiumRow}>
              <div className={styles.premiumCard}>
                <Crown className={styles.premiumIcon} size={28} />
                <div className={styles.premiumLabel}>
                  PREMIUM FOR ONE MONTH
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className={styles.acceptButton} onClick={handleAccept}>
          Accept All
        </button>
      </div>
    </div>
  )
}
