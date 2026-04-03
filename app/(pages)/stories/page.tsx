'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import {
    Heart,
    MessageCircle,
    BookOpen,
    Plus,
    X,
    ChevronRight,
    Filter
} from 'lucide-react'
import styles from './stories.module.css'

type CategoryType = 'all' | 'fiction' | 'non-fiction'

interface Story {
    id: string
    user_id: string
    title: string
    content: string
    category: 'fiction' | 'non-fiction'
    created_at: string
    user: {
        username: string
        display_name: string | null
        is_premium: boolean
        avatar_url: string | null
    }
    reactions?: Record<string, number>
    user_reaction?: string | null
}

interface StoryFormData {
    title: string
    content: string
    category: 'fiction' | 'non-fiction'
}

const REACTION_TYPES = [
    { type: 'heart', emoji: '❤️', label: 'Heart' },
    { type: 'laugh', emoji: '😂', label: 'Laugh' },
    { type: 'vomit', emoji: '🤮', label: 'Vomit' },
    { type: 'cry', emoji: '😢', label: 'Cry' }
] as const

export default function StoriesPage() {
    const router = useRouter()
    const { user } = useAuth()
    const supabase = createClient()

    const [activeCategory, setActiveCategory] = useState<CategoryType>('all')
    const [stories, setStories] = useState<Story[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedStory, setExpandedStory] = useState<string | null>(null)

    // Story creation
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState<StoryFormData>({
        title: '',
        content: '',
        category: 'fiction'
    })

    // Story editing
    const [editingStory, setEditingStory] = useState<string | null>(null)
    const [editFormData, setEditFormData] = useState<StoryFormData>({
        title: '',
        content: '',
        category: 'fiction'
    })
    const [isEditing, setIsEditing] = useState(false)

    // Delete confirmation modal
    const [deleteStoryId, setDeleteStoryId] = useState<string | null>(null)

    // Infinite scroll
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [isFetchingMore, setIsFetchingMore] = useState(false)
    const pageSize = 10
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const maxContentLength = 2500
    const previewLength = 300

    // Reset when category changes
    useEffect(() => {
        if (!user) return
        setStories([])
        setPage(0)
        setHasMore(true)
        setLoading(true)
        fetchStories(0)
    }, [activeCategory, user])

    // Infinite scroll observer
    useEffect(() => {
        if (!hasMore || loading || !user) return
        const el = sentinelRef.current
        if (!el) return
        const obs = new IntersectionObserver((entries) => {
            const entry = entries[0]
            if (entry.isIntersecting && !isFetchingMore) {
                fetchStories(page)
            }
        }, { root: null, rootMargin: '200px', threshold: 0 })
        obs.observe(el)
        return () => obs.disconnect()
    }, [hasMore, page, isFetchingMore, loading, user])

    const fetchStories = async (pageToFetch: number) => {
        if (!user) return
        if (pageToFetch === 0) setLoading(true)
        else setIsFetchingMore(true)

        try {
            let query = supabase
                .from('stories')
                .select(`
          id,
          user_id,
          title,
          content,
          category,
          created_at,
          users!inner(username, display_name, is_premium, avatar_url)
        `)
                .order('created_at', { ascending: false })

            // Filter by category
            if (activeCategory !== 'all') {
                query = query.eq('category', activeCategory)
            }

            const from = pageToFetch * pageSize
            const to = from + pageSize - 1
            const { data: storiesData, error } = await query.range(from, to)

            if (error) throw error

            // Fetch reactions for each story
            const storiesWithReactions = await Promise.all(
                (storiesData || []).map(async (story: any) => {
                    // Get reaction counts
                    const { data: reactionCounts } = await supabase
                        .from('story_reactions')
                        .select('reaction_type')
                        .eq('story_id', story.id)

                    const reactions: Record<string, number> = reactionCounts?.reduce((acc: Record<string, number>, r) => {
                        acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
                        return acc
                    }, { heart: 0, laugh: 0, vomit: 0, cry: 0 } as Record<string, number>) || { heart: 0, laugh: 0, vomit: 0, cry: 0 }

                    // Get user's reaction
                    const { data: userReaction } = await supabase
                        .from('story_reactions')
                        .select('reaction_type')
                        .eq('story_id', story.id)
                        .eq('user_id', user.id)
                        .single()

                    return {
                        ...story,
                        user: story.users,
                        reactions,
                        user_reaction: userReaction?.reaction_type || null
                    }
                })
            )

            // Append or set
            setStories(prev => pageToFetch === 0 ? storiesWithReactions : [...prev, ...storiesWithReactions])
            if (!storiesData || storiesData.length < pageSize) {
                setHasMore(false)
            }
            if (storiesData && storiesData.length > 0) {
                setPage(pageToFetch + 1)
            }
        } catch (error) {
            console.error('Error fetching stories:', error)
        } finally {
            setLoading(false)
            setIsFetchingMore(false)
        }
    }

    const handleCreateStory = async () => {
        if (!user || !formData.title.trim() || !formData.content.trim()) return
        if (formData.content.length < 300 || formData.content.length > maxContentLength) return

        setIsCreating(true)
        try {
            const { error } = await supabase
                .from('stories')
                .insert({
                    user_id: user.id,
                    title: formData.title.trim(),
                    content: formData.content.trim(),
                    category: formData.category
                })

            if (error) throw error

            // Reset form and close modal
            setFormData({ title: '', content: '', category: 'fiction' })
            setShowCreateModal(false)

            // Refresh stories
            setStories([])
            setPage(0)
            setHasMore(true)
            await fetchStories(0)
        } catch (error) {
            console.error('Error creating story:', error)
            alert('Failed to create story')
        } finally {
            setIsCreating(false)
        }
    }

    const handleEditStory = async (storyId: string) => {
        if (!user || !editFormData.title.trim() || !editFormData.content.trim()) return
        if (editFormData.content.length < 300 || editFormData.content.length > maxContentLength) return

        setIsEditing(true)
        try {
            const { error } = await supabase
                .from('stories')
                .update({
                    title: editFormData.title.trim(),
                    content: editFormData.content.trim(),
                    category: editFormData.category
                })
                .eq('id', storyId)
                .eq('user_id', user.id)

            if (error) throw error

            // Update local state
            setStories(prev => prev.map(story =>
                story.id === storyId
                    ? { ...story, title: editFormData.title, content: editFormData.content, category: editFormData.category }
                    : story
            ))

            setEditingStory(null)
            setEditFormData({ title: '', content: '', category: 'fiction' })
        } catch (error) {
            console.error('Error editing story:', error)
            alert('Failed to edit story')
        } finally {
            setIsEditing(false)
        }
    }

    const handleDeleteStory = async (storyId: string) => {
        if (!user) return

        try {
            const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId)
                .eq('user_id', user.id)

            if (error) throw error

            setStories(prev => prev.filter(story => story.id !== storyId))
            setDeleteStoryId(null)
        } catch (error) {
            console.error('Error deleting story:', error)
            alert('Failed to delete story')
        }
    }

    const handleReaction = async (storyId: string, reactionType: string) => {
        if (!user) return

        const story = stories.find(s => s.id === storyId)
        if (!story) return

        try {
            // If user already has this reaction, remove it (un-react)
            if (story.user_reaction === reactionType) {
                await supabase
                    .from('story_reactions')
                    .delete()
                    .eq('story_id', storyId)
                    .eq('user_id', user.id)

                // Update local state
                setStories(prev => prev.map(s =>
                    s.id === storyId
                        ? {
                            ...s,
                            reactions: { ...s.reactions, [reactionType]: s.reactions![reactionType] - 1 },
                            user_reaction: null
                        }
                        : s
                ))
            } else {
                // Remove existing reaction if any
                if (story.user_reaction) {
                    await supabase
                        .from('story_reactions')
                        .delete()
                        .eq('story_id', storyId)
                        .eq('user_id', user.id)
                }

                // Add new reaction
                await supabase
                    .from('story_reactions')
                    .insert({
                        story_id: storyId,
                        user_id: user.id,
                        reaction_type: reactionType
                    })

                // Update local state
                setStories(prev => prev.map(s =>
                    s.id === storyId
                        ? {
                            ...s,
                            reactions: {
                                ...s.reactions,
                                [reactionType]: s.reactions![reactionType] + 1,
                                ...(s.user_reaction ? { [s.user_reaction]: s.reactions![s.user_reaction] - 1 } : {})
                            },
                            user_reaction: reactionType
                        }
                        : s
                ))
            }
        } catch (error) {
            console.error('Error handling reaction:', error)
        }
    }

    const toggleStoryExpansion = (storyId: string) => {
        setExpandedStory(expandedStory === storyId ? null : storyId)
    }

    const getPreviewContent = (content: string) => {
        if (content.length <= previewLength) return content
        return content.substring(0, previewLength) + '...'
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

    if (!user) return null

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Fart Stories</h1>
                </div>

                <div className={styles.categoryTabs}>
                    <button
                        className={`${styles.categoryTab} ${activeCategory === 'all' ? styles.active : ''}`}
                        onClick={() => setActiveCategory('all')}
                    >
                        All
                    </button>
                    <button
                        className={`${styles.categoryTab} ${activeCategory === 'fiction' ? styles.active : ''}`}
                        onClick={() => setActiveCategory('fiction')}
                    >
                        Fiction
                    </button>
                    <button
                        className={`${styles.categoryTab} ${activeCategory === 'non-fiction' ? styles.active : ''}`}
                        onClick={() => setActiveCategory('non-fiction')}
                    >
                        Non-Fiction
                    </button>
                </div>

                <button
                    className={styles.createButton}
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={20} />
                    <span>Write Story</span>
                </button>
            </div>

            {/* Create Story Modal */}
            {showCreateModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Create New Story</h2>
                            <button
                                className={styles.closeButton}
                                onClick={() => setShowCreateModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="title">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    placeholder="Story title..."
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    maxLength={100}
                                    className={styles.input}
                                />
                                <div className={styles.charCount}>{formData.title.length} / 100</div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="category">Category</label>
                                <select
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as 'fiction' | 'non-fiction' }))}
                                    className={styles.select}
                                >
                                    <option value="fiction">Fiction</option>
                                    <option value="non-fiction">Non-Fiction</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="content">Content</label>
                                <textarea
                                    id="content"
                                    placeholder="Write your story..."
                                    value={formData.content}
                                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                    maxLength={maxContentLength}
                                    className={styles.textarea}
                                    rows={12}
                                />
                                <div className={`${styles.charCount} ${formData.content.length > maxContentLength ? styles.overLimit : ''} ${formData.content.length >= 300 && formData.content.length <= maxContentLength ? styles.meetsMinimum : ''}`}>
                                    {formData.content.length} / {maxContentLength} {formData.content.length >= 300 ? '(✓)' : '(min 300)'}
                                </div>
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.submitButton}
                                    onClick={handleCreateStory}
                                    disabled={!formData.title.trim() || !formData.content.trim() || formData.content.length < 300 || formData.content.length > maxContentLength || isCreating}
                                >
                                    {isCreating ? 'Creating...' : 'Create Story'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteStoryId && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Delete Story</h2>
                            <button
                                className={styles.closeButton}
                                onClick={() => setDeleteStoryId(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.confirmationContent}>
                            <p>Are you sure you want to delete this story? This action cannot be undone.</p>
                            <div className={styles.confirmationActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setDeleteStoryId(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.confirmDeleteButton}
                                    onClick={() => handleDeleteStory(deleteStoryId)}
                                >
                                    Delete Story
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stories Feed */}
            <div className={styles.feed}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonStory}>
                                <div className={styles.skeletonAvatar} />
                                <div className={styles.skeletonContent}>
                                    <div className={styles.skeletonLine} style={{ width: '70%', height: '1.5rem' }} />
                                    <div className={styles.skeletonLine} style={{ width: '50%', height: '1rem' }} />
                                    <div className={styles.skeletonLine} style={{ width: '80%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '60%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : stories.length === 0 ? (
                    <div className={styles.emptyState}>
                        <BookOpen size={48} />
                        <h3>No stories yet</h3>
                        <p>Be the first to share a story!</p>
                    </div>
                ) : (
                    <>
                        {stories.map((story) => (
                            <div key={story.id} className={styles.story}>
                                <div className={styles.storyHeader}>
                                    <div className={styles.userInfo}>
                                        <div className={styles.avatar}>
                                            {story.user.avatar_url ? (
                                                <img src={story.user.avatar_url} alt={`${story.user.display_name || story.user.username}'s avatar`} />
                                            ) : (
                                                <div className={styles.avatarPlaceholder}>
                                                    {(story.user.display_name || story.user.username)[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.userDetails}>
                                            <div className={styles.displayName}>
                                                <span onClick={() => router.push(`/${story.user.username}`)}>
                                                    {story.user.display_name || story.user.username}
                                                </span>
                                                {story.user.is_premium && <span className={styles.premiumBadge}>★</span>}
                                            </div>
                                            <div className={styles.storyMeta}>
                                                <span className={styles.username}>@{story.user.username}</span>
                                                <span className={styles.category}>{story.category}</span>
                                                <span className={styles.timestamp}>· {formatTime(story.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {story.user_id === user.id && (
                                        <div className={styles.storyActions}>
                                            <button
                                                className={styles.editButton}
                                                onClick={() => {
                                                    setEditingStory(story.id)
                                                    setEditFormData({
                                                        title: story.title,
                                                        content: story.content,
                                                        category: story.category
                                                    })
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className={styles.deleteButton}
                                                onClick={() => setDeleteStoryId(story.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.storyContent}>
                                    <h3 className={styles.storyTitle}>{story.title}</h3>

                                    {editingStory === story.id ? (
                                        <div className={styles.editForm}>
                                            <input
                                                type="text"
                                                placeholder="Story title..."
                                                value={editFormData.title}
                                                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                                                maxLength={100}
                                                className={styles.input}
                                            />
                                            <select
                                                value={editFormData.category}
                                                onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value as 'fiction' | 'non-fiction' }))}
                                                className={styles.select}
                                            >
                                                <option value="fiction">Fiction</option>
                                                <option value="non-fiction">Non-Fiction</option>
                                            </select>
                                            <textarea
                                                placeholder="Story content..."
                                                value={editFormData.content}
                                                onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                                                maxLength={maxContentLength}
                                                className={styles.textarea}
                                                rows={8}
                                            />
                                            <div className={`${styles.charCount} ${editFormData.content.length > maxContentLength ? styles.overLimit : ''} ${editFormData.content.length >= 300 && editFormData.content.length <= maxContentLength ? styles.meetsMinimum : ''}`}>
                                                {editFormData.content.length} / {maxContentLength} {editFormData.content.length >= 300 ? '(✓)' : '(min 300)'}
                                            </div>
                                            <div className={styles.editActions}>
                                                <button
                                                    className={styles.cancelButton}
                                                    onClick={() => setEditingStory(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className={styles.saveButton}
                                                    onClick={() => handleEditStory(story.id)}
                                                    disabled={!editFormData.title.trim() || !editFormData.content.trim() || editFormData.content.length < 300 || editFormData.content.length > maxContentLength || isEditing}
                                                >
                                                    {isEditing ? 'Saving...' : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.content}>
                                                {expandedStory === story.id ? story.content : getPreviewContent(story.content)}
                                            </div>

                                            {story.content.length > previewLength && (
                                                <button
                                                    className={styles.readMoreButton}
                                                    onClick={() => toggleStoryExpansion(story.id)}
                                                >
                                                    {expandedStory === story.id ? 'Show Less' : 'Read More'}
                                                    <ChevronRight size={16} className={expandedStory === story.id ? styles.rotated : ''} />
                                                </button>
                                            )}

                                            <div className={styles.reactions}>
                                                {REACTION_TYPES.map(({ type, emoji }) => (
                                                    <button
                                                        key={type}
                                                        className={`${styles.reactionButton} ${story.user_reaction === type ? styles.active : ''}`}
                                                        onClick={() => handleReaction(story.id, type)}
                                                        title={`${emoji} ${type}`}
                                                    >
                                                        <span className={styles.reactionEmoji}>{emoji}</span>
                                                        <span className={styles.reactionCount}>{story.reactions?.[type] || 0}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Infinite scroll sentinel */}
                        {hasMore && (
                            <div ref={sentinelRef} className={styles.sentinel} />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}