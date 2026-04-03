'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useAuth } from '@/app/context/AuthContext'

/**
 * Hook that tracks post impressions (views) for the engagement predictor.
 * Uses IntersectionObserver to detect when posts become visible.
 */
export function useEngagementTracker() {
  const { user } = useAuth()
  const trackedRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Batch-send impressions every 3 seconds
  const flush = useCallback(async () => {
    if (queueRef.current.length === 0) return
    const batch = [...queueRef.current]
    queueRef.current = []

    try {
      await Promise.all(
        batch.map(postId =>
          fetch('/api/engagement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, user_id: user?.id || null }),
          })
        )
      )
    } catch {
      // Silently fail — impressions are best-effort
    }
  }, [user])

  useEffect(() => {
    timerRef.current = setInterval(flush, 3000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      flush() // flush remaining on unmount
    }
  }, [flush])

  /** Call this when a post becomes visible in the viewport */
  const trackImpression = useCallback((postId: string) => {
    if (trackedRef.current.has(postId)) return
    trackedRef.current.add(postId)
    queueRef.current.push(postId)
  }, [])

  /**
   * Ref callback for IntersectionObserver.
   * Attach to each post element: ref={observePost(post.id)}
   */
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementMapRef = useRef<Map<Element, string>>(new Map())

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const postId = elementMapRef.current.get(entry.target)
            if (postId) trackImpression(postId)
          }
        }
      },
      { threshold: 0.5 }
    )
    return () => observerRef.current?.disconnect()
  }, [trackImpression])

  const observePost = useCallback(
    (postId: string) => (el: HTMLElement | null) => {
      if (!el || !observerRef.current) return
      elementMapRef.current.set(el, postId)
      observerRef.current.observe(el)
    },
    []
  )

  return { trackImpression, observePost }
}

/**
 * Fetch recommended / trending posts from the engagement predictor API.
 */
export async function fetchRecommended(
  action: 'recommended' | 'trending' = 'recommended',
  limit = 10
): Promise<{ post_id: string; overall_score: number; trending_score: number }[]> {
  try {
    const res = await fetch(`/api/engagement?action=${action}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.posts || []
  } catch {
    return []
  }
}
