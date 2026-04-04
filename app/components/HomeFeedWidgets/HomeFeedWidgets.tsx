'use client'

import type { MouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import { TrendingUp, Users, Hash, Loader2 } from 'lucide-react'
import styles from './HomeFeedWidgets.module.css'

interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_premium: boolean
}

interface TrendingTopic {
  hashtag: string
  count: number
  category: string
}

function getCategoryForHashtag(hashtag: string): string {
  const tag = hashtag.toLowerCase()
  if (tag.includes('game') || tag.includes('gaming')) return 'Gaming'
  if (tag.includes('music') || tag.includes('sound')) return 'Music'
  if (tag.includes('funny') || tag.includes('meme')) return 'Comedy'
  if (tag.includes('news')) return 'News'
  return 'Trending'
}

export default function HomeFeedWidgets() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
  const [mobileLayout, setMobileLayout] = useState(false)
  const [seeAllFollow, setSeeAllFollow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const apply = () => setMobileLayout(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const loadSuggestedUsers = async (excluded: Set<string>) => {
    try {
      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url, is_premium')
        .limit(24)
        .order('created_at', { ascending: false })

      if (user) query = query.neq('id', user.id)

      const { data, error } = await query
      if (error || !data) return

      const filtered = data.filter((u: SuggestedUser) => !excluded.has(u.id))
      setSuggestedUsers(filtered)
    } catch {
      /* ignore */
    }
  }

  const loadFollowingAndSuggestions = async () => {
    if (!user) {
      setFollowingIds(new Set())
      await loadSuggestedUsers(new Set())
      return
    }
    const { data } = await (supabase as any)
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id)

    const next = new Set<string>((data || []).map((f: any) => f.followee_id))
    setFollowingIds(next)
    await loadSuggestedUsers(next)
  }

  const loadTrendingTopics = async () => {
    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('content')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!posts) return
      const hashtagCounts: Record<string, number> = {}
      const hashtagRegex = /#[a-zA-Z0-9_]+/g
      posts.forEach((post: any) => {
        const tags = post.content?.match(hashtagRegex)
        tags?.forEach((tag: string) => {
          const n = tag.toLowerCase()
          hashtagCounts[n] = (hashtagCounts[n] || 0) + 1
        })
      })

      const trending = Object.entries(hashtagCounts)
        .map(([hashtag, count]) => ({
          hashtag,
          count,
          category: getCategoryForHashtag(hashtag),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setTrendingTopics(trending)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!mobileLayout) return
    loadFollowingAndSuggestions()
    loadTrendingTopics()
  }, [user?.id, mobileLayout])

  const handleFollow = async (userId: string, e?: MouseEvent) => {
    e?.stopPropagation()
    if (!user) {
      router.push('/')
      return
    }
    setFollowLoading((prev) => new Set(prev).add(userId))
    try {
      if (followingIds.has(userId)) {
        await (supabase as any)
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', userId)
      } else {
        await (supabase as any).from('follows').insert([
          { follower_id: user.id, followee_id: userId },
        ])
      }
      await loadFollowingAndSuggestions()
    } catch {
      /* ignore */
    } finally {
      setFollowLoading((prev) => {
        const n = new Set(prev)
        n.delete(userId)
        return n
      })
    }
  }

  const followSlice = seeAllFollow ? suggestedUsers.slice(0, 12) : suggestedUsers.slice(0, 6)

  if (!mobileLayout) {
    return null
  }

  return (
    <div className={styles.mobileWidgets}>
      <section className={styles.trendingBlock} aria-labelledby="trending-now-heading">
        <div className={styles.sectionTitleRow}>
          <TrendingUp size={20} className={styles.sectionTitleIcon} aria-hidden />
          <h2 id="trending-now-heading" className={styles.sectionTitle}>
            Trending Now
          </h2>
        </div>
        <div className={styles.trendScroll}>
          {trendingTopics.length > 0 ? (
            trendingTopics.map((topic) => (
              <button
                key={topic.hashtag}
                type="button"
                className={styles.trendRect}
                onClick={() =>
                  router.push(`/home?search=${encodeURIComponent(topic.hashtag)}`)
                }
              >
                <span className={styles.trendRectTag}>
                  <Hash size={12} />
                  {topic.hashtag}
                </span>
                <span className={styles.trendRectMeta}>
                  {topic.count} posts · {topic.category}
                </span>
              </button>
            ))
          ) : (
            <p className={styles.emptyHint}>No trends yet — post with hashtags!</p>
          )}
        </div>
      </section>

      <section className={styles.followBlock} aria-labelledby="who-follow-heading">
        <div className={styles.whoHeader}>
          <div className={styles.whoTitleGroup}>
            <Users size={20} className={styles.sectionTitleIcon} aria-hidden />
            <h2 id="who-follow-heading" className={styles.whoTitle}>
              Who to follow
            </h2>
          </div>
          {suggestedUsers.length > 6 ? (
            <button
              type="button"
              className={styles.seeAll}
              onClick={() => setSeeAllFollow((v) => !v)}
            >
              {seeAllFollow ? 'Show less' : 'See all'}
            </button>
          ) : null}
        </div>
        <div className={styles.followGrid}>
          {followSlice.length > 0 ? (
            followSlice.map((su) => (
              <div key={su.id} className={styles.suggestCard}>
                <button
                  type="button"
                  className={styles.suggestAvatarBtn}
                  onClick={() => router.push(`/${su.username}`)}
                  aria-label={`Open ${su.username}`}
                >
                  {su.avatar_url ? (
                    <img src={su.avatar_url} alt="" />
                  ) : (
                    <span>
                      {(su.display_name || su.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.suggestNameBtn}
                  onClick={() => router.push(`/${su.username}`)}
                >
                  @{su.username}
                </button>
                <button
                  type="button"
                  className={
                    followingIds.has(su.id)
                      ? styles.followBtnOutline
                      : styles.followBtnGreen
                  }
                  disabled={followLoading.has(su.id)}
                  onClick={(e) => handleFollow(su.id, e)}
                >
                  {followLoading.has(su.id) ? (
                    <Loader2 size={16} className={styles.btnSpinner} />
                  ) : followingIds.has(su.id) ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </button>
              </div>
            ))
          ) : (
            <p className={styles.emptyHint}>No suggestions right now</p>
          )}
        </div>
      </section>
    </div>
  )
}
