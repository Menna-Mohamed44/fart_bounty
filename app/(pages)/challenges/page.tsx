'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Trophy, Flame, Target, Clock, ChevronRight, Zap, Gift, Star } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabaseClient'
import styles from './challenges.module.css'

interface ChallengeDef {
  id: string
  icon: string
  title: string
  description: string
  goal: number
  reward: number
  rewardType: 'xp' | 'gold'
  category: 'daily' | 'weekly' | 'lifetime'
  link: string
}

interface ChallengeState extends ChallengeDef {
  progress: number
  claimed: boolean
}

const DAILY_CHALLENGES: ChallengeDef[] = [
  { id: 'd1', icon: '🎵', title: 'Sound Architect', description: 'Generate 3 fart sounds today', goal: 3, reward: 50, rewardType: 'xp', category: 'daily', link: '/generator' },
  { id: 'd2', icon: '⚔️', title: 'Battle Ready', description: 'Vote in 2 sound battles', goal: 2, reward: 30, rewardType: 'xp', category: 'daily', link: '/battle' },
  { id: 'd3', icon: '💌', title: 'Spread the Gas', description: 'Send a fart greeting to a friend', goal: 1, reward: 25, rewardType: 'xp', category: 'daily', link: '/generator' },
  { id: 'd4', icon: '🎮', title: 'Game Time', description: 'Play a fart game', goal: 1, reward: 20, rewardType: 'xp', category: 'daily', link: '/games' },
]

const WEEKLY_CHALLENGES: ChallengeDef[] = [
  { id: 'w1', icon: '🔊', title: 'Sound Library', description: 'Save 5 sounds to your media library this week', goal: 5, reward: 150, rewardType: 'xp', category: 'weekly', link: '/generator' },
  { id: 'w2', icon: '📰', title: 'Fart Reporter', description: 'Publish a news article this week', goal: 1, reward: 100, rewardType: 'xp', category: 'weekly', link: '/news' },
  { id: 'w3', icon: '👥', title: 'Community Spirit', description: 'Post in 3 different groups this week', goal: 3, reward: 120, rewardType: 'xp', category: 'weekly', link: '/groups' },
  { id: 'w4', icon: '🏆', title: 'Battle Champion', description: 'Win a sound battle this week', goal: 1, reward: 200, rewardType: 'xp', category: 'weekly', link: '/battle' },
]

const LIFETIME_CHALLENGES: ChallengeDef[] = [
  { id: 'l1', icon: '🔊', title: 'Sound Collector', description: 'Save 50 sounds to your library', goal: 50, reward: 5, rewardType: 'gold', category: 'lifetime', link: '/media-library' },
  { id: 'l2', icon: '👑', title: 'Fart Royalty', description: 'Win 25 sound battles', goal: 25, reward: 10, rewardType: 'gold', category: 'lifetime', link: '/battle' },
  { id: 'l3', icon: '📰', title: 'Editor in Chief', description: 'Publish 10 news articles', goal: 10, reward: 5, rewardType: 'gold', category: 'lifetime', link: '/news' },
  { id: 'l4', icon: '💌', title: 'Greeting Master', description: 'Send 50 fart greetings', goal: 50, reward: 10, rewardType: 'gold', category: 'lifetime', link: '/generator' },
  { id: 'l5', icon: '🎮', title: 'Arcade Legend', description: 'Reach a combined score of 1,000 across all games', goal: 1000, reward: 15, rewardType: 'gold', category: 'lifetime', link: '/games' },
  { id: 'l6', icon: '🔥', title: 'Mix Master', description: 'Use the Splicer 20 times', goal: 20, reward: 5, rewardType: 'gold', category: 'lifetime', link: '/generator' },
]

const ALL_DEFS: ChallengeDef[] = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES, ...LIFETIME_CHALLENGES]

function getDailyKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getWeeklyKey(): string {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const start = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000
  const week = Math.ceil(((now.getTime() - start) / 86400000 + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function getPeriodKey(category: string): string | null {
  if (category === 'daily') return getDailyKey()
  if (category === 'weekly') return getWeeklyKey()
  return null
}

type TabId = 'daily' | 'weekly' | 'lifetime'

function ChallengesPage() {
  const { user } = useAuth()
  const { refreshBalance } = useCurrency()
  const [activeTab, setActiveTab] = useState<TabId>('daily')
  const [challenges, setChallenges] = useState<ChallengeState[]>([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const supabase = createClient()

  const loadProgress = useCallback(async () => {
    if (!user) return

    const states: ChallengeState[] = ALL_DEFS.map(d => ({ ...d, progress: 0, claimed: false }))

    try {
      const periodKeys = [getDailyKey(), getWeeklyKey()]

      const { data } = await supabase
        .from('challenge_progress')
        .select('challenge_id, progress, claimed, period_key')
        .eq('user_id', user.id)

      if (data) {
        for (const row of data) {
          const match = states.find(c => {
            if (c.id !== row.challenge_id) return false
            const expectedKey = getPeriodKey(c.category)
            if (expectedKey === null && row.period_key === null) return true
            return row.period_key === expectedKey
          })
          if (match) {
            match.progress = row.progress
            match.claimed = row.claimed
          }
        }
      }
    } catch {
      // table may not exist yet
    }

    setChallenges(states)
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const handleClaim = async (ch: ChallengeState) => {
    if (!user || ch.claimed || ch.progress < ch.goal) return
    setClaimingId(ch.id)

    try {
      if (ch.rewardType === 'gold') {
        const { data, error } = await (supabase as any).rpc('claim_challenge_reward', {
          p_user_id: user.id,
          p_challenge_id: ch.id,
          p_period_key: getPeriodKey(ch.category),
          p_goal: ch.goal,
          p_reward_amount: ch.reward,
          p_reward_type: 'gold',
        })

        if (error) {
          alert('Failed to claim reward. Please try again.')
          return
        }
        if (!data?.success) {
          alert(data?.error || 'Could not claim reward.')
          return
        }
        await refreshBalance()
        alert(`Claimed ${ch.reward} FB Gold!`)
      } else {
        await supabase
          .from('challenge_progress')
          .update({ claimed: true })
          .eq('user_id', user.id)
          .eq('challenge_id', ch.id)
      }

      setChallenges(prev => prev.map(c => c.id === ch.id ? { ...c, claimed: true } : c))
    } catch {
      alert('Failed to claim reward.')
    } finally {
      setClaimingId(null)
    }
  }

  const filtered = challenges.filter(c => c.category === activeTab)
  const completed = challenges.filter(c => c.progress >= c.goal).length
  const total = challenges.length

  const getDailyReset = () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setUTCHours(24, 0, 0, 0)
    const diff = tomorrow.getTime() - now.getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to view challenges">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <Target className={styles.headerIcon} />
              <div>
                <h1>Challenges</h1>
                <p>Complete challenges to earn XP and Gold</p>
              </div>
            </div>
            <div className={styles.headerStats}>
              <div className={styles.completedPill}>
                <Trophy size={16} />
                <span>{completed}/{total} completed</span>
              </div>
            </div>
          </div>

          <div className={styles.progressOverview}>
            <div className={styles.overviewBar}>
              <div
                className={styles.overviewFill}
                style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
              />
            </div>
            <span className={styles.overviewPct}>{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'daily' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <Flame size={16} />
            <span>Daily</span>
            <span className={styles.tabTimer}><Clock size={12} /> {getDailyReset()}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'weekly' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <Zap size={16} />
            <span>Weekly</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'lifetime' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('lifetime')}
          >
            <Trophy size={16} />
            <span>Lifetime</span>
          </button>
        </div>

        {/* Challenge Cards */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading challenges...</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(ch => {
              const done = ch.progress >= ch.goal
              const pct = Math.min(100, Math.round((ch.progress / ch.goal) * 100))
              return (
                <div key={ch.id} className={`${styles.card} ${done ? styles.cardDone : ''} ${ch.claimed ? styles.cardClaimed : ''}`}>
                  <div className={styles.cardLeft}>
                    <div className={styles.cardIcon}>{ch.icon}</div>
                    <div className={styles.cardInfo}>
                      <h3>{ch.title}</h3>
                      <p>{ch.description}</p>
                      <div className={styles.cardProgress}>
                        <div className={styles.bar}>
                          <div className={styles.barFill} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.barLabel}>{ch.progress}/{ch.goal}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <div className={`${styles.reward} ${ch.rewardType === 'gold' ? styles.rewardGold : styles.rewardXp}`}>
                      {ch.rewardType === 'gold' ? (
                        <span className={styles.goldIcon}>G</span>
                      ) : (
                        <Star size={14} />
                      )}
                      <span>{ch.reward} {ch.rewardType === 'gold' ? 'Gold' : 'XP'}</span>
                    </div>
                    {ch.claimed ? (
                      <span className={styles.claimedBadge}>
                        {ch.rewardType === 'gold' ? 'Claimed' : 'Done'}
                      </span>
                    ) : done ? (
                      ch.rewardType === 'gold' ? (
                        <button
                          className={styles.claimBtn}
                          onClick={() => handleClaim(ch)}
                          disabled={claimingId === ch.id}
                        >
                          <Gift size={14} />
                          {claimingId === ch.id ? 'Claiming...' : 'Claim Gold'}
                        </button>
                      ) : (
                        <button
                          className={styles.completeBtn}
                          onClick={() => handleClaim(ch)}
                          disabled={claimingId === ch.id}
                        >
                          <Trophy size={14} />
                          {claimingId === ch.id ? '...' : 'Complete'}
                        </button>
                      )
                    ) : (
                      <Link href={ch.link} className={styles.goBtn}>
                        Go <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default ChallengesPage
