'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Award, ChevronRight, AlertCircle, ChevronLeft, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import styles from './hall-of-fame.module.css'

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  fb_gold: number
  is_premium: boolean
}

interface MediaItem {
  id: string
  type: 'post' | 'video'
  user_id: string
  username: string
  content: string
  gold_earned: number
  created_at: string
}

function HallOfFamePage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [topSounds, setTopSounds] = useState<any[]>([])
  const [topConfessionals, setTopConfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showCandidatesMore, setShowCandidatesMore] = useState(false)
  const [showLegendsMore, setShowLegendsMore] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchLeaderboard()
    fetchTopContent()
  }, [selectedMonth, selectedYear])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_hall_of_fame', { p_limit: 100 })

      if (error) throw error

      setLeaderboard(data || [])
    } catch (err: any) {
      console.error('Failed to fetch Hall of Fame:', err)
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopContent = async () => {
    try {
      // Fetch top sounds (audios)
      const { data: sounds, error: soundsError } = await supabase
        .from('sounds')
        .select(`
          id,
          storage_path,
          duration_seconds,
          created_at,
          user_id,
          users!sounds_user_id_fkey(username, display_name, avatar_url, is_premium)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (soundsError) {
        console.error('Sounds error:', soundsError)
        throw soundsError
      }

      // Calculate gold for each sound based on duration
      const soundsWithData = (sounds || []).map((sound: any) => {
        // Calculate gold: duration_seconds as a simple metric
        const gold_earned = Math.floor(sound.duration_seconds * 10)
        return {
          ...sound,
          user: sound.users,
          gold_earned
        }
      })

      // Sort by gold_earned and take top 10
      const sortedSounds = soundsWithData.sort((a, b) => b.gold_earned - a.gold_earned).slice(0, 10)
      setTopSounds(sortedSounds)

      // Fetch top confessionals
      const { data: confessionals, error: confessionalsError } = await supabase
        .from('confessionals')
        .select(`
          id,
          video_path,
          thumbnail_path,
          created_at,
          user_id,
          users!confessionals_user_id_fkey(username, display_name, avatar_url, is_premium)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (confessionalsError) {
        console.error('Confessionals error:', confessionalsError.message || confessionalsError)
        throw confessionalsError
      }

      // Fetch reactions separately for each confessional
      const confessionalsWithData = await Promise.all((confessionals || []).map(async (conf: any) => {
        const { count } = await supabase
          .from('confessional_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('confessional_id', conf.id)
        
        const reactions_count = count || 0
        // Calculate gold: reactions × 2
        const gold_earned = (conf as any).gold_earned || (reactions_count * 2)
        
        return {
          ...conf,
          user: conf.users,
          likes_count: reactions_count,
          gold_earned
        }
      }))

      // Sort by gold_earned and take top 10
      const sortedConfessionals = confessionalsWithData.sort((a, b) => b.gold_earned - a.gold_earned).slice(0, 10)
      setTopConfessionals(sortedConfessionals)
    } catch (err: any) {
      console.error('Failed to fetch top content:', err.message || err)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentMonthYear = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`
  const topThree = leaderboard.slice(0, 3)
  const candidates = leaderboard.slice(3, showCandidatesMore ? 15 : 7)
  const legends = leaderboard.slice(15, showLegendsMore ? 30 : 22)

  const getPodiumLabel = (rank: number) => {
    switch (rank) {
      case 1:
        return 'IMMORTAL GOLD'
      case 2:
        return 'SILVER LEGEND'
      case 3:
        return 'BRONZE ICON'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Hall of Fame...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.topSection}>
        {/* Large Logo on the left */}
        <div className={styles.logoSection}>
          <Image
            src="/transparent_hall.png"
            alt="Hall of Fame"
            width={280}
            height={280}
            className={styles.logo}
          />
        </div>

        {/* Right Side: Month Selector at top, Podiums below */}
        <div className={styles.rightSection}>
          {/* Month Selector at top right */}
          <div className={styles.monthSelector}>
            <button
              className={styles.monthButton}
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              <span>{months[selectedMonth]} {selectedYear}</span>
              <ChevronDown size={16} />
            </button>
            {showMonthPicker && (
              <div className={styles.monthDropdown}>
                <div className={styles.yearControls}>
                  <button onClick={() => setSelectedYear(selectedYear - 1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span>{selectedYear}</span>
                  <button onClick={() => setSelectedYear(selectedYear + 1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className={styles.monthGrid}>
                  {months.map((month, index) => (
                    <button
                      key={month}
                      className={selectedMonth === index ? styles.active : ''}
                      onClick={() => {
                        setSelectedMonth(index)
                        setShowMonthPicker(false)
                      }}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Podiums below month selector */}
          <div className={styles.podiumSection}>
            <div className={styles.podiumContainer}>
              <Image
                src="/Podiums_transparent .png"
                alt="Podiums"
                width={450}
                height={300}
                className={styles.podiumImage}
              />
              
              {/* Top 3 Users on Podiums - Only username in green */}
              <div className={styles.podiumUsers}>
                {topThree.map((user, index) => {
                  const positions = [
                    { left: '50%', top: '5%' },   // 1st place - center
                    { left: '20%', top: '13%' },  // 2nd place - left (raised)
                    { left: '80%', top: '10%' }   // 3rd place - right (raised)
                  ]
                  return (
                    <div
                      key={user.user_id}
                      className={styles.podiumUser}
                      style={positions[index]}
                      onClick={() => router.push(`/fart-legends?userId=${user.user_id}`)}
                    >
                      <div className={styles.podiumUsername}>
                        {user.username}
                      </div>
                      <div className={styles.podiumAvatar}>
                        <Image
                          src={user.avatar_url || '/profile.jpg'}
                          alt={user.username}
                          width={80}
                          height={80}
                          className={styles.avatarImg}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates and Legends Row */}
      <div className={styles.mainRow}>
        {/* Candidates Card */}
        <div className={styles.cardBordered}>
          <div className={styles.cardHeader}>
            <h3>
              <span className={styles.white}>HALL OF FAME</span>
              {' '}
              <span className={styles.blue}>CANDIDATES</span>
            </h3>
            <button
              className={styles.moreButton}
              onClick={() => router.push('/hall-of-fame/candidates')}
            >
              See More <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.userGrid}>
            {candidates.map((user) => (
              <div 
                key={user.user_id} 
                className={styles.userCard}
                onClick={() => router.push(`/fart-legends?userId=${user.user_id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.userCardAvatar}>
                  <Image
                    src={user.avatar_url || '/profile.jpg'}
                    alt={user.username}
                    width={40}
                    height={40}
                  />
                </div>
                <div className={styles.userCardInfo}>
                  <div className={styles.userCardName}>{user.username}</div>
                  <div className={styles.userCardGold}>
                    <Award size={12} />
                    <span>{user.fb_gold.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legends Card */}
        <div className={styles.cardBordered}>
          <div className={styles.cardHeader}>
            <h3>
              <span className={styles.white}>HALL OF FAME</span>
              {' '}
              <span className={styles.pink}>LEGENDS</span>
            </h3>
            <button
              className={styles.moreButton}
              onClick={() => router.push('/hall-of-fame/legends')}
            >
              See More <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.userGrid}>
            {legends.map((user) => (
              <div 
                key={user.user_id} 
                className={styles.userCard}
                onClick={() => router.push(`/fart-legends?userId=${user.user_id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.userCardAvatar}>
                  <Image
                    src={user.avatar_url || '/profile.jpg'}
                    alt={user.username}
                    width={40}
                    height={40}
                  />
                </div>
                <div className={styles.userCardInfo}>
                  <div className={styles.userCardName}>{user.username}</div>
                  <div className={styles.userCardGold}>
                    <Award size={12} />
                    <span>{user.fb_gold.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <AlertCircle size={20} />
        <span>Fart Hall of Fame is updated monthly, collect gold to make your way to immortality!</span>
      </div>

      {/* Media Section Title */}
      <div className={styles.mediaSectionTitle}>
        <span className={styles.white}>HALL OF FAME MEDIA</span>
        {' '}
        <span className={styles.green}>{currentMonthYear}</span>
      </div>

      {/* Media Cards Row */}
      <div className={styles.mediaRow}>
        {/* Videos Card */}
        <div className={styles.cardBordered}>
          <div className={styles.cardHeader}>
            <h3 className={styles.white}>VIDEOS</h3>
            <button 
              className={styles.moreButton}
              onClick={() => router.push('/hall-of-fame/videos')}
            >
              See More <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.mediaGrid3}>
            {topConfessionals.length === 0 ? (
              <p className={styles.noData}>No videos available</p>
            ) : (
              topConfessionals.slice(0, 3).map((conf, index) => (
                <div key={conf.id} className={styles.mediaGridItem}>
                  <div className={styles.mediaRank}>#{index + 1}</div>
                  <div className={styles.mediaContent}>
                    <p className={styles.mediaText}>{conf.caption ? conf.caption.substring(0, 40) : 'Video confessional'}{conf.caption && conf.caption.length > 40 ? '...' : ''}</p>
                    <div className={styles.mediaAuthor}>by @{conf.user.username}</div>
                    <div className={styles.mediaStats}>
                      <div className={styles.mediaGold}>
                        <Award size={14} />
                        <span>{conf.gold_earned || 0} Gold</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audios Card */}
        <div className={styles.cardBordered}>
          <div className={styles.cardHeader}>
            <h3 className={styles.white}>AUDIOS</h3>
            <button 
              className={styles.moreButton}
              onClick={() => router.push('/hall-of-fame/audios')}
            >
              See More <ChevronRight size={16} />
            </button>
          </div>
          <div className={styles.mediaGrid3}>
            {topSounds.length === 0 ? (
              <p className={styles.noData}>No audios available</p>
            ) : (
              topSounds.slice(0, 3).map((sound, index) => (
                <div key={sound.id} className={styles.mediaGridItem}>
                  <div className={styles.mediaRank}>#{index + 1}</div>
                  <div className={styles.mediaContent}>
                    <p className={styles.mediaText}>Audio ({sound.duration_seconds}s)</p>
                    <div className={styles.mediaAuthor}>by @{sound.user?.username || 'Unknown'}</div>
                    <div className={styles.mediaStats}>
                      <div className={styles.mediaGold}>
                        <Award size={14} />
                        <span>{sound.gold_earned || 0} Gold</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HallOfFame() {
  return (
    <AuthGate>
      <HallOfFamePage />
    </AuthGate>
  )
}
