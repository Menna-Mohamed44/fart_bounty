'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Award } from 'lucide-react'
import Image from 'next/image'
import styles from '../see-more.module.css'

function VideosPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
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
    fetchVideos()
  }, [selectedMonth, selectedYear])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const { data: confessionals, error } = await supabase
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

      if (error) throw error

      const confessionalsWithData = await Promise.all((confessionals || []).map(async (conf: any) => {
        const { count } = await supabase
          .from('confessional_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('confessional_id', conf.id)
        
        const reactions_count = count || 0
        const gold_earned = reactions_count * 2
        
        return {
          ...conf,
          user: conf.users,
          gold_earned
        }
      }))

      const sorted = confessionalsWithData.sort((a, b) => b.gold_earned - a.gold_earned)
      setVideos(sorted)
    } catch (err: any) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Videos...</p>
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
          <span className={styles.green}>VIDEOS</span>
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

      {videos.length === 0 ? (
        <p className={styles.noData}>No videos yet</p>
      ) : (
        <div className={styles.usersGrid}>
          {videos.map((video) => (
            <div
              key={video.id}
              className={styles.userFrame}
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
                    alt="Video"
                    width={250}
                    height={250}
                    className={styles.artImage}
                  />
                </div>
                <div className={styles.frameUsername}>
                  {video.user?.username || 'Unknown'}
                </div>
              </div>
              <div className={styles.userGold}>
                <Award size={14} />
                <span>{video.gold_earned || 0} Gold</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Videos() {
  return (
    <AuthGate>
      <VideosPage />
    </AuthGate>
  )
}
