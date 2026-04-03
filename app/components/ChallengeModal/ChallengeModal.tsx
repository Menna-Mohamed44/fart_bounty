'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBattles } from '@/app/context/BattlesContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import { X, Swords, Clock, Coins, Trophy, AlertCircle } from 'lucide-react'
import type { BattleTheme } from '@/app/lib/supabaseClient'
import styles from './ChallengeModal.module.css'

interface ChallengeModalProps {
  isOpen: boolean
  onClose: () => void
  opponentId: string
  opponentName: string
}

export function ChallengeModal({ isOpen, onClose, opponentId, opponentName }: ChallengeModalProps) {
  const router = useRouter()
  const { createChallenge, getBattleThemes, loading } = useBattles()
  const { fbCoins } = useCurrency()
  const modalContentRef = useRef<HTMLDivElement>(null)
  
  const [themes, setThemes] = useState<BattleTheme[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string>('')
  const [wager, setWager] = useState<number>(10)
  const [submissionPeriod, setSubmissionPeriod] = useState<number>(24)
  const [votingPeriod, setVotingPeriod] = useState<number>(48)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadThemes()
      setError('') // Clear any previous errors
    }
  }, [isOpen])

  // Scroll to top when error appears
  useEffect(() => {
    if (error && modalContentRef.current) {
      modalContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }, [error])

  const loadThemes = async () => {
    const themesData = await getBattleThemes()
    setThemes(themesData)
    if (themesData.length > 0) {
      setSelectedTheme(themesData[0].theme)
    }
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!selectedTheme) {
      setError('Please select a theme')
      return
    }

    if (wager < 5) {
      setError('Minimum wager is 5 FB coins')
      return
    }

    if (wager > fbCoins) {
      setError(`You only have ${fbCoins} FB coins`)
      return
    }

    const result = await createChallenge(
      opponentId,
      selectedTheme,
      wager,
      submissionPeriod,
      votingPeriod
    )

    if (result.success) {
      onClose()
      router.push('/notifications')
    } else {
      setError(result.message || 'Failed to create challenge')
    }
  }

  if (!isOpen) return null

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'space': return '#3b82f6'
      case 'underwater': return '#06b6d4'
      case 'comedy': return '#fbbf24'
      case 'horror': return '#ef4444'
      case 'nature': return '#22c55e'
      case 'sci-fi': return '#a855f7'
      case 'fantasy': return '#f97316'
      default: return '#6b7280'
    }
  }

  const getDifficultyBadge = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return '⭐'
      case 'medium': return '⭐⭐'
      case 'hard': return '⭐⭐⭐'
      default: return ''
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} ref={modalContentRef} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Swords size={24} className={styles.headerIcon} />
            <h2>Challenge {opponentName}</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {error && (
            <div className={styles.error}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Theme Selection */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Trophy size={18} />
              Select Battle Theme
            </label>
            <div className={styles.themesGrid}>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  className={`${styles.themeCard} ${selectedTheme === theme.theme ? styles.selected : ''}`}
                  onClick={() => setSelectedTheme(theme.theme)}
                  style={{ '--category-color': getCategoryColor(theme.category) } as React.CSSProperties}
                >
                  <span className={styles.themeCategory}>{theme.category}</span>
                  <span className={styles.themeName}>{theme.theme}</span>
                  <span className={styles.themeDifficulty}>{getDifficultyBadge(theme.difficulty)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wager Amount */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Coins size={18} />
              Wager Amount (you have {fbCoins} coins)
            </label>
            <div className={styles.inputGroup}>
              <input
                type="number"
                className={styles.input}
                value={wager}
                onChange={(e) => setWager(Number(e.target.value))}
                min="5"
                max={fbCoins}
                step="5"
              />
              <span className={styles.inputSuffix}>FB Coins</span>
            </div>
            <p className={styles.hint}>Winner takes all: {wager * 2} coins total pot</p>
          </div>

          {/* Submission Period */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Clock size={18} />
              Sound Creation Period
            </label>
            <div className={styles.optionsRow}>
              {[12, 24, 36, 48].map((hours) => (
                <button
                  key={hours}
                  className={`${styles.optionButton} ${submissionPeriod === hours ? styles.selected : ''}`}
                  onClick={() => setSubmissionPeriod(hours)}
                >
                  {hours}h
                </button>
              ))}
            </div>
            <p className={styles.hint}>Time to create and submit sounds</p>
          </div>

          {/* Voting Period */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Trophy size={18} />
              Community Voting Period
            </label>
            <div className={styles.optionsRow}>
              {[24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  className={`${styles.optionButton} ${votingPeriod === hours ? styles.selected : ''}`}
                  onClick={() => setVotingPeriod(hours)}
                >
                  {hours}h
                </button>
              ))}
            </div>
            <p className={styles.hint}>Time for community to vote</p>
          </div>

          {/* Summary */}
          <div className={styles.summary}>
            <h3>Challenge Summary</h3>
            <div className={styles.summaryItem}>
              <span>Theme:</span>
              <strong>{selectedTheme || 'Not selected'}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Wager:</span>
              <strong>{wager} coins each ({wager * 2} total)</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Creation time:</span>
              <strong>{submissionPeriod} hours</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Voting time:</span>
              <strong>{votingPeriod} hours</strong>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={styles.challengeButton}
              onClick={handleSubmit}
              disabled={loading || !selectedTheme}
            >
              <Swords size={20} />
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
