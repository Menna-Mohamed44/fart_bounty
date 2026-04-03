'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import { createClient } from '@/app/lib/supabaseClient'
import { Search, TrendingUp, Users, UserPlus, Hash, ExternalLink, X, Loader2, ChevronDown } from 'lucide-react'
import styles from './RightSidebar.module.css'

interface SearchResult {
  type: 'user' | 'post'
  id: string
  title: string
  subtitle: string
  avatar_url?: string | null
  username?: string
}

interface SuggestedUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  is_premium: boolean
  followers_count?: number
}

interface TrendingTopic {
  hashtag: string
  count: number
  category: string
}

interface Ad {
  id: string
  title: string
  description: string
  image_url?: string
  link_url: string
  sponsor: string
}

export default function RightSidebar() {
  const router = useRouter()
  const { user } = useAuth()
  const { hasNoAds } = usePremium()
  const supabase = createClient()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([])
  const [showAllTrends, setShowAllTrends] = useState(false)
  const [currentAd, setCurrentAd] = useState<Ad | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['follow', 'trending', 'ads']))

  // Load initial data
  useEffect(() => {
    loadSuggestedUsers()
    loadTrendingTopics()
    loadCurrentAd()
    if (user) {
      loadFollowingStatus()
    }
  }, [user])

  // Listen for follow state changes from profile pages
  useEffect(() => {
    const handleFollowStateChange = (event: CustomEvent) => {
      const { userId, isFollowing } = event.detail
      if (isFollowing) {
        // User was followed, add to following list and refresh suggestions
        setFollowingIds(prev => {
          const next = new Set<string>(prev)
          next.add(userId)
          return next
        })
        setSuggestedUsers(prev => prev.filter(u => u.id !== userId))
        setShowAllSuggestions(false)
      } else {
        // User was unfollowed, remove from following list and refresh suggestions
        setFollowingIds(prev => {
          const next = new Set<string>(prev)
          next.delete(userId)
          return next
        })
      }
      // Reload suggestions to reflect the change
      if (user) {
        loadFollowingStatus()
      }
    }

    window.addEventListener('followStateChanged', handleFollowStateChange as EventListener)
    return () => {
      window.removeEventListener('followStateChanged', handleFollowStateChange as EventListener)
    }
  }, [user])

  // Search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length > 0) {
      setSearchLoading(true)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    try {
      const results: SearchResult[] = []

      // Search users
      const { data: users } = await (supabase as any)
        .from('users')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(5)

      if (users) {
        users.forEach((u: any) => {
          results.push({
            type: 'user',
            id: u.id,
            title: u.display_name || u.username,
            subtitle: `@${u.username}`,
            avatar_url: u.avatar_url,
            username: u.username
          })
        })
      }

      // Search posts (by content)
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          user:users!posts_user_id_fkey(username, display_name, avatar_url)
        `)
        .ilike('content', `%${query}%`)
        .eq('deleted', false)
        .limit(5)

      if (posts) {
        posts.forEach((p: any) => {
          const preview = p.content.length > 50 ? p.content.substring(0, 50) + '...' : p.content
          results.push({
            type: 'post',
            id: p.id,
            title: preview,
            subtitle: `by @${p.user?.username || 'unknown'}`,
            avatar_url: p.user?.avatar_url
          })
        })
      }

      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const loadSuggestedUsers = async (overrideFollowing?: Set<string>) => {
    try {
      const excludedIds = overrideFollowing ?? followingIds
      // Get users that current user is NOT following, ordered by followers
      let query = supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          is_premium
        `)
        .limit(5)
        .order('created_at', { ascending: false })

      // Exclude current user
      if (user) {
        query = query.neq('id', user.id)
      }

      const { data, error } = await query

      if (!error && data) {
        // Filter out users we're already following
        const usersWithFollowers = await Promise.all(
          data.map(async (u: any) => {
            const { count } = await (supabase as any)
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('followee_id', u.id)
            
            return { ...u, followers_count: count || 0 }
          })
        )

        const filteredUsers = usersWithFollowers.filter((user: SuggestedUser) => !excludedIds.has(user.id))

        setSuggestedUsers(filteredUsers.slice(0, 5))
        setShowAllSuggestions(false)
      }
    } catch (error) {
      console.error('Error loading suggested users:', error)
    }
  }

  const loadFollowingStatus = async () => {
    if (!user) return

    try {
      const { data } = await (supabase as any)
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)

      if (data) {
        const nextFollowing = new Set<string>(data.map((f: any) => f.followee_id))
        setFollowingIds(nextFollowing)
        await loadSuggestedUsers(nextFollowing)
      }
    } catch (error) {
      console.error('Error loading following status:', error)
    }
  }

  const loadTrendingTopics = async () => {
    try {
      // Get recent posts and extract hashtags
      const { data: posts } = await supabase
        .from('posts')
        .select('content')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(200)

      if (posts) {
        const hashtagCounts: { [key: string]: number } = {}
        const hashtagRegex = /#[a-zA-Z0-9_]+/g

        posts.forEach((post: any) => {
          const hashtags = post.content.match(hashtagRegex)
          if (hashtags) {
            hashtags.forEach((tag: string) => {
              const normalized = tag.toLowerCase()
              hashtagCounts[normalized] = (hashtagCounts[normalized] || 0) + 1
            })
          }
        })

        // Convert to array and sort by count
        const trending = Object.entries(hashtagCounts)
          .map(([hashtag, count]) => ({
            hashtag,
            count,
            category: getCategoryForHashtag(hashtag)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setTrendingTopics(trending)
        setShowAllTrends(false)
      }
    } catch (error) {
      console.error('Error loading trending topics:', error)
    }
  }

  const getCategoryForHashtag = (hashtag: string): string => {
    const tag = hashtag.toLowerCase()
    if (tag.includes('game') || tag.includes('gaming')) return 'Gaming'
    if (tag.includes('music') || tag.includes('sound')) return 'Music'
    if (tag.includes('funny') || tag.includes('meme')) return 'Comedy'
    if (tag.includes('news')) return 'News'
    return 'Trending'
  }

  const loadCurrentAd = async () => {
    // You can store ads in a database table or use a static list
    const ads: Ad[] = [
      {
        id: '1',
        title: '🎵 Premium Sounds Pack',
        description: 'Unlock 500+ professional sound effects!',
        link_url: '/marketplace',
        sponsor: 'Fart Bounty Shop'
      },
      {
        id: '2',
        title: '⚔️ Join Battles',
        description: 'Challenge users and win FB coins!',
        link_url: '/battles',
        sponsor: 'Fart Bounty'
      },
      {
        id: '3',
        title: '👑 Go Premium',
        description: 'Get exclusive themes and badges',
        link_url: '/marketplace',
        sponsor: 'Fart Bounty Premium'
      }
    ]

    // Rotate ads randomly
    const randomAd = ads[Math.floor(Math.random() * ads.length)]
    setCurrentAd(randomAd)
  }

  const handleFollow = async (userId: string) => {
    if (!user) {
      router.push('/')
      return
    }

    setFollowLoading(prev => new Set(prev).add(userId))

    try {
      const isFollowing = followingIds.has(userId)

      if (isFollowing) {
        // Unfollow
        await (supabase as any)
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', userId)

        setFollowingIds(prev => {
          const next = new Set<string>(prev)
          next.delete(userId)
          return next
        })
        const refreshedFollowing = new Set<string>(followingIds)
        refreshedFollowing.delete(userId)
        await loadSuggestedUsers(refreshedFollowing)
      } else {
        // Follow
        await (supabase as any)
          .from('follows')
          .insert([{
            follower_id: user.id,
            followee_id: userId
          }])

        const updatedFollowing = new Set<string>(followingIds)
        updatedFollowing.add(userId)
        setFollowingIds(updatedFollowing)
        setSuggestedUsers(prev => prev.filter(user => user.id !== userId))
        setShowAllSuggestions(false)
        await loadSuggestedUsers(updatedFollowing)
      }

      // Refresh suggestions
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setFollowLoading(prev => {
        const next = new Set<string>(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'user') {
      router.push(`/${result.username}`)
    } else {
      router.push('/home') // Or navigate to specific post
    }
    setSearchQuery('')
    setShowSearchResults(false)
  }

  const handleTrendingClick = (hashtag: string) => {
    router.push(`/home?search=${encodeURIComponent(hashtag)}`)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  return (
    <aside className={styles.rightSidebar}>
      {/* Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchInput}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search users and posts..."
            className={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          {searchQuery && (
            <button
              className={styles.clearSearch}
              onClick={() => {
                setSearchQuery('')
                setShowSearchResults(false)
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className={styles.searchResults}>
            {searchLoading ? (
              <div className={styles.searchLoading}>
                <Loader2 size={20} className={styles.spinner} />
                <span>Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className={styles.searchResultItem}
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className={styles.resultAvatar}>
                      {result.avatar_url ? (
                        <img src={result.avatar_url} alt="" />
                      ) : (
                        <span>{result.title[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultTitle}>{result.title}</p>
                      <p className={styles.resultSubtitle}>
                        {result.type === 'user' ? '👤 ' : '📝 '}
                        {result.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.noResults}>
                <p>No results found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Who to Follow Section */}
      <div className={styles.section}>
        <div 
          className={`${styles.sectionHeader} ${styles.clickable}`}
          onClick={() => toggleSection('follow')}
        >
          <Users size={18} />
          <h3>Who to Follow</h3>
          <ChevronDown 
            size={18} 
            className={`${styles.chevron} ${expandedSections.has('follow') ? styles.expanded : ''}`}
          />
        </div>
        {expandedSections.has('follow') && (
          <div className={styles.sectionContent}>
          {suggestedUsers.length > 0 ? (
            (showAllSuggestions ? suggestedUsers : suggestedUsers.slice(0, 2)).map((suggestedUser) => (
              <div key={suggestedUser.id} className={styles.userCard}>
                <div
                  className={styles.userAvatar}
                  onClick={() => router.push(`/${suggestedUser.username}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {suggestedUser.avatar_url ? (
                    <img src={suggestedUser.avatar_url} alt="" />
                  ) : (
                    <span>{suggestedUser.display_name?.[0] || suggestedUser.username[0]}</span>
                  )}
                </div>
                <div
                  className={styles.userInfo}
                  onClick={() => router.push(`/${suggestedUser.username}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <p className={styles.userName}>
                    {suggestedUser.display_name || suggestedUser.username}
                    {suggestedUser.is_premium && <span className={styles.premiumBadge}>👑</span>}
                  </p>
                  <p className={styles.userHandle}>@{suggestedUser.username}</p>
                  {suggestedUser.followers_count !== undefined && (
                    <p className={styles.followers}>{suggestedUser.followers_count} followers</p>
                  )}
                </div>
                <button
                  className={followingIds.has(suggestedUser.id) ? styles.followingButton : styles.followButton}
                  onClick={() => handleFollow(suggestedUser.id)}
                  disabled={followLoading.has(suggestedUser.id)}
                >
                  {followLoading.has(suggestedUser.id) ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : followingIds.has(suggestedUser.id) ? (
                    'Following'
                  ) : (
                    <><UserPlus size={14} /> Follow</>
                  )}
                </button>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No suggestions available</p>
          )}
          </div>
        )}
        {expandedSections.has('follow') && suggestedUsers.length > 0 && (
          <div className={styles.followFooter}>
            {suggestedUsers.length > 2 && (
              <button
                type="button"
                className={styles.showToggleLink}
                onClick={() => setShowAllSuggestions(prev => !prev)}
              >
                {showAllSuggestions ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trending Section */}
      <div className={styles.section}>
        <div 
          className={`${styles.sectionHeader} ${styles.clickable}`}
          onClick={() => toggleSection('trending')}
        >
          <TrendingUp size={18} />
          <h3>What's Trending</h3>
          <ChevronDown 
            size={18} 
            className={`${styles.chevron} ${expandedSections.has('trending') ? styles.expanded : ''}`}
          />
        </div>
        {expandedSections.has('trending') && (
        <div className={styles.sectionContent}>
          {trendingTopics.length > 0 ? (
            (showAllTrends ? trendingTopics : trendingTopics.slice(0, 2)).map((topic, index) => (
              <div
                key={topic.hashtag}
                className={styles.trendingCard}
                onClick={() => handleTrendingClick(topic.hashtag)}
              >
                <p className={styles.trendingCategory}>
                  <Hash size={14} />
                  {topic.category} · Trending
                </p>
                <p className={styles.trendingTitle}>{topic.hashtag}</p>
                <p className={styles.trendingStats}>{topic.count} posts</p>
              </div>
            ))
          ) : (
            <p className={styles.emptyState}>No trending topics yet</p>
          )}
        </div>
        )}
        {expandedSections.has('trending') && trendingTopics.length > 0 && (
          <div className={styles.followFooter}>
            <button
              type="button"
              className={styles.showToggleLink}
              onClick={() => setShowAllTrends(prev => !prev)}
              disabled={trendingTopics.length <= 2}
            >
              {showAllTrends ? 'Show less' : 'Show more'}
            </button>
          </div>
        )}
      </div>

      {/* Ads Section — hidden for users with no-ads tier */}
      {currentAd && !hasNoAds && (
        <div className={styles.section}>
          <div 
            className={`${styles.sectionHeader} ${styles.clickable}`}
            onClick={() => toggleSection('ads')}
          >
            <ExternalLink size={18} />
            <h3>Sponsored</h3>
            <ChevronDown 
              size={18} 
              className={`${styles.chevron} ${expandedSections.has('ads') ? styles.expanded : ''}`}
            />
          </div>
          {expandedSections.has('ads') && (
            <div className={styles.adSpace}>
              <p className={styles.adLabel}>{currentAd.sponsor}</p>
              <div
                className={styles.adContent}
                onClick={() => router.push(currentAd.link_url)}
              >
                <h4>{currentAd.title}</h4>
                <p>{currentAd.description}</p>
                <div className={styles.adAction}>
                  <span>Learn More</span>
                  <ExternalLink size={14} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
