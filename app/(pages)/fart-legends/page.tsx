'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import type { Database } from '@/types/database'
import styles from './fart-legends.module.css'

type UserProfile = Database['public']['Tables']['users']['Row']
type Post = Database['public']['Tables']['posts']['Row']
type Sound = Database['public']['Tables']['sounds']['Row']

function FartLegendsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<'bio' | 'media' | 'merch'>('bio')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [sounds, setSounds] = useState<Sound[]>([])
  const [loading, setLoading] = useState(true)
  const [hallBadge, setHallBadge] = useState<string | null>(null)

  // Extract userId from URL or use current user's id
  const targetUserId = searchParams.get('userId') || user?.id

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) {
        setLoading(false)
        return
      }

      // Clear previous data
      setProfile(null)
      setPosts([])
      setSounds([])
      setLoading(true)

      const supabase = createClient()

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (userData) setProfile(userData)

      // Resolve hall-of-fame segment for this user so this page works consistently
      // for users opened from candidates, legends, or top 3 podium entries.
      const { data: hallData } = await supabase.rpc('get_hall_of_fame', { p_limit: 100 })
      const rankedUser = (hallData || []).find((entry: any) => entry.user_id === targetUserId)
      if (rankedUser?.rank && rankedUser.rank <= 3) setHallBadge('Podium')
      else if (rankedUser?.rank && rankedUser.rank <= 15) setHallBadge('Candidate')
      else if (rankedUser?.rank) setHallBadge('Legend')
      else setHallBadge(null)

      // Fetch user posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (postsData) setPosts(postsData)

      // Fetch user sounds
      const { data: soundsData } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (soundsData) setSounds(soundsData)

      setLoading(false)
    }

    fetchProfileData()
  }, [targetUserId])

  const handleNavigate = (section: 'bio' | 'media' | 'merch') => {
    setActiveSection(section)
  }

  return (
    <div className={styles.container}>
      {/* Return to Hall of Fame Button */}
      <button 
        className={styles.returnButton}
        onClick={() => router.push('/hall-of-fame')}
      >
        <ArrowLeft size={20} />
        <span>Return to Hall of Fame</span>
      </button>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Pillar and Header */}
        <div className={styles.pillarSection}>
          <Image
            src="/pillar and header.png"
            alt="Pillar and Header"
            width={800}
            height={600}
            className={styles.pillarImage}
            priority
          />
          
          {/* Profile Frame inside pillars */}
          <div className={styles.profileFrameContainer}>
            <Image
              src="/profile frame.png"
              alt="Profile Frame"
              width={400}
              height={400}
              className={styles.profileFrame}
            />
            
            {/* User Avatar */}
            {profile?.avatar_url && (
              <div className={styles.userAvatar}>
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={200}
                  height={200}
                  className={styles.avatarImage}
                />
              </div>
            )}
            
            {/* User Info */}
            {profile && (
              <div className={styles.userInfo}>
                <h2 className={styles.username}>{profile.display_name || profile.username}</h2>
                {profile.location && (
                  <p className={styles.location}>{profile.location}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className={styles.bottomButtons}>
          <button
            type="button"
            className={`${styles.navButton} ${styles.bioButton} ${activeSection === 'bio' ? styles.navButtonActive : ''}`}
            onClick={() => handleNavigate('bio')}
          >
            <span className={styles.buttonText}>Bio</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${styles.mediaButton} ${activeSection === 'media' ? styles.navButtonActive : ''}`}
            onClick={() => handleNavigate('media')}
          >
            <span className={styles.buttonText}>Media</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${styles.merchButton} ${activeSection === 'merch' ? styles.navButtonActive : ''}`}
            onClick={() => handleNavigate('merch')}
          >
            <span className={styles.buttonText}>Merch</span>
          </button>
        </div>

        {/* Content Sections */}
        <div className={styles.contentSection}>
          {activeSection === 'bio' && (
            <div className={styles.bioSection}>
              <h3 className={styles.sectionTitle}>Biography</h3>
              {loading ? (
                <p className={styles.loadingText}>Loading...</p>
              ) : (
                <>
                  {profile?.bio ? (
                    <p className={styles.bioText}>{profile.bio}</p>
                  ) : (
                    <p className={styles.emptyText}>No bio available</p>
                  )}
                  {profile?.is_premium && (
                    <div className={styles.premiumBadge}>Premium Member</div>
                  )}
                  <div className={styles.joinDate}>
                    Joined: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'media' && (
            <div className={styles.mediaSection}>
              <h3 className={styles.sectionTitle}>Media</h3>
              {loading ? (
                <p className={styles.loadingText}>Loading...</p>
              ) : (
                <>
                  <div className={styles.mediaCategory}>
                    <h4 className={styles.categoryTitle}>Posts ({posts.length})</h4>
                    {posts.length > 0 ? (
                      <div className={styles.postsList}>
                        {posts.map((post) => (
                          <div key={post.id} className={styles.postItem}>
                            <p className={styles.postContent}>{post.content}</p>
                            <span className={styles.postDate}>
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.emptyText}>No posts yet</p>
                    )}
                  </div>

                  <div className={styles.mediaCategory}>
                    <h4 className={styles.categoryTitle}>Sounds ({sounds.length})</h4>
                    {sounds.length > 0 ? (
                      <div className={styles.soundsList}>
                        {sounds.map((sound) => (
                          <div key={sound.id} className={styles.soundItem}>
                            <span className={styles.soundDuration}>
                              {sound.duration_seconds}s
                            </span>
                            <span className={styles.soundDate}>
                              {new Date(sound.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.emptyText}>No sounds yet</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'merch' && (
            <div className={styles.merchSection}>
              <h3 className={styles.sectionTitle}>Merchandise</h3>
              <p className={styles.emptyText}>Merch store coming soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function FartLegends() {
  return (
    <AuthGate>
      <Suspense fallback={<div>Loading...</div>}>
        <FartLegendsPage />
      </Suspense>
    </AuthGate>
  )
}
