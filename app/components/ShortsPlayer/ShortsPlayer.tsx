'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Clapperboard,
  Crown,
} from 'lucide-react'
import styles from './ShortsPlayer.module.css'

interface ShortPost {
  id: string
  user_id: string
  content: string
  media_url: string
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  user: {
    username: string
    display_name: string | null
    is_premium: boolean
    avatar_url: string | null
  }
  likes_count: number
  comments_count: number
  user_liked: boolean
}

interface ShortsPlayerProps {
  initialShorts?: ShortPost[]
}

export default function ShortsPlayer({ initialShorts }: ShortsPlayerProps) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [shorts, setShorts] = useState<ShortPost[]>(initialShorts || [])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(!initialShorts)
  const [isMuted, setIsMuted] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map())
  const fetchedRef = useRef(false)
  const scrollDebounce = useRef<NodeJS.Timeout | null>(null)
  const pageSize = 10

  // Fetch shorts
  const fetchShorts = useCallback(async (pageNum: number) => {
    if (!user) return
    if (pageNum === 0) setLoading(true)

    try {
      const from = pageNum * pageSize
      const to = from + pageSize - 1

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, user_id, content, media_url, thumbnail_url, duration_seconds, created_at,
          users!posts_user_id_fkey(username, display_name, is_premium, avatar_url)
        `)
        .eq('deleted', false)
        .eq('is_short', true)
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          const [likesRes, commentsRes, userLikeRes] = await Promise.all([
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('likes').select('*').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
          ])

          return {
            ...post,
            user: post.users,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            user_liked: !!userLikeRes.data
          } as ShortPost
        })
      )

      if (pageNum === 0) {
        setShorts(postsWithCounts)
      } else {
        setShorts(prev => [...prev, ...postsWithCounts])
      }

      setHasMore((data?.length || 0) >= pageSize)
      setPage(pageNum + 1)
    } catch (err) {
      console.error('Failed to fetch shorts:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (!fetchedRef.current && !initialShorts) {
      fetchedRef.current = true
      fetchShorts(0)
    }
  }, [fetchShorts, initialShorts])

  // Auto-play active video, pause others via IntersectionObserver
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            video.play().catch(() => {})
            const idx = Number(video.dataset.index)
            if (!isNaN(idx)) setActiveIndex(idx)
          } else {
            video.pause()
          }
        })
      },
      { root: container, threshold: 0.6 }
    )

    videoRefs.current.forEach((video) => observer.observe(video))
    return () => observer.disconnect()
  }, [shorts.length])

  // Prefetch more when near end
  useEffect(() => {
    if (activeIndex >= shorts.length - 3 && hasMore && shorts.length > 0) {
      fetchShorts(page)
    }
  }, [activeIndex, shorts.length, hasMore, page, fetchShorts])

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const container = scrollRef.current
      if (!container) return
      const itemH = container.clientHeight

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        container.scrollBy({ top: itemH, behavior: 'smooth' })
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        container.scrollBy({ top: -itemH, behavior: 'smooth' })
      }
      if (e.key === ' ') {
        e.preventDefault()
        const vid = videoRefs.current.get(activeIndex)
        if (vid) vid.paused ? vid.play().catch(() => {}) : vid.pause()
      }
      if (e.key === 'm') setIsMuted(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeIndex])

  // Debounced scroll handler for wheel events (prevents too-fast scrolling)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (scrollDebounce.current) return

    const container = scrollRef.current
    if (!container) return

    const dir = e.deltaY > 0 ? 1 : -1
    container.scrollBy({ top: dir * container.clientHeight, behavior: 'smooth' })

    scrollDebounce.current = setTimeout(() => {
      scrollDebounce.current = null
    }, 600)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const togglePlay = (idx: number) => {
    const vid = videoRefs.current.get(idx)
    if (!vid) return
    vid.paused ? vid.play().catch(() => {}) : vid.pause()
  }

  const handleLike = async (postId: string) => {
    if (!user) return
    const short = shorts.find(s => s.id === postId)
    if (!short) return

    try {
      if (short.user_liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
        setShorts(prev => prev.map(s =>
          s.id === postId ? { ...s, likes_count: s.likes_count - 1, user_liked: false } : s
        ))
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
        setShorts(prev => prev.map(s =>
          s.id === postId ? { ...s, likes_count: s.likes_count + 1, user_liked: true } : s
        ))
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Clapperboard size={32} />
          <span>Loading shorts...</span>
        </div>
      </div>
    )
  }

  if (shorts.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Clapperboard size={48} />
          <h3>No shorts yet</h3>
          <p>Be the first to post a short fart video!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={scrollRef}>
      {shorts.map((short, idx) => (
        <div key={short.id} className={styles.slide}>
          {/* Video */}
          <div className={styles.videoWrapper} onClick={() => togglePlay(idx)}>
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(idx, el)
                else videoRefs.current.delete(idx)
              }}
              data-index={idx}
              src={short.media_url}
              poster={short.thumbnail_url || undefined}
              loop
              muted={isMuted}
              playsInline
              preload={Math.abs(idx - activeIndex) <= 1 ? 'auto' : 'none'}
              className={styles.video}
            />

            {/* Pause overlay (only on active) */}
            {idx === activeIndex && videoRefs.current.get(idx)?.paused && (
              <div className={styles.playOverlay}>
                <Play size={56} />
              </div>
            )}
          </div>

          {/* Bottom info */}
          <div className={styles.infoOverlay}>
            <div className={styles.userRow}>
              {short.user.avatar_url ? (
                <img src={short.user.avatar_url} alt="" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {short.user.username[0]?.toUpperCase()}
                </div>
              )}
              <span className={styles.username}>
                @{short.user.username}
                {short.user.is_premium && <Crown size={14} className={styles.crown} />}
              </span>
            </div>
            {short.content && <p className={styles.caption}>{short.content}</p>}
          </div>

          {/* Side actions */}
          <div className={styles.sideActions}>
            <button
              className={`${styles.actionBtn} ${short.user_liked ? styles.liked : ''}`}
              onClick={(e) => { e.stopPropagation(); handleLike(short.id) }}
            >
              <Heart size={26} fill={short.user_liked ? '#ef4444' : 'none'} />
              <span>{fmt(short.likes_count)}</span>
            </button>
            <button className={styles.actionBtn}>
              <MessageCircle size={26} />
              <span>{fmt(short.comments_count)}</span>
            </button>
            <button className={styles.actionBtn}>
              <Share2 size={26} />
              <span>Share</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted) }}
            >
              {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
