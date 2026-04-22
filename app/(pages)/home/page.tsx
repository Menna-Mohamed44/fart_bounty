'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import { createClient } from '@/app/lib/supabaseClient'
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Crown,
  Play,
  Pause,
  Upload,
  Music,
  X,
  Send,
  Edit3,
  Trash2,
  TrendingUp,
  Users,
  Search,
  Filter,
  Flag,
  AlertTriangle,
  Copy,
  Facebook,
  Instagram,
  Link,
  Clapperboard,
  Video
} from 'lucide-react'
import styles from './home.module.css'
import HomeFeedWidgets from '@/app/components/HomeFeedWidgets/HomeFeedWidgets'
import { checkProfanity, getFlagReason, shouldAutoBlock, getContentWarning } from '@/app/lib/profanityFilter'
import dynamic from 'next/dynamic'
const ShortsPlayer = dynamic(() => import('@/app/components/ShortsPlayer/ShortsPlayer'), { ssr: false })

type TabType = 'following' | 'trending' | 'shorts'
type SortType = 'latest' | 'top' | 'hot'

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

interface UserSound {
  id: string
  name: string
  storage_path: string
  duration_seconds: number
  user_id: string
  created_at: string
  deleted: boolean
}

interface PostComment {
  id: string
  post_id: string
  user_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  user: {
    username: string
    display_name: string | null
    avatar_url: string | null
    is_premium: boolean
  }
  replies?: PostComment[]
}

export default function HomePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePage />
    </Suspense>
  )
}

function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { maxPostLength, premiumTier, canCreate, incrementUsage, remainingCreations } = usePremium()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('trending')
  const [sortBy, setSortBy] = useState<SortType>('hot')
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Post creation
  const [postContent, setPostContent] = useState('')
  const [showConfirmPost, setShowConfirmPost] = useState(false)
  const [showPostedToast, setShowPostedToast] = useState(false)
  const [selectedSound, setSelectedSound] = useState<UserSound | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [userSounds, setUserSounds] = useState<UserSound[]>([])
  const [showSoundSelector, setShowSoundSelector] = useState(false)
  const [shortVideoFile, setShortVideoFile] = useState<File | null>(null)
  const [shortVideoPreview, setShortVideoPreview] = useState<string | null>(null)
  const [isUploadingShort, setIsUploadingShort] = useState(false)
  const shortVideoInputRef = useRef<HTMLInputElement>(null)

  // Feed
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [playingSound, setPlayingSound] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const pageSize = 10

  // Comments
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, PostComment[]>>({})
  const [commentContent, setCommentContent] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [visibleComments, setVisibleComments] = useState<Record<string, number>>({})
  const [collapsedPosts, setCollapsedPosts] = useState<Set<string>>(new Set())
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set())
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [flaggingPost, setFlaggingPost] = useState<string | null>(null)
  const [flaggingComment, setFlaggingComment] = useState<string | null>(null)
  const [flaggingUser, setFlaggingUser] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState<string>('inappropriate_content')
  const [flagDescription, setFlagDescription] = useState('')
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null)
  const [showReportMenu, setShowReportMenu] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState<string | null>(null)
  const [shareSearchQuery, setShareSearchQuery] = useState('')
  const [shareSearchResults, setShareSearchResults] = useState<any[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [sharingToUser, setSharingToUser] = useState<string | null>(null)
  const [shareComment, setShareComment] = useState('')

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const audioRefs = useRef<Record<string, HTMLAudioElement>>({})
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Keep a ref to the latest user so async functions never see stale closures
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const maxLength = maxPostLength

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup audio refs
      Object.values(audioRefs.current).forEach(audio => audio.pause())
    }
  }, [])

  // Handle scroll to post from notification
  useEffect(() => {
    const scrollToPostId = searchParams.get('scrollTo')
    if (scrollToPostId && posts.length > 0 && !loading) {
      setTimeout(() => {
        const postElement = document.getElementById(`post-${scrollToPostId}`)
        if (postElement) {
          // Ensure the post is expanded if it was previously collapsed
          setCollapsedPosts(prev => {
            if (!prev.has(scrollToPostId)) return prev
            const next = new Set(prev)
            next.delete(scrollToPostId)
            return next
          })

          // Get the element's position
          const elementRect = postElement.getBoundingClientRect()
          const absoluteElementTop = elementRect.top + window.pageYOffset
          const offset = 80 // Offset for any fixed headers

          // Scroll to position with offset
          window.scrollTo({
            top: absoluteElementTop - offset,
            behavior: 'smooth'
          })
          
          postElement.style.outline = '2px solid var(--accent-primary)'
          postElement.style.outlineOffset = '4px'
          setTimeout(() => {
            postElement.style.outline = ''
            postElement.style.outlineOffset = ''
          }, 2000)
          // Clear the query param
          router.replace('/home')
        }
      }, 300)
    }
  }, [posts, loading, searchParams, router])

  // Fetch user's sounds for attachment
  useEffect(() => {
    if (user) {
      fetchUserSounds()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const soundSelector = document.querySelector('[class*="soundSelector"]')
      const isInsideSoundSelector = soundSelector && soundSelector.contains(target)

      if (showSoundSelector && !isInsideSoundSelector) {
        setShowSoundSelector(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSoundSelector])

  const fetchUserSounds = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('sounds')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUserSounds(data || [])
    } catch (error) {
      console.error('Failed to fetch user sounds:', error)
    }
  }

  const handleSoundSelect = (sound: UserSound | null) => {
    setSelectedSound(sound)
    setTimeout(() => {
      setShowSoundSelector(false)
    }, 100)
  }


  // Refresh sounds when component becomes visible (user returns from generator)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchUserSounds()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset and fetch first page when tab/sort/user/search changes
  useEffect(() => {
    if (!user) return
    setPosts([])
    setPage(0)
    setHasMore(true)
    setLoading(true)
    fetchPosts(0)
  }, [activeTab, sortBy, user?.id, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(searchQuery.length > 0)
      // The fetchPosts effect above will trigger with the new searchQuery
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Auto-hide posted toast
  useEffect(() => {
    if (!showPostedToast) return
    const t = setTimeout(() => setShowPostedToast(false), 2000)
    return () => clearTimeout(t)
  }, [showPostedToast])

  const fetchPosts = async (pageToFetch: number) => {
    const currentUser = userRef.current
    if (!currentUser) return
    // Shorts tab uses its own fetcher
    if (activeTab === 'shorts') {
      setLoading(false)
      return
    }
    // indicate loading states
    if (pageToFetch === 0) setLoading(true)
    else setIsFetchingMore(true)
    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          user_id,
          content,
          sound_id,
          media_url,
          is_short,
          created_at,
          edited_at,
          deleted,
          users!posts_user_id_fkey(username, display_name, is_premium, avatar_url),
          sounds!left(id, name, storage_path, duration_seconds, deleted)
        `)
        .eq('deleted', false)
        .or('is_short.is.null,is_short.eq.false')

      // Add search filter if query exists
      if (searchQuery.trim()) {
        query = query.ilike('content', `%${searchQuery.trim()}%`)
      }

      // Filter by following if on following tab
      if (activeTab === 'following') {
        const { data: followingData } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', currentUser.id)

        const followingIds = followingData?.map(f => f.followee_id) || []
        if (followingIds.length === 0) {
          // User is not following anyone - show empty state
          setPosts([])
          setLoading(false)
          setIsFetchingMore(false)
          setHasMore(false)
          setPage(0)
          return
        }
        query = query.in('user_id', followingIds)
      }

      // Sort
      if (sortBy === 'latest') {
        query = query.order('created_at', { ascending: false })
      }

      const from = pageToFetch * pageSize
      const to = from + pageSize - 1
      const { data: postsData, error } = await query.range(from, to)

      if (error) {
        console.error('=== SUPABASE ERROR ===')
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
        console.error('Code:', error.code)
        console.error('Full error:', JSON.stringify(error, null, 2))
        throw error
      }

      // Batch-fetch likes counts, comments counts, and user's likes in 3 queries (not 3 per post)
      const postIds = (postsData || []).map((p: any) => p.id)

      const [allLikesRes, allCommentsRes, userLikesRes] = await Promise.all([
        supabase.from('likes').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds),
        supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', currentUser.id),
      ])

      // Build count maps
      const likesMap: Record<string, number> = {}
      const commentsMap: Record<string, number> = {}
      const userLikedSet = new Set<string>()

      for (const row of allLikesRes.data || []) { likesMap[row.post_id] = (likesMap[row.post_id] || 0) + 1 }
      for (const row of allCommentsRes.data || []) { commentsMap[row.post_id] = (commentsMap[row.post_id] || 0) + 1 }
      for (const row of userLikesRes.data || []) { userLikedSet.add(row.post_id) }

      const postsWithCounts = (postsData || []).map((post: any) => ({
        ...post,
        user: post.users,
        sound: post.sounds,
        likes_count: likesMap[post.id] || 0,
        comments_count: commentsMap[post.id] || 0,
        user_liked: userLikedSet.has(post.id),
      }))

      // Apply sorting for trending
      if (activeTab === 'trending') {
        if (sortBy === 'top') {
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
      }

      // Append or set
      setPosts(prev => pageToFetch === 0 ? postsWithCounts : [...prev, ...postsWithCounts])
      // If fewer than pageSize returned, no more data
      if (!postsData || postsData.length < pageSize) {
        setHasMore(false)
      }
      // advance page if got results
      if (postsData && postsData.length > 0) {
        setPage(pageToFetch + 1)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
      setIsFetchingMore(false)
    }
  }

  // Observe sentinel to fetch next page
  useEffect(() => {
    if (!hasMore || loading) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !isFetchingMore) {
        fetchPosts(page)
      }
    }, { root: null, rootMargin: '200px', threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, page, isFetchingMore, loading])

  const handleShortVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Video must be under 50 MB')
      return
    }
    setShortVideoFile(file)
    setShortVideoPreview(URL.createObjectURL(file))
  }

  const clearShortVideo = () => {
    setShortVideoFile(null)
    if (shortVideoPreview) URL.revokeObjectURL(shortVideoPreview)
    setShortVideoPreview(null)
    if (shortVideoInputRef.current) shortVideoInputRef.current.value = ''
  }

  const handleCreatePost = async () => {
    if (!user || (!postContent.trim() && !shortVideoFile)) return

    // Check daily creation limit
    if (!canCreate) {
      alert(`You've reached your daily creation limit. Upgrade your plan for more!`)
      return
    }
    
    // Enhanced content moderation check
    const profanityCheck = checkProfanity(postContent)
    const warning = getContentWarning(postContent)
    if (warning) {
      if (shouldAutoBlock(postContent)) {
        alert(`❌ ${warning}`)
        return
      }
      if (!confirm(`⚠️ ${warning}`)) return
    }
    
    setIsPosting(true)
    try {
      setShowConfirmPost(false)

      let mediaUrl: string | null = null
      let isShort = false

      // Upload video if attached
      if (shortVideoFile) {
        setIsUploadingShort(true)
        const ext = shortVideoFile.name.split('.').pop() || 'mp4'
        const path = `shorts/${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(path, shortVideoFile, { contentType: shortVideoFile.type })

        if (uploadError) {
          console.error('Short upload error:', uploadError)
          throw new Error('Failed to upload video')
        }

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
        mediaUrl = urlData.publicUrl
        isShort = true
        setIsUploadingShort(false)
      }

      const insertData: any = {
        user_id: user.id,
        content: postContent.replace(/\n/g, ' '),
        sound_id: selectedSound?.id || null,
      }
      if (mediaUrl) {
        insertData.media_url = mediaUrl
        insertData.media_type = 'video'
        insertData.is_short = isShort
      }

      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single()

      if (postError) {
        console.error('Post creation error:', postError)
        throw postError
      }

      // Auto-flag if contains mild profanity
      if (profanityCheck.hasProfanity && !shouldAutoBlock(postContent) && newPost) {
        const reason = getFlagReason(postContent)
        await (supabase as any).from('content_flags').insert({
          content_type: 'post',
          content_id: newPost.id,
          reported_by: user.id,
          reason: reason,
          description: 'Auto-flagged for profanity detection',
          status: 'pending'
        })
      }

      // Count this creation
      incrementUsage()

      // Reset form
      setPostContent('')
      setSelectedSound(null)
      clearShortVideo()

      await Promise.all([fetchPosts(0), fetchUserSounds()])
      setShowPostedToast(true)
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post')
    } finally {
      setIsPosting(false)
      setIsUploadingShort(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      if (post.user_liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count - 1, user_liked: false } : p
        ))
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, likes_count: p.likes_count + 1, user_liked: true } : p
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          user_id,
          parent_comment_id,
          content,
          created_at,
          users!comments_user_id_fkey(username, display_name, is_premium, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Comments fetch error details:', error)
        throw error
      }

      const formattedComments = (data || []).map((c: any) => ({
        ...c,
        user: c.users
      }))

      // Organize into nested structure
      const commentMap: Record<string, PostComment> = {}
      const rootComments: PostComment[] = []

      formattedComments.forEach((comment: PostComment) => {
        commentMap[comment.id] = { ...comment, replies: [] }
      })

      formattedComments.forEach((comment: PostComment) => {
        if (comment.parent_comment_id) {
          const parent = commentMap[comment.parent_comment_id]
          if (parent) {
            parent.replies!.push(commentMap[comment.id])
          }
        } else {
          rootComments.push(commentMap[comment.id])
        }
      })

      setComments(prev => ({ ...prev, [postId]: rootComments }))
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleToggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null)
    } else {
      setExpandedPost(postId)
      if (!comments[postId]) {
        fetchComments(postId)
      }
    }
  }

  const handleComment = async (postId: string, parentCommentId: string | null = null) => {
    const content = parentCommentId ? replyContent : commentContent
    if (!user || !content.trim()) return

    // Enhanced content moderation check
    const profanityCheck = checkProfanity(content)
    const warning = getContentWarning(content)
    if (warning) {
      if (shouldAutoBlock(content)) {
        alert(`❌ ${warning}`)
        return
      }
      if (!confirm(`⚠️ ${warning}`)) return
    }

    try {
      const { data: newComment, error: commentError } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: content.replace(/\n/g, ' '),
        parent_comment_id: parentCommentId
      })

      if (parentCommentId) {
        setReplyContent('')
      } else {
        setCommentContent('')
      }
      setReplyingTo(null)
      await fetchComments(postId)

      // Update comment count
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ))
    } catch (error) {
      console.error('Error posting comment:', error)
    }
  }

  const handleEditPost = async (postId: string) => {
    if (!user || !editContent.trim()) return

    try {
      await supabase
        .from('posts')
        .update({ content: editContent.replace(/\n/g, ' '), edited_at: new Date().toISOString() })
        .eq('id', postId)
        .eq('user_id', user.id)

      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, content: editContent, edited_at: new Date().toISOString() } : p
      ))

      setEditingPost(null)
      setEditContent('')
    } catch (error) {
      console.error('Error editing post:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return

    try {
      console.log('Attempting to delete post:', postId, 'by user:', user.id)

      // Use direct RPC call to bypass RLS issues
      const { data, error } = await supabase.rpc('delete_post', {
        post_id: postId,
        p_user_id: user.id
      })

      if (error) {
        console.error('Supabase RPC error:', error)
        throw error
      }

      console.log('Post deleted successfully via RPC')

      // Remove post from local state
      setPosts(prev => prev.filter(p => p.id !== postId))
      setShowPostMenu(null)
      setShowDeleteModal(null)
    } catch (error: any) {
      console.error('Error deleting post:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))

      // Show user-friendly error message
      alert(`Failed to delete post: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEditComment = async (commentId: string, postId: string) => {
    if (!user || !editCommentContent.trim()) return

    try {
      await supabase
        .from('comments')
        .update({ content: editCommentContent.replace(/\n/g, ' ') })
        .eq('id', commentId)
        .eq('user_id', user.id)

      setEditingComment(null)
      setEditCommentContent('')
      await fetchComments(postId)
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!user || !confirm('Delete this comment?')) return

    try {
      await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)

      await fetchComments(postId)

      // Update comment count
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
      ))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const highlightSearchTerms = (content: string, query: string) => {
    if (!query.trim()) return content

    const regex = new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = content.split(regex)

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className={styles.searchHighlight}>
            {part}
          </span>
        )
      }
      return part
    })
  }

  const parseContent = (content: string) => {
    // Parse @mentions and convert to clickable links
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1)
        return (
          <span
            key={index}
            className={styles.mention}
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/${encodeURIComponent(sanitizeUsername(username))}`)
            }}
          >
            {highlightSearchTerms(part, searchQuery)}
          </span>
        )
      }
      return <span key={index}>{highlightSearchTerms(part, searchQuery)}</span>
    })
  }

  const handleLoadMoreComments = (postId: string) => {
    setVisibleComments(prev => ({
      ...prev,
      [postId]: (prev[postId] || 3) + 5
    }))
  }

  const togglePostCollapse = (postId: string) => {
    setCollapsedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
    // Close dropdown menu if it's open for this post
    if (showPostMenu === postId) {
      setShowPostMenu(null)
    }
  }

  const toggleCommentCollapse = (commentId: string) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const handleFlagPost = async (postId: string) => {
    if (!user || !flagReason) return

    try {
      await (supabase as any).from('content_flags').insert({
        content_type: 'post',
        content_id: postId,
        reported_by: user.id,
        reason: flagReason,
        description: flagDescription || null,
        status: 'pending'
      })

      alert('✓ Post flagged for review. Thank you for helping keep the community safe!')
      setFlaggingPost(null)
      setFlagReason('inappropriate_content')
      setFlagDescription('')
    } catch (error) {
      console.error('Error flagging post:', error)
      alert('Failed to flag post. Please try again.')
    }
  }

  const handleFlagComment = async (commentId: string) => {
    if (!user || !flagReason) return

    try {
      await (supabase as any).from('content_flags').insert({
        content_type: 'comment',
        content_id: commentId,
        reported_by: user.id,
        reason: flagReason,
        description: flagDescription || null,
        status: 'pending'
      })

      alert('✓ Comment flagged for review. Thank you for helping keep the community safe!')
      setFlaggingComment(null)
      setFlagReason('inappropriate_content')
      setFlagDescription('')
    } catch (error) {
      console.error('Error flagging comment:', error)
      alert('Failed to flag comment. Please try again.')
    }
  }

  const handleFlagUser = async (userId: string) => {
    if (!user || !flagReason) return

    try {
      await (supabase as any).from('user_flags').insert({
        flagged_user_id: userId,
        reported_by: user.id,
        reason: flagReason,
        description: flagDescription || null,
        status: 'pending'
      })

      alert('✓ User flagged for review. Thank you for helping keep the community safe!')
      setFlaggingUser(null)
      setFlagReason('inappropriate_content')
      setFlagDescription('')
    } catch (error) {
      console.error('Error flagging user:', error)
      alert('Failed to flag user. Please try again.')
    }
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

  const formatTime = (date: string) => {
    const now = new Date()
    const posted = new Date(date)
    const diff = now.getTime() - posted.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return 'now'
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Sanitize username to ensure it's URL-safe (replace spaces and special chars)
  const sanitizeUsername = (username: string) => {
    return username.toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }

  const fetchSuggestedUsers = async () => {
    if (!user) return
    try {
      // Fetch users that current user follows
      const { data: followingData } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)
        .limit(10)

      if (followingData && followingData.length > 0) {
        const userIds = followingData.map(f => f.followee_id)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, is_premium')
          .in('id', userIds)
          .limit(6)

        setSuggestedUsers(usersData || [])
      }
    } catch (error) {
      console.error('Error fetching suggested users:', error)
    }
  }

  const searchUsersToShare = async (query: string) => {
    if (!query.trim()) {
      setShareSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, is_premium')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(8)

      if (error) throw error
      setShareSearchResults(data || [])
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const handleSharePost = async (postId: string, platform: string, targetUserId?: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return

    const postUrl = `${window.location.origin}/post/${postId}`
    const shareText = `Check out this post by @${post.user.username}: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`

    if (platform === 'user' && targetUserId) {
      // Share to user's profile by creating a new post with reference
      setSharingToUser(targetUserId)
      try {
        // Extract original creator and content from potentially already-shared post
        let originalCreator = post.user.username
        let originalCreatorDisplayName = post.user.display_name || post.user.username
        let originalContent = post.content
        
        // Check if this is already a shared post (looking for our shared format)
        const sharedMatch = post.content.match(/^(?:(.+?)\n\n)?\[SHARED_POST\]\s*@(\w+)\s*\|\|\s*(.+?)\s*\|\|\s*(.+)$/s)
        if (sharedMatch) {
          // This is already a shared post, extract the original
          originalCreator = sharedMatch[2]
          originalCreatorDisplayName = sharedMatch[3]
          originalContent = sharedMatch[4]
        }
        
        // Build Facebook-style shared post with metadata
        let finalContent = ''
        if (shareComment.trim()) {
          finalContent = `${shareComment.trim()}\n\n[SHARED_POST] @${originalCreator} || ${originalCreatorDisplayName} || ${originalContent}`
        } else {
          finalContent = `[SHARED_POST] @${originalCreator} || ${originalCreatorDisplayName} || ${originalContent}`
        }
        
        // Create a new post on the target user's profile using RPC function
        console.log('Attempting to share post:', {
          user_id: targetUserId,
          content: finalContent,
          sound_id: post.sound_id
        })
        
        const { data: shareResult, error } = await supabase.rpc('share_post_to_user', {
          p_target_user_id: targetUserId,
          p_content: finalContent,
          p_sound_id: post.sound_id || null,
        })
        
        if (error) {
          console.error('Database error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        console.log('Post shared successfully:', shareResult)
        
        console.log('Post shared successfully to user:', targetUserId)
        alert('✓ Post shared successfully!')
        
        // Refresh the feed if sharing to current user's profile
        if (targetUserId === user?.id) {
          console.log('Refreshing feed...')
          setPosts([])
          setPage(0)
          setHasMore(true)
          await fetchPosts(0)
        }
        
        setShowShareModal(null)
        setShareSearchQuery('')
        setShareSearchResults([])
        setShareComment('')
        setSharingToUser(null)
      } catch (error) {
        console.error('Error sharing to user:', error)
        alert('Failed to share post. Check console for details.')
        setSharingToUser(null)
      }
    } else if (platform === 'whatsapp') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + postUrl)}`
      window.open(whatsappUrl, '_blank')
    } else if (platform === 'twitter') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`
      window.open(twitterUrl, '_blank')
    } else if (platform === 'facebook') {
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`
      window.open(facebookUrl, '_blank')
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(postUrl)
        alert('✓ Link copied to clipboard!')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
      }
    } else if (platform === 'instagram') {
      // Instagram doesn't have direct sharing URL, copy link instead
      try {
        await navigator.clipboard.writeText(postUrl)
        alert('✓ Link copied! Share it on Instagram.')
      } catch (error) {
        console.error('Error copying to clipboard:', error)
      }
    }
  }

  useEffect(() => {
    if (showShareModal) {
      fetchSuggestedUsers()
    }
  }, [showShareModal])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsersToShare(shareSearchQuery)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [shareSearchQuery])

  const renderComment = (comment: PostComment, depth: number = 0) => {
    const isCollapsed = collapsedComments.has(comment.id)
    const isEditing = editingComment === comment.id

    return (
      <div key={comment.id} className={styles.comment} style={{ marginLeft: `${depth * 2}rem` }}>
        <div className={styles.commentHeader}>
          <button
            className={styles.collapseButton}
            onClick={() => toggleCommentCollapse(comment.id)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '+' : '−'}
          </button>
          <div className={styles.commentAvatar}>
            {comment.user.avatar_url ? (
              <img src={comment.user.avatar_url} alt={`${comment.user.display_name || comment.user.username}'s avatar`} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {(comment.user.display_name || comment.user.username)[0]}
              </div>
            )}
          </div>
          <div className={styles.commentInfo}>
            <div className={styles.commentAuthor}>
              <span
                className={styles.displayName}
                onClick={() => router.push(`/${encodeURIComponent(sanitizeUsername(comment.user.username))}`)}
              >
                {comment.user.display_name || comment.user.username}
              </span>
              {comment.user.is_premium && <Crown size={14} className={styles.premiumBadge} />}
              <span
                className={styles.username}
                onClick={() => router.push(`/${encodeURIComponent(sanitizeUsername(comment.user.username))}`)}
              >
                @{comment.user.username}
              </span>
              <span className={styles.timestamp}>· {formatTime(comment.created_at)}</span>
            </div>

            {!isCollapsed && (
              <>
                {isEditing ? (
                  <div className={styles.editBox}>
                    <input
                      type="text"
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleEditComment(comment.id, comment.post_id)
                        }
                      }}
                      className={styles.editInput}
                    />
                    <div className={styles.editActions}>
                      <button onClick={() => { setEditingComment(null); setEditCommentContent('') }} className={styles.cancelButton}>Cancel</button>
                      <button onClick={() => handleEditComment(comment.id, comment.post_id)} className={styles.saveButton}>Save</button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.commentContent}>{parseContent(comment.content)}</p>
                )}

                <div className={styles.commentActions}>
                  <button
                    className={styles.replyButton}
                    onClick={() => setReplyingTo(comment.id)}
                  >
                    Reply
                  </button>
                  {comment.user_id === user?.id ? (
                    <>
                      <button
                        className={styles.editCommentButton}
                        onClick={() => { setEditingComment(comment.id); setEditCommentContent(comment.content) }}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        className={styles.deleteCommentButton}
                        onClick={() => handleDeleteComment(comment.id, comment.post_id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.flagCommentButton}
                      onClick={() => setFlaggingComment(comment.id)}
                      title="Report comment"
                    >
                      <Flag size={12} /> Report
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {!isCollapsed && replyingTo === comment.id && (
          <div className={styles.replyBox}>
            <input
              type="text"
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleComment(comment.post_id, comment.id)
                }
              }}
              className={styles.replyInput}
            />
            <div className={styles.replyActions}>
              <button onClick={() => { setReplyingTo(null); setReplyContent('') }} className={styles.cancelButton}>Cancel</button>
              <button onClick={() => handleComment(comment.post_id, comment.id)} className={styles.sendButton}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {!isCollapsed && comment.replies && comment.replies.map(reply => renderComment(reply, depth + 1))}
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'following' ? styles.active : ''}`}
            onClick={() => setActiveTab('following')}
          >
            <Users size={20} />
            <span>Following</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'trending' ? styles.active : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            <TrendingUp size={20} />
            <span>Trending</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'shorts' ? styles.active : ''}`}
            onClick={() => setActiveTab('shorts')}
          >
            <Clapperboard size={20} />
            <span>Shorts</span>
          </button>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={styles.clearSearchButton}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {activeTab === 'trending' && (
          <div className={styles.sortContainer}>
            <button className={styles.sortButton} onClick={() => setShowSortMenu(!showSortMenu)}>
              <Filter size={18} />
              <span>{sortBy === 'hot' ? 'Hot' : sortBy === 'top' ? 'Top' : 'Latest'}</span>
            </button>
            {showSortMenu && (
              <div className={styles.sortMenu}>
                <button onClick={() => { setSortBy('hot'); setShowSortMenu(false) }}>
                  <TrendingUp size={16} /> Hot
                </button>
                <button onClick={() => { setSortBy('top'); setShowSortMenu(false) }}>
                  <Heart size={16} /> Top
                </button>
                <button onClick={() => { setSortBy('latest'); setShowSortMenu(false) }}>
                  <MessageCircle size={16} /> Latest
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shorts view */}
      {activeTab === 'shorts' && (
        <ShortsPlayer />
      )}

      {/* Post Composer + Feed (hidden on shorts tab) */}
      {activeTab !== 'shorts' && (<>
      <div className={styles.composer}>
        <div className={styles.composerAvatar}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="Your avatar" />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(user.display_name || user.username)[0]}
            </div>
          )}
        </div>
        <div className={styles.composerContent}>
          <textarea
            placeholder="What's happening?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
              }
            }}
            maxLength={maxLength}
            className={styles.composerTextarea}
          />
          <div className={styles.composerFooter}>
            <div className={styles.composerActions}>
              <div className={styles.soundSelector}>
                <button
                  type="button"
                  className={styles.soundSelectorButton}
                  onClick={() => setShowSoundSelector(!showSoundSelector)}
                >
                  <Music size={18} />
                  {selectedSound
                    ? `Sound Selected (${formatDuration(selectedSound.duration_seconds)})`
                    : 'Attach Sound'}
                </button>
                {showSoundSelector && (
                  <div className={styles.soundSelectorDropdown}>
                    <div className={styles.soundSelectorHeader}>
                      <span>Your Sounds</span>
                      <button onClick={() => setShowSoundSelector(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.soundSelectorList}>
                      {userSounds.map((sound) => (
                        <button
                          key={sound.id}
                          className={`${styles.soundSelectorItem} ${selectedSound?.id === sound.id ? styles.active : ''}`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('=== SOUND BUTTON CLICK DEBUG ===')
                            console.log('Sound button clicked for sound ID:', sound.id)
                            console.log('Calling handleSoundSelect with sound:', sound)
                            handleSoundSelect(sound)
                          }}
                        >
                          <div className={styles.soundSelectorInfo}>
                            <div className={styles.soundSelectorMain}>
                              <Play size={18} className={styles.soundSelectorIcon} />
                              <span className={styles.soundSelectorName}>
                                {sound.name}
                              </span>
                              {selectedSound?.id === sound.id && <span className={styles.checkmark}>✓</span>}
                            </div>
                            <span className={styles.soundSelectorDuration}>
                              {formatDuration(sound.duration_seconds)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {userSounds.length === 0 && (
                      <div className={styles.soundSelectorEmpty}>
                        <p>No sounds in your library yet</p>
                        <p className={styles.soundSelectorEmptyHint}>
                          Upload some sounds in the generator to get started
                        </p>
                        <button
                          className={styles.createSoundButton}
                          onClick={() => {
                            setShowSoundSelector(false)
                            router.push('/generator')
                          }}
                        >
                          Create Your First Sound
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedSound && (
                <div className={styles.soundPreview}>
                  <div className={styles.soundPreviewContent}>
                    <button
                      className={styles.soundPreviewPlayButton}
                      onClick={() => {
                        if (selectedSound) {
                          console.log('Playing sound preview:', selectedSound.id, selectedSound.storage_path)
                          toggleSound(selectedSound.id, selectedSound.storage_path)
                        } else {
                          console.log('No sound selected for preview')
                        }
                      }}
                    >
                      {playingSound === selectedSound?.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <div className={styles.soundPreviewInfo}>
                      <span className={styles.soundPreviewName}>
                        {selectedSound.name}
                      </span>
                      <span className={styles.soundPreviewDuration}>
                        {formatDuration(selectedSound.duration_seconds)}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.soundPreviewRemove}
                    onClick={() => {
                      console.log('Removing selected sound')
                      setSelectedSound(null)
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                ref={shortVideoInputRef}
                type="file"
                accept="video/*"
                onChange={handleShortVideoSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className={styles.soundSelectorButton}
                onClick={() => shortVideoInputRef.current?.click()}
              >
                <Video size={18} />
                {shortVideoFile ? 'Video attached' : 'Add Short'}
              </button>
            </div>
            {shortVideoPreview && (
              <div className={styles.soundPreview}>
                <div className={styles.soundPreviewContent}>
                  <Clapperboard size={16} />
                  <div className={styles.soundPreviewInfo}>
                    <span className={styles.soundPreviewName}>{shortVideoFile?.name}</span>
                    <span className={styles.soundPreviewDuration}>
                      {shortVideoFile ? `${(shortVideoFile.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                    </span>
                  </div>
                </div>
                <button className={styles.soundPreviewRemove} onClick={clearShortVideo}>
                  <X size={14} />
                </button>
              </div>
            )}
            <div className={styles.composerMeta}>
              <span className={`${styles.charCount} ${postContent.length > maxLength ? styles.overLimit : ''}`}>
                {postContent.length} / {maxLength}
              </span>
              {premiumTier === 'free' && postContent.length > 200 && (
                <span className={styles.premiumHint}>
                  <Crown size={14} /> Upgrade for more chars
                </span>
              )}
              <button
                className={styles.postButton}
                onClick={() => setShowConfirmPost(true)}
                disabled={(!postContent.trim() && !shortVideoFile) || postContent.length > maxLength || isPosting}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <HomeFeedWidgets />

      {/* Feed */}
      <div className={styles.feed}>
        {loading ? (
          <div className={styles.loadingContainer}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skeletonPost}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} style={{ width: '60%' }} />
                  <div className={styles.skeletonLine} style={{ width: '80%' }} />
                  <div className={styles.skeletonLine} style={{ width: '70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageCircle size={48} />
            <p>{activeTab === 'following' ? 'Follow some users to see their posts here' : 'Could not find any posts'}</p>
          </div>
        ) : (
          posts.map(post => {
            const isPostCollapsed = collapsedPosts.has(post.id)
            return (
              <div key={post.id} id={`post-${post.id}`} className={styles.post}>
                <div className={styles.postHeader}>
                  <button
                    className={styles.collapseButton}
                    onClick={() => togglePostCollapse(post.id)}
                    title={isPostCollapsed ? 'Expand' : 'Collapse'}
                  >
                    {isPostCollapsed ? '+' : '−'}
                  </button>
                  <div className={styles.postAvatar} onClick={() => router.push(`/${encodeURIComponent(sanitizeUsername(post.user.username))}`)}>
                    {post.user.avatar_url ? (
                      <img src={post.user.avatar_url} alt={`${post.user.display_name || post.user.username}'s avatar`} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {(post.user.display_name || post.user.username)[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.postInfo}>
                    <div className={styles.postAuthor}>
                      <span
                        className={styles.displayName}
                        onClick={() => router.push(`/${encodeURIComponent(sanitizeUsername(post.user.username))}`)}
                      >
                        {post.user.display_name || post.user.username}
                      </span>
                      {post.user.is_premium && <Crown size={16} className={styles.premiumBadge} />}
                      <span
                        className={styles.username}
                        onClick={() => router.push(`/${encodeURIComponent(sanitizeUsername(post.user.username))}`)}
                      >
                        @{post.user.username}
                      </span>
                      <span className={styles.timestamp}>· {formatTime(post.created_at)}</span>
                      {post.edited_at && <span className={styles.edited}>(edited)</span>}
                    </div>
                  </div>
                  {post.user_id === user.id && (
                    <div className={styles.postMenu}>
                      <button onClick={() => {
                        // If post is collapsed, expand it first before showing menu
                        if (isPostCollapsed) {
                          togglePostCollapse(post.id)
                        }
                        setShowPostMenu(showPostMenu === post.id ? null : post.id)
                      }}>
                        <MoreHorizontal size={18} />
                      </button>
                      {showPostMenu === post.id && (
                        <div className={styles.dropdown}>
                          <button onClick={() => { setEditingPost(post.id); setEditContent(post.content); setShowPostMenu(null) }}>
                            <Edit3 size={16} /> Edit
                          </button>
                          <button onClick={() => { setShowDeleteModal(post.id); setShowPostMenu(null) }} className={styles.deleteButton}>
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isPostCollapsed && (
                  editingPost === post.id ? (
                    <div className={styles.editBox}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                          }
                        }}
                        maxLength={maxLength}
                        className={styles.editTextarea}
                      />
                      <div className={styles.editActions}>
                        <button onClick={() => { setEditingPost(null); setEditContent('') }} className={styles.cancelButton}>Cancel</button>
                        <button onClick={() => handleEditPost(post.id)} className={styles.saveButton}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        // Check if this is a shared post
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
                        } else {
                          return <p className={styles.postContent}>{parseContent(post.content)}</p>
                        }
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

                      <div className={styles.postActions}>
                        <button
                          className={`${styles.actionButton} ${post.user_liked ? styles.liked : ''}`}
                          onClick={() => handleLike(post.id)}
                        >
                          <Heart size={18} fill={post.user_liked ? 'currentColor' : 'none'} />
                          <span>{post.likes_count}</span>
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleToggleComments(post.id)}
                        >
                          <MessageCircle size={18} />
                          <span>{post.comments_count}</span>
                        </button>
                        <button 
                          className={styles.actionButton}
                          onClick={() => setShowShareModal(post.id)}
                        >
                          <Share2 size={18} />
                        </button>
                        {post.user_id !== user.id && (
                          <div className={styles.reportMenuContainer}>
                            <button 
                              className={styles.actionButton}
                              onClick={() => setShowReportMenu(showReportMenu === post.id ? null : post.id)}
                              title="Report"
                            >
                              <Flag size={18} />
                            </button>
                            {showReportMenu === post.id && (
                              <div className={styles.reportDropdown}>
                                <button onClick={() => { setFlaggingPost(post.id); setShowReportMenu(null) }}>
                                  <Flag size={14} /> Report Post
                                </button>
                                <button onClick={() => { setFlaggingUser(post.user_id); setShowReportMenu(null) }}>
                                  <AlertTriangle size={14} /> Report User
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {expandedPost === post.id && (
                        <div className={styles.commentsSection}>
                          <div className={styles.commentComposer}>
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentContent}
                              onChange={(e) => setCommentContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleComment(post.id)
                                }
                              }}
                              className={styles.commentInput}
                            />
                            <button onClick={() => handleComment(post.id)} className={styles.sendButton}>
                              <Send size={16} />
                            </button>
                          </div>
                          <div className={styles.commentsList}>
                            {comments[post.id]?.slice(0, visibleComments[post.id] || 3).map(comment => renderComment(comment))}
                            {comments[post.id] && comments[post.id].length > (visibleComments[post.id] || 3) && (
                              <button
                                className={styles.loadMoreButton}
                                onClick={() => handleLoadMoreComments(post.id)}
                              >
                                Load {Math.min(5, comments[post.id].length - (visibleComments[post.id] || 3))} more comments
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                )}
              </div>
            )
          })
        )}
        {!loading && (hasMore || isFetchingMore) && (
          <div ref={sentinelRef} className={styles.feedLoader}>
            {isFetchingMore ? 'Loading more…' : ''}
          </div>
        )}
      </div>
      </>)}
      {/* Flag Post Modal */}
      {flaggingPost && (
        <div className={styles.modalOverlay} onClick={() => setFlaggingPost(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                <Flag size={20} /> Report Post
              </h4>
              <button className={styles.modalCloseButton} onClick={() => setFlaggingPost(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>Reason for reporting:</label>
              <select 
                value={flagReason} 
                onChange={(e) => setFlagReason(e.target.value)}
                className={styles.select}
              >
                <option value="spam">Spam</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech</option>
                <option value="inappropriate_content">Inappropriate content</option>
                <option value="misinformation">Misinformation</option>
                <option value="violence">Violence or threats</option>
                <option value="other">Other</option>
              </select>
              
              <label className={styles.label}>Additional details (optional):</label>
              <textarea
                value={flagDescription}
                onChange={(e) => setFlagDescription(e.target.value)}
                placeholder="Please provide more context..."
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setFlaggingPost(null)}>
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => handleFlagPost(flaggingPost)}
              >
                <AlertTriangle size={16} /> Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Comment Modal */}
      {flaggingComment && (
        <div className={styles.modalOverlay} onClick={() => setFlaggingComment(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                <Flag size={20} /> Report Comment
              </h4>
              <button className={styles.modalCloseButton} onClick={() => setFlaggingComment(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>Reason for reporting:</label>
              <select 
                value={flagReason} 
                onChange={(e) => setFlagReason(e.target.value)}
                className={styles.select}
              >
                <option value="spam">Spam</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech</option>
                <option value="inappropriate_content">Inappropriate content</option>
                <option value="misinformation">Misinformation</option>
                <option value="violence">Violence or threats</option>
                <option value="other">Other</option>
              </select>
              
              <label className={styles.label}>Additional details (optional):</label>
              <textarea
                value={flagDescription}
                onChange={(e) => setFlagDescription(e.target.value)}
                placeholder="Please provide more context..."
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setFlaggingComment(null)}>
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => handleFlagComment(flaggingComment)}
              >
                <AlertTriangle size={16} /> Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag User Modal */}
      {flaggingUser && (
        <div className={styles.modalOverlay} onClick={() => setFlaggingUser(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                <AlertTriangle size={20} /> Report User
              </h4>
              <button className={styles.modalCloseButton} onClick={() => setFlaggingUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>Reason for reporting:</label>
              <select 
                value={flagReason} 
                onChange={(e) => setFlagReason(e.target.value)}
                className={styles.select}
              >
                <option value="spam">Spam account</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech</option>
                <option value="impersonation">Impersonation</option>
                <option value="inappropriate_content">Posting inappropriate content</option>
                <option value="bot_account">Suspicious bot activity</option>
                <option value="other">Other</option>
              </select>
              
              <label className={styles.label}>Additional details (optional):</label>
              <textarea
                value={flagDescription}
                onChange={(e) => setFlagDescription(e.target.value)}
                placeholder="Please provide more context..."
                className={styles.textarea}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setFlaggingUser(null)}>
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={() => handleFlagUser(flaggingUser)}
              >
                <AlertTriangle size={16} /> Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>Delete Post?</h4>
              <button className={styles.modalCloseButton} onClick={() => setShowDeleteModal(null)}>
                <X size={20} />
              </button>
            </div>
            <p className={styles.modalText}>
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowDeleteModal(null)}>
                Cancel
              </button>
              <button
                className={styles.deleteConfirmButton}
                onClick={() => handleDeletePost(showDeleteModal)}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Post Modal */}
      {showConfirmPost && (
        <div className={styles.modalOverlay} onClick={() => !isPosting && setShowConfirmPost(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.modalTitle}>Post this update?</h4>
            <p className={styles.modalText}>A quick confirmation before posting.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setShowConfirmPost(false)} disabled={isPosting}>Cancel</button>
              <button className={styles.saveButton} onClick={handleCreatePost} disabled={isPosting}>
                {isPosting ? 'Posting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowShareModal(null); setShareSearchQuery(''); setShareSearchResults([]); setShareComment('') }}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareModalBody}>
              {/* Search Users with Close Button */}
              <div className={styles.searchRow}>
                <div className={styles.shareSearchContainerWrapper}>
                  <div className={styles.shareSearchContainer}>
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search"
                      value={shareSearchQuery}
                      onChange={(e) => setShareSearchQuery(e.target.value)}
                      className={styles.shareSearchInput}
                    />
                  </div>
                  {/* Search Results Dropdown */}
                  {shareSearchQuery.trim() !== '' && shareSearchResults.length > 0 && (
                    <div className={styles.shareSearchResults}>
                      {shareSearchResults.map((searchUser) => (
                        <button
                          key={searchUser.id}
                          className={styles.shareSearchResultItem}
                          onClick={() => handleSharePost(showShareModal, 'user', searchUser.id)}
                          disabled={sharingToUser === searchUser.id}
                        >
                          <div className={styles.searchResultAvatar}>
                            {searchUser.avatar_url ? (
                              <img src={searchUser.avatar_url} alt={searchUser.username} />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                {(searchUser.display_name || searchUser.username)[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className={styles.searchResultInfo}>
                            <div className={styles.searchResultName}>
                              {searchUser.display_name || searchUser.username}
                              {searchUser.is_premium && <Crown size={14} className={styles.premiumBadge} />}
                            </div>
                            <div className={styles.searchResultUsername}>@{searchUser.username}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className={styles.shareModalCloseButton} onClick={() => { setShowShareModal(null); setShareSearchQuery(''); setShareSearchResults([]); setShareComment('') }}>
                  <X size={20} />
                </button>
              </div>

              {/* Share Comment - Facebook Style */}
              <div className={styles.shareCommentContainer}>
                <textarea
                  placeholder="Say something about this..."
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  className={styles.shareCommentInput}
                  rows={3}
                />
              </div>

              {/* Share with text */}
              <div className={styles.shareWithLabel}>Share with</div>

              {/* User Suggestions Row */}
              {shareSearchQuery.trim() === '' && suggestedUsers.length > 0 && (
                <div className={styles.suggestedUsersRow}>
                  {suggestedUsers.map((suggestedUser) => (
                    <button
                      key={suggestedUser.id}
                      className={styles.suggestedUserButton}
                      onClick={() => handleSharePost(showShareModal, 'user', suggestedUser.id)}
                      disabled={sharingToUser === suggestedUser.id}
                    >
                      <div className={styles.suggestedUserAvatar}>
                        {suggestedUser.avatar_url ? (
                          <img src={suggestedUser.avatar_url} alt={suggestedUser.username} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {(suggestedUser.display_name || suggestedUser.username)[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={styles.suggestedUsername}>@{suggestedUser.username}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Post Link with Copy Button */}
              <div className={styles.postLinkContainer}>
                <div className={styles.postLinkBox}>
                  {`${window.location.origin}/post/${showShareModal}`}
                </div>
                <button
                  className={styles.copyLinkButtonAlt}
                  onClick={() => handleSharePost(showShareModal, 'copy')}
                >
                  <Link size={16} />
                  Copy
                </button>
              </div>

              {/* Share Links */}
              <div className={styles.shareLinksSection}>
                <div className={styles.shareLinksLabel}>Share links</div>
                <div className={styles.sharePlatformIcons}>
                  <button
                    className={styles.platformIconButton}
                    onClick={() => handleSharePost(showShareModal, 'copy')}
                  >
                    <div className={styles.platformIcon}>
                      <Link size={20} />
                    </div>
                    <span>Copy Link</span>
                  </button>
                  <button
                    className={styles.platformIconButton}
                    onClick={() => handleSharePost(showShareModal, 'facebook')}
                  >
                    <div className={`${styles.platformIcon} ${styles.facebookIcon}`}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <span>Facebook</span>
                  </button>
                  <button
                    className={styles.platformIconButton}
                    onClick={() => handleSharePost(showShareModal, 'whatsapp')}
                  >
                    <div className={`${styles.platformIcon} ${styles.whatsappIcon}`}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span>WhatsApp</span>
                  </button>
                  <button
                    className={styles.platformIconButton}
                    onClick={() => handleSharePost(showShareModal, 'twitter')}
                  >
                    <div className={`${styles.platformIcon} ${styles.xIcon}`}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    <span>X</span>
                  </button>
                  <button
                    className={styles.platformIconButton}
                    onClick={() => handleSharePost(showShareModal, 'instagram')}
                  >
                    <div className={styles.platformIcon}>
                      <Instagram size={20} />
                    </div>
                    <span>Instagram</span>
                  </button>
                </div>
              </div>
              
              {/* Share to Profile Button */}
              <button
                className={styles.shareToProfileButton}
                onClick={() => {
                  if (user && showShareModal) {
                    handleSharePost(showShareModal, 'user', user.id)
                  }
                }}
                disabled={sharingToUser === user?.id}
              >
                <Share2 size={16} />
                Share to My Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posted Toast */}
      {showPostedToast && (
        <div className={styles.toast}>
          Post published
        </div>
      )}
    </div>
  )
}

