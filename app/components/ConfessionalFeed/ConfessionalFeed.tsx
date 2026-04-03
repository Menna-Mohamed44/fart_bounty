import { useState, useEffect, FormEvent, useCallback } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient, Tables } from '@/app/lib/supabaseClient'
import VideoPlayer from './VideoPlayer'
import styles from './ConfessionalFeed.module.css'

const supabase = createClient()

type ConfessionalCommentRow = Tables<'confessional_comments'>

interface ConfessionalComment extends Pick<ConfessionalCommentRow, 'id' | 'confessional_id' | 'user_id' | 'content' | 'created_at'> {}

interface Confessional {
  id: string
  video_path: string
  thumbnail_path: string
  duration_seconds: number
  blur_level: number
  voice_effects: unknown
  created_at: string
  user_id: string
  reaction_counts: { [key: string]: number }
  user_reaction?: string
  comments: ConfessionalComment[]
  comment_count: number
}

interface ConfessionalReaction {
  reaction_type: string
  count: number
}

export default function ConfessionalFeed() {
  const { user } = useAuth()
  const [confessionals, setConfessionals] = useState<Confessional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({})

  const fetchConfessionals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch recent public confessionals with reaction counts
      const { data: confessionalsData, error: confessionalsError } = await supabase
        .from('confessionals')
        .select(`
          id,
          video_path,
          thumbnail_path,
          duration_seconds,
          blur_level,
          voice_effects,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (confessionalsError) {
        throw confessionalsError
      }

      if (!confessionalsData) {
        setConfessionals([])
        return
      }

      const confessionalIds = confessionalsData.map((confessional) => confessional.id)

      let commentsByConfessional: Record<string, ConfessionalComment[]> = {}

      if (confessionalIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('confessional_comments')
          .select('id, confessional_id, user_id, content, created_at')
          .in('confessional_id', confessionalIds)
          .order('created_at', { ascending: false })

        if (commentsError) {
          console.error('Error fetching comments:', commentsError)
        } else if (commentsData) {
          commentsData.forEach((comment) => {
            const confessionalId = comment.confessional_id
            if (!confessionalId) return

            if (!commentsByConfessional[confessionalId]) {
              commentsByConfessional[confessionalId] = []
            }

            commentsByConfessional[confessionalId].push({
              id: comment.id,
              confessional_id: confessionalId,
              user_id: comment.user_id,
              content: comment.content,
              created_at: comment.created_at
            })
          })
        }
      }

      // For each confessional, get reaction counts and user's reaction
      const confessionalsWithReactions = await Promise.all(
        confessionalsData.map(async (confessional) => {
          // Get reaction counts
          const { data: reactions, error: reactionsError } = await supabase
            .from('confessional_reactions')
            .select('reaction_type')
            .eq('confessional_id', confessional.id)

          if (reactionsError) {
            console.error('Error fetching reactions:', reactionsError)
          }

          // Count reactions by type
          const reactionCounts: { [key: string]: number } = {}
          if (reactions) {
            reactions.forEach(reaction => {
              reactionCounts[reaction.reaction_type] = (reactionCounts[reaction.reaction_type] || 0) + 1
            })
          }

          // Get user's reaction if logged in
          let userReaction: string | undefined
          if (user) {
            const { data: userReactionData } = await supabase
              .from('confessional_reactions')
              .select('reaction_type')
              .eq('confessional_id', confessional.id)
              .eq('user_id', user.id)
              .single()

            userReaction = userReactionData?.reaction_type
          }

          return {
            ...confessional,
            reaction_counts: reactionCounts,
            user_reaction: userReaction,
            comments: commentsByConfessional[confessional.id] || [],
            comment_count: commentsByConfessional[confessional.id]?.length || 0
          }
        })
      )

      setConfessionals(confessionalsWithReactions)
    } catch (err) {
      console.error('Error fetching confessionals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load confessionals')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchConfessionals()
  }, [fetchConfessionals])

  const handleReaction = async (confessionalId: string, reactionType: string) => {
    if (!user) return

    try {
      // Check if user already reacted
      const { data: existingReaction } = await supabase
        .from('confessional_reactions')
        .select('id, reaction_type')
        .eq('confessional_id', confessionalId)
        .eq('user_id', user.id)
        .single()

      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction if clicking the same one
          await supabase
            .from('confessional_reactions')
            .delete()
            .eq('id', existingReaction.id)

          // Update local state
          setConfessionals(prev =>
            prev.map(c =>
              c.id === confessionalId
                ? {
                    ...c,
                    reaction_counts: {
                      ...c.reaction_counts,
                      [reactionType]: Math.max(0, (c.reaction_counts[reactionType] || 0) - 1)
                    },
                    user_reaction: undefined
                  }
                : c
            )
          )
        } else {
          // Update reaction if clicking a different one
          await supabase
            .from('confessional_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id)

          // Update local state
          setConfessionals(prev =>
            prev.map(c => {
              if (c.id === confessionalId) {
                const newCounts = { ...c.reaction_counts }
                newCounts[existingReaction.reaction_type] = Math.max(0, (newCounts[existingReaction.reaction_type] || 0) - 1)
                newCounts[reactionType] = (newCounts[reactionType] || 0) + 1

                return {
                  ...c,
                  reaction_counts: newCounts,
                  user_reaction: reactionType
                }
              }
              return c
            })
          )
        }
      } else {
        // Add new reaction
        await supabase
          .from('confessional_reactions')
          .insert({
            confessional_id: confessionalId,
            user_id: user.id,
            reaction_type: reactionType
          })

        // Update local state
        setConfessionals(prev =>
          prev.map(c =>
            c.id === confessionalId
              ? {
                  ...c,
                  reaction_counts: {
                    ...c.reaction_counts,
                    [reactionType]: (c.reaction_counts[reactionType] || 0) + 1
                  },
                  user_reaction: reactionType
                }
              : c
          )
        )
      }
    } catch (err) {
      console.error('Error handling reaction:', err)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const createdAt = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const toggleComments = (confessionalId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [confessionalId]: !prev[confessionalId]
    }))
  }

  const handleCommentInputChange = (confessionalId: string, value: string) => {
    setCommentInputs((prev) => ({
      ...prev,
      [confessionalId]: value
    }))
  }

  const handleCommentSubmit = async (confessionalId: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) return

    const content = (commentInputs[confessionalId] || '').trim()
    if (!content) return

    setCommentSubmitting((prev) => ({
      ...prev,
      [confessionalId]: true
    }))

    try {
      const { data, error } = await supabase
        .from('confessional_comments')
        .insert({
          confessional_id: confessionalId,
          user_id: user.id,
          content
        })
        .select('id, confessional_id, user_id, content, created_at')

      if (error || !data || data.length === 0) {
        console.error('Error submitting comment:', error || 'No data returned from insert')
        return
      }

      const insertedComment = data[0]

      setConfessionals((prev) =>
        prev.map((confessional) =>
          confessional.id === confessionalId
            ? {
                ...confessional,
                comments: [
                  {
                    id: insertedComment.id,
                    confessional_id: confessionalId,
                    user_id: insertedComment.user_id,
                    content: insertedComment.content,
                    created_at: insertedComment.created_at
                  },
                  ...confessional.comments
                ],
                comment_count: confessional.comment_count + 1
              }
            : confessional
        )
      )

      setCommentInputs((prev) => ({
        ...prev,
        [confessionalId]: ''
      }))
    } catch (submissionError) {
      console.error('Unexpected error submitting comment:', submissionError)
    } finally {
      setCommentSubmitting((prev) => ({
        ...prev,
        [confessionalId]: false
      }))
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading confessionals...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Recent Confessionals</h2>
        <p>Anonymous thoughts from the community</p>
      </div>

      {confessionals.length === 0 ? (
        <div className={styles.empty}>
          <p>No confessionals yet. Be the first to share!</p>
        </div>
      ) : (
        <div className={styles.feed}>
          {confessionals.map((confessional) => (
            <div key={confessional.id} className={styles.confessionalCard}>
              <div className={styles.videoContainer}>
                <VideoPlayer
                  src={confessional.video_path}
                  poster={confessional.thumbnail_path}
                  blurLevel={confessional.blur_level}
                  className={styles.video}
                />
              </div>

              <div className={styles.confessionalInfo}>
                <div className={styles.meta}>
                  <span className={styles.anonymous}>Anonymous</span>
                  <span className={styles.timeAgo}>{formatTimeAgo(confessional.created_at)}</span>
                </div>

                <div className={styles.actionsRow}>
                  {user && (
                    <div className={styles.reactions}>
                      {(['heart', 'laugh', 'vomit', 'cry'] as const).map((reactionType) => (
                        <button
                          key={reactionType}
                          className={`${styles.reactionButton} ${
                            confessional.user_reaction === reactionType ? styles.active : ''
                          }`}
                          onClick={() => handleReaction(confessional.id, reactionType)}
                          title={reactionType}
                        >
                          <span className={styles.reactionEmoji}>
                            {reactionType === 'heart' ? '❤️' :
                             reactionType === 'laugh' ? '😂' :
                             reactionType === 'vomit' ? '🤮' : '😢'}
                          </span>
                          <span className={styles.reactionCount}>
                            {confessional.reaction_counts[reactionType] || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    className={styles.commentToggle}
                    onClick={() => toggleComments(confessional.id)}
                    type="button"
                  >
                    💬 {expandedComments[confessional.id] ? 'Hide comments' : 'Comments'} ({confessional.comment_count})
                  </button>
                </div>

                {expandedComments[confessional.id] && (
                  <div className={styles.commentsPanel}>
                    {confessional.comments.length > 0 ? (
                      <ul className={styles.commentList}>
                        {confessional.comments.map((comment) => (
                          <li key={comment.id} className={styles.commentItem}>
                            <div className={styles.commentMeta}>
                              <span>Anonymous</span>
                              <span>{formatTimeAgo(comment.created_at)}</span>
                            </div>
                            <p className={styles.commentContent}>{comment.content}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noComments}>No comments yet. Be the first to share a thought.</p>
                    )}

                    {user ? (
                      <form
                        className={styles.commentForm}
                        onSubmit={(event) => handleCommentSubmit(confessional.id, event)}
                      >
                        <textarea
                          className={styles.commentTextarea}
                          placeholder="Drop your anonymous reaction..."
                          value={commentInputs[confessional.id] || ''}
                          onChange={(event) => handleCommentInputChange(confessional.id, event.target.value)}
                          maxLength={280}
                          rows={2}
                        />
                        <button
                          type="submit"
                          className={styles.commentSubmit}
                          disabled={commentSubmitting[confessional.id] || !(commentInputs[confessional.id] || '').trim()}
                        >
                          {commentSubmitting[confessional.id] ? 'Posting...' : 'Post Comment'}
                        </button>
                      </form>
                    ) : (
                      <p className={styles.loginNotice}>Sign in to leave a comment.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
