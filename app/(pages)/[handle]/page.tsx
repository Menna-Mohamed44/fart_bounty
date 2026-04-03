'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth, type AuthUser } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import type { Database } from '@/types/database'
import {
  MapPin,
  Calendar,
  Users,
  UserPlus,
  UserMinus,
  Settings,
  Share2,
  MoreHorizontal,
  MessageCircle,
  Heart,
  Volume2,
  BookOpen,
  Crown,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronRight,
  Play,
  Pause,
  Filter,
  TrendingUp,
  Swords
} from 'lucide-react'
import { ChallengeModal } from '@/app/components/ChallengeModal/ChallengeModal'
import styles from './profile.module.css'

type SortType = 'latest' | 'top' | 'hot'
type TabType = 'posts' | 'comments' | 'stories'

interface ProfileUser {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  location: string | null
  avatar_url: string | null
  banner_url: string | null
  is_private: boolean
  is_premium: boolean
  premium_tier: string
  is_admin: boolean
  is_bot: boolean
  bot_personality: any
  fb_coins: number
  fb_gold: number
  premium_since: string | null
  last_username_change_at: string | null
  created_at: string
  updated_at: string
}

interface Post {
  id: string
  user_id: string
  content: string
  sound_id: string | null
  created_at: string
  edited_at: string | null
  deleted: boolean
  user: {
    username: string
    display_name: string | null
    is_premium: boolean
    avatar_url: string | null
  }
  sound: {
    id: string
    name: string
    storage_path: string
    duration_seconds: number
    deleted: boolean
  } | null
  likes_count: number
  comments_count: number
  user_liked: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  post_id: string
  post_content: string
  user_id: string
}

interface Story {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  reactions_count: number
}


export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser }: { user: AuthUser | null } = useAuth()
  const supabase = createClient()
  
  const handle = params.handle as string
  // Decode URL-encoded username and remove @ if present
  const decodedHandle = decodeURIComponent(handle || '')
  let username = decodedHandle.startsWith('@') ? decodedHandle.slice(1) : decodedHandle
  // Sanitize username to match database format (lowercase, replace special chars with _)
  username = username.toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('posts')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [postsCount, setPostsCount] = useState(0)
  const [sortBy, setSortBy] = useState<SortType>('hot')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

  // Edit/Delete state
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editPostContent, setEditPostContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null)
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null)

  // Audio state
  const [playingSound, setPlayingSound] = useState<string | null>(null)
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})

  // Challenge modal state
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)

  const isOwnProfile = currentUser?.username === username

  // Fetch profile user
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return

      setLoading(true)
      try {
        // First try exact match
        const { data: exactData, error: exactError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single()

        let profileData = exactData
        let profileError = exactError

        // If not found, try case-insensitive match
        if (exactError && exactError.code === 'PGRST116') {
          const { data: caseData, error: caseError } = await supabase
            .from('users')
            .select('*')
            .ilike('username', username)
            .single()
          profileData = caseData
          profileError = caseError
        }

        if (profileError || !profileData) throw profileError
        
        // TypeScript type assertion after null check
        const data = profileData as ProfileUser
        setProfileUser(data)

        // Fetch follower/following counts
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', data.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', data.id)
        ])

        setFollowersCount(followersRes.count || 0)
        setFollowingCount(followingRes.count || 0)

        // Check if current user is following this profile
        if (currentUser && currentUser.id !== data.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('followee_id', data.id)
            .single()

          setIsFollowing(!!followData)
        }

        // Fetch posts count
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.id)
          .eq('deleted', false)

        setPostsCount(count || 0)
      } catch (error) {
        // User doesn't exist - set profileUser to null to show "User not found" message
        setProfileUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username, currentUser, supabase, router])

  // Fetch content based on active tab
  useEffect(() => {
    if (!profileUser) return

    const fetchContent = async () => {
      try {
        switch (activeTab) {
          case 'posts':
            console.log('Fetching posts for profile user:', profileUser.id, profileUser.username)
            const { data: postsData, error: postsError } = await supabase
              .from('posts')
              .select(`
                id,
                user_id,
                content,
                sound_id,
                created_at,
                edited_at,
                deleted,
                users!posts_user_id_fkey(username, display_name, is_premium, avatar_url),
                sounds(id, name, storage_path, duration_seconds, deleted)
              `)
              .eq('user_id', profileUser.id)
              .eq('deleted', false)
              .order('created_at', { ascending: false })
              .limit(20)
            
            if (postsError) {
              console.error('Error fetching profile posts:', {
                message: postsError.message,
                details: postsError.details,
                hint: postsError.hint,
                code: postsError.code
              })
            }
            console.log('Profile posts data:', postsData, 'Count:', postsData?.length || 0)

            const postsWithCounts = await Promise.all(
              (postsData || []).map(async (post: any) => {
                const [likesRes, commentsRes, userLikeRes] = await Promise.all([
                  supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                  supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                  currentUser
                    ? supabase.from('likes').select('*').eq('post_id', post.id).eq('user_id', currentUser.id).maybeSingle()
                    : { data: null }
                ])

                return {
                  ...post,
                  user: post.users,
                  sound: post.sounds,
                  likes_count: likesRes.count || 0,
                  comments_count: commentsRes.count || 0,
                  user_liked: !!userLikeRes.data
                }
              })
            )

            setPosts(postsWithCounts)

            // Apply sorting
            if (sortBy === 'latest') {
              postsWithCounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            } else if (sortBy === 'top') {
              postsWithCounts.sort((a, b) => b.likes_count - a.likes_count)
            } else if (sortBy === 'hot') {
              // Enhanced Hot algorithm: considers likes, comments, and recency
              postsWithCounts.sort((a, b) => {
                const now = Date.now()
                const aAge = (now - new Date(a.created_at).getTime()) / 3600000 // hours
                const bAge = (now - new Date(b.created_at).getTime()) / 3600000

                // Weighted score: likes (2x) + comments (1.5x) with decay over time
                const aScore = (a.likes_count * 2 + a.comments_count * 1.5) / Math.pow(aAge + 2, 1.5)
                const bScore = (b.likes_count * 2 + b.comments_count * 1.5) / Math.pow(bAge + 2, 1.5)

                return bScore - aScore
              })
            }
            break

          case 'comments':
            const { data: commentsData } = await supabase
              .from('comments')
              .select(`
                id,
                content,
                created_at,
                post_id,
                user_id,
                posts!inner(content)
              `)
              .eq('user_id', profileUser.id)
              .order('created_at', { ascending: false })
              .limit(20)

            setComments(
              (commentsData || []).map((c: any) => ({
                ...c,
                post_content: c.posts?.content || ''
              }))
            )
            break

          case 'stories':
            const { data: storiesData } = await supabase
              .from('stories')
              .select('id, title, content, category, created_at')
              .eq('user_id', profileUser.id)
              .order('created_at', { ascending: false })
              .limit(20)

            const storiesWithCounts = await Promise.all(
              ((storiesData ?? []) as any[]).map(async (story: any) => {
                const { count } = await supabase
                  .from('story_reactions')
                  .select('*', { count: 'exact', head: true })
                  .eq('story_id', story.id)

                return {
                  ...story,
                  reactions_count: count || 0
                }
              })
            )

            setStories(storiesWithCounts)

            // Apply sorting
            if (sortBy === 'latest') {
              setStories(storiesWithCounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
            } else if (sortBy === 'top') {
              setStories(storiesWithCounts.sort((a, b) => b.reactions_count - a.reactions_count))
            } else if (sortBy === 'hot') {
              // For stories, hot is similar to top since we don't have comments count
              setStories(storiesWithCounts.sort((a, b) => b.reactions_count - a.reactions_count))
            }
            break

        }
      } catch (error) {
        console.error('Error fetching content:', error)
      }
    }

    fetchContent()
  }, [activeTab, profileUser, currentUser, supabase, sortBy])

  const handleFollow = async () => {
    if (!currentUser) {
      // Guest user trying to follow - redirect to sign up
      router.push('/')
      return
    }

    if (!profileUser) return

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('followee_id', profileUser.id)

        setIsFollowing(false)
        setFollowersCount((prev) => prev - 1)
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, followee_id: profileUser.id })

        setIsFollowing(true)
        setFollowersCount((prev) => prev + 1)
      }

      // Notify sidebar to refresh following state
      window.dispatchEvent(new CustomEvent('followStateChanged', { 
        detail: { userId: profileUser.id, isFollowing: !isFollowing } 
      }))
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      // Guest user trying to like - redirect to sign up
      router.push('/')
      return
    }

    const post = posts.find((p) => p.id === postId)
    if (!post) return

    try {
      if (post.user_liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p
          )
        )
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id })

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p
          )
        )
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleEditPost = async (postId: string) => {
    if (!currentUser || !isOwnProfile || !editPostContent.trim()) return

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editPostContent.replace(/\n/g, ' '), edited_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, content: editPostContent, edited_at: new Date().toISOString() } : p
      ))
      setEditingPost(null)
      setEditPostContent('')
      setShowPostMenu(null)
    } catch (error) {
      console.error('Error editing post:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!currentUser || !isOwnProfile || !confirm('Delete this post?')) return

    try {
      console.log('Attempting to delete post:', postId, 'by user:', currentUser.id)

      // Use direct RPC call to bypass RLS issues
      const { data, error } = await supabase.rpc('delete_post', {
        post_id: postId,
        p_user_id: currentUser.id
      })

      if (error) {
        console.error('Supabase RPC error:', error)
        throw error
      }

      console.log('Post deleted successfully via RPC')

      setPosts(prev => prev.filter(p => p.id !== postId))
      setPostsCount(prev => Math.max(0, prev - 1))
      setShowPostMenu(null)
    } catch (error: any) {
      console.error('Error deleting post:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))

      // Show user-friendly error message
      alert(`Failed to delete post: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!currentUser || !isOwnProfile || !editCommentContent.trim()) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editCommentContent.replace(/\n/g, ' ') })
        .eq('id', commentId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, content: editCommentContent } : c
      ))
      setEditingComment(null)
      setEditCommentContent('')
      setShowCommentMenu(null)
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !isOwnProfile || !confirm('Delete this comment?')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id)

      if (error) throw error

      setComments(prev => prev.filter(c => c.id !== commentId))
      setShowCommentMenu(null)
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const parseContent = (content: string) => {
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={`${part}-${index}`} className={styles.mention}>
            {part}
          </span>
        )
      }
      return <span key={`${part}-${index}`}>{part}</span>
    })
  }

  const toggleSound = (soundId: string, soundPath: string) => {
    if (playingSound === soundId) {
      audioRefs.current[soundId]?.pause()
      setPlayingSound(null)
    } else {
      // Pause all other sounds
      Object.values(audioRefs.current).forEach(audio => audio.pause())

      if (!audioRefs.current[soundId]) {
        const audio = new Audio()
        audio.src = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sounds/${soundPath}`
        audio.onended = () => setPlayingSound(null)
        audioRefs.current[soundId] = audio
      }

      audioRefs.current[soundId].play()
      setPlayingSound(soundId)
    }
  }

  const toggleStoryExpansion = (storyId: string) => {
    setExpandedStory(expandedStory === storyId ? null : storyId)
  }

  const getPreviewContent = (content: string) => {
    if (content.length <= 200) return content
    return content.substring(0, 200) + '...'
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    )
  }

  if (!profileUser) {
    // If this is the user's own profile and it's not found, there's a data issue
    const isOwnProfileAttempt = currentUser?.username === username || currentUser?.id === username
    
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h1>User not found</h1>
          {isOwnProfileAttempt ? (
            <>
              <p>Your profile could not be loaded. This may be due to a setup issue.</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Searching for: {username} | Your username: {currentUser?.username || 'not set'}
              </p>
            </>
          ) : (
            <p>The profile you&apos;re looking for doesn&apos;t exist.</p>
          )}
          <button onClick={() => router.push('/home')} className={styles.backButton}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div className={styles.banner}>
        {profileUser.banner_url && profileUser.is_premium ? (
          <img src={profileUser.banner_url} alt={`${profileUser.username}'s banner`} className={styles.bannerImage} />
        ) : (
          <div className={styles.bannerPlaceholder} />
        )}
      </div>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {profileUser.avatar_url ? (
              <img src={profileUser.avatar_url} alt={profileUser.username} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profileUser.display_name?.[0] || profileUser.username[0]}
              </div>
            )}
          </div>
        </div>

        <div className={styles.profileActions}>
          {isOwnProfile ? (
            <>
              <button className={styles.editButton} onClick={() => router.push('/settings')}>
                <Settings size={18} />
                <span>Edit Profile</span>
              </button>
            </>
          ) : (
            <>
              <button
                className={isFollowing ? styles.followingButton : styles.followButton}
                onClick={handleFollow}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={18} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Follow</span>
                  </>
                )}
              </button>
              <button 
                className={styles.challengeButton}
                onClick={() => setChallengeModalOpen(true)}
                title="Challenge to a sound battle"
              >
                <Swords size={18} />
                <span>Challenge</span>
              </button>
              <button className={styles.iconButton}>
                <Share2 size={18} />
              </button>
              <button className={styles.iconButton}>
                <MoreHorizontal size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className={styles.profileInfo}>
        <div className={styles.nameSection}>
          <h1 className={styles.displayName}>
            {profileUser.display_name || profileUser.username}
            {profileUser.is_premium && (
              <span className={styles.verifiedBadge} title="Premium Member">
                <Crown size={18} />
              </span>
            )}
          </h1>
          <p className={styles.username}>@{profileUser.username}</p>
        </div>

        {profileUser.bio && <p className={styles.bio}>{profileUser.bio}</p>}

        <div className={styles.metadata}>
          {profileUser.location && (
            <div className={styles.metaItem}>
              <MapPin size={16} />
              <span>{profileUser.location}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <Calendar size={16} />
            <span>Joined {formatDate(profileUser.created_at)}</span>
          </div>
          {profileUser.is_premium && profileUser.premium_since && (
            <div className={styles.metaItem}>
              <Crown size={16} />
              <span>Premium since {formatDate(profileUser.premium_since)}</span>
            </div>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{postsCount}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{followersCount}</span>
            <span className={styles.statLabel}>Followers</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{followingCount}</span>
            <span className={styles.statLabel}>Following</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <MessageCircle size={18} />
          <span>Posts</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'comments' ? styles.active : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <MessageCircle size={18} />
          <span>Comments</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stories' ? styles.active : ''}`}
          onClick={() => setActiveTab('stories')}
        >
          <BookOpen size={18} />
          <span>Stories</span>
        </button>

        {/* Sort Button */}
        {(activeTab === 'posts' || activeTab === 'stories') && (
          <div className={styles.sortContainer}>
            <button className={styles.sortButton} onClick={() => setShowSortMenu(!showSortMenu)}>
              <Filter size={18} />
              <span>{sortBy === 'hot' ? 'Hot' : sortBy === 'top' ? 'Top' : 'Latest'}</span>
            </button>
            {showSortMenu && (
              <div className={styles.sortMenu}>
                <button className={styles.sortButton} onClick={() => { setSortBy('hot'); setShowSortMenu(false) }}>
                  <TrendingUp size={16} /> Hot
                </button>
                <button className={styles.sortButton} onClick={() => { setSortBy('top'); setShowSortMenu(false) }}>
                  <Heart size={16} /> Top
                </button>
                <button className={styles.sortButton} onClick={() => { setSortBy('latest'); setShowSortMenu(false) }}>
                  <MessageCircle size={16} /> Latest
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'posts' && (
          <div className={styles.postsGrid}>
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageCircle size={48} />
                <p>No posts yet</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className={styles.postCard}>
                  <div className={styles.postHeader}>
                    <span className={styles.postDate}>{formatRelativeTime(post.created_at)}</span>
                    {isOwnProfile && (
                      <div className={styles.postMenu}>
                        <button 
                          className={styles.menuButton}
                          onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {showPostMenu === post.id && (
                          <div className={styles.dropdown}>
                            <button onClick={() => { setEditingPost(post.id); setEditPostContent(post.content); setShowPostMenu(null) }}>
                              <Edit3 size={14} /> Edit
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className={styles.deleteButton}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingPost === post.id ? (
                    <div className={styles.editBox}>
                      <textarea
                        value={editPostContent}
                        onChange={(e) => setEditPostContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault()
                        }}
                        className={styles.editTextarea}
                      />
                      <div className={styles.editActions}>
                        <button onClick={() => { setEditingPost(null); setEditPostContent('') }} className={styles.cancelButton}>
                          <X size={14} /> Cancel
                        </button>
                        <button onClick={() => handleEditPost(post.id)} className={styles.saveButton}>
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                    {(() => {
                      const sharedMatch = post.content.match(/^(?:(.+?)\n\n)?\[SHARED_POST\]\s*@(\w+)\s*\|\|\s*(.+?)\s*\|\|\s*(.+)$/s)
                      if (sharedMatch) {
                        const userComment = sharedMatch[1] || ''
                        const originalUsername = sharedMatch[2]
                        const originalDisplayName = sharedMatch[3]
                        const originalContent = sharedMatch[4]

                        return (
                          <>
                            {userComment && (
                              <p className={styles.postContent}>{parseContent(userComment)}</p>
                            )}
                            <div className={styles.sharedPostCard}>
                              <div className={styles.sharedPostHeader}>
                                <span className={styles.sharedPostAuthor}>{originalDisplayName}</span>
                                <span className={styles.sharedPostUsername}>@{originalUsername}</span>
                              </div>
                              <p className={styles.sharedPostContent}>{parseContent(originalContent)}</p>
                            </div>
                          </>
                        )
                      }

                      return <p className={styles.postContent}>{parseContent(post.content)}</p>
                    })()}
                      {post.sound && (
                        <div className={styles.soundEmbed}>
                          <button
                            className={styles.soundPlayButton}
                            onClick={() => toggleSound(post.sound!.id, post.sound!.storage_path)}
                          >
                            {playingSound === post.sound.id ? <Pause size={20} /> : <Play size={20} />}
                          </button>
                          <div className={styles.soundWave}>
                            <div className={styles.soundBar} />
                            <div className={styles.soundBar} />
                            <div className={styles.soundBar} />
                            <div className={styles.soundBar} />
                            <div className={styles.soundBar} />
                          </div>
                          <span className={styles.soundDuration}>{post.sound.duration_seconds}s</span>
                        </div>
                      )}
                      {post.edited_at && <span className={styles.editedLabel}>(edited)</span>}
                      <div className={styles.postActions}>
                        <button
                          className={`${styles.actionButton} ${post.user_liked ? styles.liked : ''}`}
                          onClick={() => handleLike(post.id)}
                        >
                          <Heart size={16} fill={post.user_liked ? 'currentColor' : 'none'} />
                          <span>{post.likes_count}</span>
                        </button>
                        <button className={styles.actionButton}>
                          <MessageCircle size={16} />
                          <span>{post.comments_count}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className={styles.commentsGrid}>
            {comments.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageCircle size={48} />
                <p>No comments yet</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentDate}>{formatRelativeTime(comment.created_at)}</span>
                    {isOwnProfile && (
                      <div className={styles.commentMenu}>
                        <button 
                          className={styles.menuButton}
                          onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {showCommentMenu === comment.id && (
                          <div className={styles.dropdown}>
                            <button onClick={() => { setEditingComment(comment.id); setEditCommentContent(comment.content); setShowCommentMenu(null) }}>
                              <Edit3 size={14} /> Edit
                            </button>
                            <button onClick={() => handleDeleteComment(comment.id)} className={styles.deleteButton}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <div className={styles.editBox}>
                      <textarea
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.preventDefault()
                        }}
                        className={styles.editTextarea}
                      />
                      <div className={styles.editActions}>
                        <button onClick={() => { setEditingComment(null); setEditCommentContent('') }} className={styles.cancelButton}>
                          <X size={14} /> Cancel
                        </button>
                        <button onClick={() => handleEditComment(comment.id)} className={styles.saveButton}>
                          <Save size={14} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={styles.commentContent}>{comment.content}</p>
                      <div className={styles.commentContext}>
                        <span className={styles.contextLabel}>Replying to:</span>
                        <p className={styles.contextPost}>{comment.post_content}</p>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className={styles.storiesGrid}>
            {stories.length === 0 ? (
              <div className={styles.emptyState}>
                <BookOpen size={48} />
                <p>No stories yet</p>
              </div>
            ) : (
              stories.map((story) => (
                <div key={story.id} className={styles.storyCard}>
                  <h4 className={styles.storyTitle}>{story.title}</h4>
                  <p className={styles.storyContent}>
                    {expandedStory === story.id ? story.content : getPreviewContent(story.content)}
                  </p>

                  {story.content.length > 200 && (
                    <button
                      className={styles.readMoreButton}
                      onClick={() => toggleStoryExpansion(story.id)}
                    >
                      {expandedStory === story.id ? 'Show Less' : 'Read More'}
                      <ChevronRight size={16} className={expandedStory === story.id ? styles.rotated : ''} />
                    </button>
                  )}

                  <div className={styles.storyFooter}>
                    <span className={styles.storyCategory}>{story.category}</span>
                    <span className={styles.storyDate}>{formatRelativeTime(story.created_at)}</span>
                    <span className={styles.reactionsCount}>{story.reactions_count} reactions</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Challenge Modal */}
      {profileUser && (
        <ChallengeModal
          isOpen={challengeModalOpen}
          onClose={() => setChallengeModalOpen(false)}
          opponentId={profileUser.id}
          opponentName={profileUser.display_name || profileUser.username}
        />
      )}
    </div>
  )
}
