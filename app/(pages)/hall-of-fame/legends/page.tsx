'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Award } from 'lucide-react'
import Image from 'next/image'
import styles from '../see-more.module.css'

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  fb_gold: number
  is_premium: boolean
}

function LegendsPage() {
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const supabase = createClient()

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedMonth, selectedYear])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_hall_of_fame', { p_limit: 100 })
      if (error) throw error
      setLeaderboard(data || [])
    } catch (err: any) {
      console.error('Failed to fetch legends:', err)
    } finally {
      setLoading(false)
    }
  }

  const legends = leaderboard.slice(15)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Legends...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.push('/hall-of-fame')}>
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.white}>HALL OF FAME </span>
          <span className={styles.pink}>LEGENDS</span>
        </h1>

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
      </div>

      {legends.length === 0 ? (
        <p className={styles.noData}>No legends yet</p>
      ) : (
        <div className={styles.usersGrid}>
          {legends.map((user) => (
            <div
              key={user.user_id}
              className={styles.userFrame}
              onClick={() => router.push(`/fart-legends?userId=${user.user_id}`)}
            >
              <div className={styles.frameImageWrapper}>
                <Image
                  src="/frame.png"
                  alt="Frame"
                  width={300}
                  height={300}
                  className={styles.frameImage}
                />
                <div className={styles.artInFrame}>
                  <Image
                    src="/art.png"
                    alt="Art"
                    width={250}
                    height={250}
                    className={styles.artImage}
                  />
                </div>
                <div className={styles.frameUsername}>
                  {user.username}
                </div>
              </div>
              <div className={styles.userGold}>
                <Award size={14} />
                <span>{user.fb_gold.toLocaleString()} Gold</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Legends() {
  return (
    <AuthGate>
      <LegendsPage />
    </AuthGate>
  )
}
