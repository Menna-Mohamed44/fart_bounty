'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import {
  ChevronDown, Plus, Flame, ThumbsDown, Share2,
  Loader2, PenLine, Sparkles, FolderOpen, BookOpen, ChevronRight, X, Copy, Check
} from 'lucide-react'
import styles from './fart-jokes.module.css'

interface Joke {
  id: string
  user_id: string
  setup: string
  punchline: string
  fire_count: number
  dislike_count: number
  created_at: string
  username?: string
}

type ViewMode = 'normal' | 'swipe'
type SortMode = 'newest' | 'oldest' | 'top' | 'controversial'
type ModalStep = null | 'choose' | 'write' | 'generate' | 'share'

const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  top: 'Top Rated',
  controversial: 'Controversial',
}

function FartJokesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const [viewMode, setViewMode] = useState<ViewMode>('normal')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [modalStep, setModalStep] = useState<ModalStep>(null)
  const [shareTarget, setShareTarget] = useState<Joke | null>(null)
  const [copied, setCopied] = useState(false)

  const [jokes, setJokes] = useState<Joke[]>([])
  const [reactions, setReactions] = useState<Map<string, 'fire' | 'dislike'>>(new Map())
  const [loading, setLoading] = useState(true)
  const [reactionLoading, setReactionLoading] = useState<Set<string>>(new Set())

  // Write joke state
  const [writeSetup, setWriteSetup] = useState('')
  const [writePunch, setWritePunch] = useState('')
  const [publishing, setPublishing] = useState(false)

  // AI generate state
  const [aiTopic, setAiTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<{ setup: string; punchline: string } | null>(null)

  // Swipe / Archive state
  const [archiveMonths, setArchiveMonths] = useState<{ label: string; year: number; month: number; count: number }[]>([])
  const [activeMonth, setActiveMonth] = useState<{ year: number; month: number } | null>(null)
  const [monthJokes, setMonthJokes] = useState<Joke[]>([])
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [monthLoading, setMonthLoading] = useState(false)
  const swipeRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const sortRef = useRef<HTMLDivElement>(null)

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return
    const handle = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showSortMenu])

  // ── Fetch jokes ──
  const fetchJokes = useCallback(async () => {
    setLoading(true)
    try {
      let order: { column: string; ascending: boolean } = { column: 'created_at', ascending: false }
      if (sortMode === 'oldest') order = { column: 'created_at', ascending: true }
      if (sortMode === 'top') order = { column: 'fire_count', ascending: false }
      if (sortMode === 'controversial') order = { column: 'dislike_count', ascending: false }

      const { data, error } = await supabase
        .from('fart_jokes')
        .select('*')
        .eq('deleted', false)
        .order(order.column, { ascending: order.ascending })
        .limit(60)

      if (error) throw error

      // Fetch usernames
      const userIds = [...new Set((data || []).map(j => j.user_id))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, username')
          .in('id', userIds)
        if (users) {
          userMap = Object.fromEntries(users.map(u => [u.id, u.username]))
        }
      }

      setJokes((data || []).map(j => ({ ...j, username: userMap[j.user_id] || 'anonymous' })))
    } catch (err) {
      console.error('Failed to fetch jokes:', err)
    } finally {
      setLoading(false)
    }
  }, [sortMode])

  // ── Fetch user reactions ──
  const fetchReactions = useCallback(async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('fart_joke_reactions')
        .select('joke_id, reaction_type')
        .eq('user_id', user.id)
      if (data) {
        const map = new Map<string, 'fire' | 'dislike'>()
        data.forEach(r => map.set(r.joke_id, r.reaction_type as 'fire' | 'dislike'))
        setReactions(map)
      }
    } catch (err) {
      console.error('Failed to fetch reactions:', err)
    }
  }, [user])

  useEffect(() => {
    fetchJokes()
  }, [fetchJokes])

  useEffect(() => {
    fetchReactions()
  }, [fetchReactions])

  // ── Fetch archive months ──
  useEffect(() => {
    if (viewMode !== 'swipe') return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('fart_jokes')
          .select('created_at')
          .eq('deleted', false)
          .order('created_at', { ascending: false })

        if (!data || data.length === 0) { setArchiveMonths([]); return }

        const map = new Map<string, number>()
        data.forEach(j => {
          const d = new Date(j.created_at)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          map.set(key, (map.get(key) || 0) + 1)
        })

        const months = Array.from(map.entries()).map(([key, count]) => {
          const [year, month] = key.split('-').map(Number)
          const label = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
          return { label, year, month, count }
        })

        setArchiveMonths(months)
      } catch (err) {
        console.error('Failed to fetch archive months:', err)
      }
    })()
  }, [viewMode])

  // ── Fetch jokes for a month ──
  const openMonth = async (year: number, month: number) => {
    setActiveMonth({ year, month })
    setSwipeIndex(0)
    setMonthLoading(true)
    try {
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 1).toISOString()

      const { data } = await supabase
        .from('fart_jokes')
        .select('*')
        .eq('deleted', false)
        .gte('created_at', start)
        .lt('created_at', end)
        .order('fire_count', { ascending: false })

      const userIds = [...new Set((data || []).map(j => j.user_id))]
      let userMap: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, username').in('id', userIds)
        if (users) userMap = Object.fromEntries(users.map(u => [u.id, u.username]))
      }

      setMonthJokes((data || []).map(j => ({ ...j, username: userMap[j.user_id] || 'anonymous' })))
    } catch (err) {
      console.error('Failed to fetch month jokes:', err)
    } finally {
      setMonthLoading(false)
    }
  }

  // ── React to joke ──
  const handleReaction = async (jokeId: string, type: 'fire' | 'dislike') => {
    if (!user) return
    if (reactionLoading.has(jokeId)) return
    setReactionLoading(prev => new Set(prev).add(jokeId))

    const existing = reactions.get(jokeId)

    try {
      if (existing === type) {
        // Remove reaction
        await supabase.from('fart_joke_reactions').delete().eq('joke_id', jokeId).eq('user_id', user.id)
        // Update count
        const col = type === 'fire' ? 'fire_count' : 'dislike_count'
        const joke = jokes.find(j => j.id === jokeId) || monthJokes.find(j => j.id === jokeId)
        if (joke) {
          await supabase.from('fart_jokes').update({ [col]: Math.max(0, joke[col] - 1) }).eq('id', jokeId)
        }
        setReactions(prev => { const m = new Map(prev); m.delete(jokeId); return m })
        // Local update
        const update = (list: Joke[]) => list.map(j => j.id === jokeId ? { ...j, [col]: Math.max(0, j[col] - 1) } : j)
        setJokes(update)
        setMonthJokes(update)
      } else {
        // If switching reaction, remove old count
        if (existing) {
          const oldCol = existing === 'fire' ? 'fire_count' : 'dislike_count'
          const joke = jokes.find(j => j.id === jokeId) || monthJokes.find(j => j.id === jokeId)
          if (joke) {
            await supabase.from('fart_jokes').update({ [oldCol]: Math.max(0, joke[oldCol] - 1) }).eq('id', jokeId)
          }
          const updateOld = (list: Joke[]) => list.map(j => j.id === jokeId ? { ...j, [oldCol]: Math.max(0, j[oldCol] - 1) } : j)
          setJokes(updateOld)
          setMonthJokes(updateOld)
        }

        // Upsert reaction
        await supabase.from('fart_joke_reactions').upsert(
          { joke_id: jokeId, user_id: user.id, reaction_type: type },
          { onConflict: 'joke_id,user_id' }
        )
        // Update new count
        const newCol = type === 'fire' ? 'fire_count' : 'dislike_count'
        const joke = jokes.find(j => j.id === jokeId) || monthJokes.find(j => j.id === jokeId)
        if (joke) {
          await supabase.from('fart_jokes').update({ [newCol]: (joke[newCol] || 0) + 1 }).eq('id', jokeId)
        }
        setReactions(prev => new Map(prev).set(jokeId, type))
        const updateNew = (list: Joke[]) => list.map(j => j.id === jokeId ? { ...j, [newCol]: (j[newCol] || 0) + 1 } : j)
        setJokes(updateNew)
        setMonthJokes(updateNew)
      }
    } catch (err) {
      console.error('Reaction error:', err)
    } finally {
      setReactionLoading(prev => { const s = new Set(prev); s.delete(jokeId); return s })
    }
  }

  // ── Share joke ──
  const handleShare = (joke: Joke) => {
    setShareTarget(joke)
    setCopied(false)
    setModalStep('share')
  }

  const handleCopyJoke = async () => {
    if (!shareTarget) return
    const text = `${shareTarget.setup}\n${shareTarget.punchline}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = () => {
    if (!shareTarget) return
    const text = `${shareTarget.setup}\n${shareTarget.punchline}`
    navigator.share({ title: 'Fart Joke', text }).catch(() => {})
  }

  // ── Publish joke ──
  const publishJoke = async (setup: string, punchline: string) => {
    if (!user || !setup.trim() || !punchline.trim()) return
    setPublishing(true)
    try {
      const { error } = await supabase.from('fart_jokes').insert({
        user_id: user.id,
        setup: setup.trim(),
        punchline: punchline.trim(),
      })
      if (error) throw error
      setModalStep(null)
      setWriteSetup('')
      setWritePunch('')
      setAiResult(null)
      setAiTopic('')
      fetchJokes()
    } catch (err) {
      console.error('Publish error:', err)
      alert('Failed to publish joke. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  // ── AI Generate ──
  const generateJoke = async () => {
    if (!aiTopic.trim()) return
    setGenerating(true)
    setAiResult(null)
    try {
      // Use a simple deterministic approach with random fart joke templates
      const templates = [
        { setup: `Why did the ${aiTopic} fart at the party?`, punchline: `Because it wanted to clear the room and make a grand exit!` },
        { setup: `What happens when a ${aiTopic} lets one rip?`, punchline: `Everyone blames the dog, but the truth always comes out... just like the gas.` },
        { setup: `How does a ${aiTopic} announce its presence?`, punchline: `With a thunderous boom from the back end — no microphone needed!` },
        { setup: `Why was the ${aiTopic} so embarrassed?`, punchline: `It let out a silent but deadly one during the most awkward moment possible.` },
        { setup: `What did the ${aiTopic} say after a big fart?`, punchline: `"That wasn't me, that was my inner trumpet practicing for the symphony!"` },
        { setup: `Why did the ${aiTopic} go to the doctor?`, punchline: `Because its gas was so powerful it set off the car alarm!` },
        { setup: `What's a ${aiTopic}'s favorite musical instrument?`, punchline: `The tuba — because it already has the sound effects down!` },
        { setup: `Why couldn't the ${aiTopic} keep a secret?`, punchline: `Because every time it tried, the truth slipped out the back door with a bang!` },
      ]
      // Random pick
      const joke = templates[Math.floor(Math.random() * templates.length)]
      // Simulate brief delay for effect
      await new Promise(r => setTimeout(r, 800))
      setAiResult(joke)
    } catch (err) {
      console.error('Generate error:', err)
      alert('Failed to generate joke.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Swipe touch handling ──
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0 && swipeIndex < monthJokes.length - 1) setSwipeIndex(i => i + 1)
      if (diff < 0 && swipeIndex > 0) setSwipeIndex(i => i - 1)
    }
  }

  // ── Mouse drag for desktop swipe ──
  const mouseStartX = useRef(0)
  const isDragging = useRef(false)
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX
    isDragging.current = true
    e.preventDefault()
  }

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return
      isDragging.current = false
      const diff = mouseStartX.current - e.clientX
      if (Math.abs(diff) > 40) {
        if (diff > 0) setSwipeIndex(i => Math.min(i + 1, monthJokes.length - 1))
        if (diff < 0) setSwipeIndex(i => Math.max(i - 1, 0))
      }
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [monthJokes.length])

  // ── Render ──
  return (
    <AuthGate requireAuth promptMessage="Sign in to view Fart Jokes">
      <div className={styles.container}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <button className={styles.backBtn} onClick={() => router.back()} aria-label="Go back">
              <ChevronRight size={22} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <h1 className={styles.pageTitle}>{viewMode === 'swipe' ? 'Jokes Archive' : 'Fart Jokes'}</h1>
          </div>
          <div className={styles.topRight}>
            {/* Toggle */}
            <div className={styles.toggle}>
              <button className={`${styles.toggleBtn} ${viewMode === 'swipe' ? styles.active : ''}`} onClick={() => setViewMode('swipe')}>Swipe</button>
              <button className={`${styles.toggleBtn} ${viewMode === 'normal' ? styles.active : ''}`} onClick={() => setViewMode('normal')}>Normal</button>
            </div>
            {/* Sort */}
            {viewMode === 'normal' && (
              <div className={styles.sortWrap} ref={sortRef}>
                <button className={styles.sortBtn} onClick={() => setShowSortMenu(v => !v)}>
                  {SORT_LABELS[sortMode]} <ChevronDown size={14} />
                </button>
                {showSortMenu && (
                  <div className={styles.sortMenu}>
                    {(Object.keys(SORT_LABELS) as SortMode[]).map(key => (
                      <button
                        key={key}
                        className={`${styles.sortOption} ${sortMode === key ? styles.sortOptionActive : ''}`}
                        onClick={() => { setSortMode(key); setShowSortMenu(false) }}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Add */}
            <button className={styles.addBtn} onClick={() => setModalStep('choose')} aria-label="Add joke">
              <Plus size={30} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* ── Normal view ── */}
        {viewMode === 'normal' && (
          <>
            {loading && (
              <div className={styles.loading}>
                <Loader2 size={28} className={styles.spinner} />
                <p>Loading jokes...</p>
              </div>
            )}
            {!loading && jokes.length === 0 && (
              <div className={styles.empty}>
                <p>No jokes yet. Be the first to drop a stinker!</p>
              </div>
            )}
            {!loading && jokes.length > 0 && (
              <div className={styles.grid}>
                {jokes.map(joke => (
                  <div key={joke.id} className={styles.card}>
                    <span className={styles.cardUser}>@{joke.username}</span>
                    <div className={styles.cardSetup}>{joke.setup}</div>
                    <div className={styles.cardPunch}>{joke.punchline}</div>
                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.fireBtn} ${reactions.get(joke.id) === 'fire' ? styles.active : ''}`}
                        onClick={() => handleReaction(joke.id, 'fire')}
                        disabled={reactionLoading.has(joke.id)}
                      >
                        <Flame size={14} /> {joke.fire_count || 0}
                      </button>
                      <button
                        className={`${styles.dislikeBtn} ${reactions.get(joke.id) === 'dislike' ? styles.active : ''}`}
                        onClick={() => handleReaction(joke.id, 'dislike')}
                        disabled={reactionLoading.has(joke.id)}
                      >
                        <ThumbsDown size={14} /> {joke.dislike_count || 0}
                      </button>
                      <button className={styles.shareBtn} onClick={() => handleShare(joke)}>
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Swipe / Archive view ── */}
        {viewMode === 'swipe' && !activeMonth && (
          <>
            <div className={styles.archiveHero}>
              <h2 className={styles.archiveHeroTitle}>The Vault</h2>
              <p className={styles.archiveHeroSub}>
                Browse historically ranked gas, categorized by month. Perfect for when you need a classic.
              </p>
            </div>
            {archiveMonths.length === 0 && (
              <div className={styles.empty}><p>No jokes archived yet.</p></div>
            )}
            <div className={styles.monthList}>
              {archiveMonths.map(m => (
                <div key={`${m.year}-${m.month}`} className={styles.monthRow} onClick={() => openMonth(m.year, m.month)}>
                  <div className={styles.monthLeft}>
                    <FolderOpen size={22} className={styles.monthIcon} />
                    <div className={styles.monthInfo}>
                      <div className={styles.monthLabel}>{m.label}</div>
                      <div className={styles.monthCount}>
                        <BookOpen size={12} /> {m.count} joke{m.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className={styles.monthArrow}>
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Swipe card for selected month ── */}
        {viewMode === 'swipe' && activeMonth && (
          <div className={styles.swipeContainer}>
            {/* Clickable title back */}
            <button className={styles.swipeTitleBack} onClick={() => setActiveMonth(null)}>
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
              <span>{archiveMonths.find(m => m.year === activeMonth.year && m.month === activeMonth.month)?.label ?? 'Archive'}</span>
            </button>

            {monthLoading && (
              <div className={styles.loading}>
                <Loader2 size={28} className={styles.spinner} />
              </div>
            )}

            {!monthLoading && monthJokes.length === 0 && (
              <div className={styles.empty}><p>No jokes for this month.</p></div>
            )}

            {!monthLoading && monthJokes.length > 0 && (
              <>
                {/* Card with share + hint inside */}
                <div
                  ref={swipeRef}
                  className={styles.swipeCard}
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                  onMouseDown={onMouseDown}
                  style={{ cursor: 'grab', userSelect: 'none' }}
                >
                  <div className={styles.swipeCardHeader}>
                    <span className={styles.swipeUser}>@{monthJokes[swipeIndex].username}</span>
                    <div className={styles.swipeCounts}>
                      <span className={`${styles.swipeCount} ${styles.swipeCountFire}`}>
                        <Flame size={13} /> {monthJokes[swipeIndex].fire_count || 0}
                      </span>
                      <span className={`${styles.swipeCount} ${styles.swipeCountDislike}`}>
                        <ThumbsDown size={13} /> {monthJokes[swipeIndex].dislike_count || 0}
                      </span>
                    </div>
                  </div>
                  <div className={styles.swipeSetup}>{monthJokes[swipeIndex].setup}</div>
                  <div className={styles.swipePunch}>{monthJokes[swipeIndex].punchline}</div>
                  {/* Share + hint row inside card */}
                  <div className={styles.swipeCardFooter}>
                    <button
                      className={styles.swipeShareBtn}
                      onClick={e => { e.stopPropagation(); handleShare(monthJokes[swipeIndex]) }}
                    >
                      <Share2 size={16} /> Share
                    </button>
                    <span className={styles.swipeSkipHint}>← Swipe to skip →</span>
                  </div>
                </div>

                {/* Fire / Dislike outside card, bigger — icons only */}
                <div className={styles.swipeReactionRow}>
                  <button
                    className={`${styles.swipeBigBtn} ${styles.swipeBigFire} ${reactions.get(monthJokes[swipeIndex].id) === 'fire' ? styles.active : ''}`}
                    onClick={() => handleReaction(monthJokes[swipeIndex].id, 'fire')}
                  >
                    <Flame size={28} />
                  </button>
                  <button
                    className={`${styles.swipeBigBtn} ${styles.swipeBigDislike} ${reactions.get(monthJokes[swipeIndex].id) === 'dislike' ? styles.active : ''}`}
                    onClick={() => handleReaction(monthJokes[swipeIndex].id, 'dislike')}
                  >
                    <ThumbsDown size={28} />
                  </button>
                </div>
                <span className={styles.swipeCounter}>{swipeIndex + 1} / {monthJokes.length}</span>
              </>
            )}
          </div>
        )}

        {/* ══════════ Modals ══════════ */}

        {/* ── Choose modal ── */}
        {modalStep === 'choose' && (
          <div className={styles.overlay} onClick={() => setModalStep(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setModalStep(null)}><X size={20} /></button>
              <h2 className={styles.modalTitle}>Contribute to the Gas</h2>
              <div className={styles.choiceGrid}>
                <div className={styles.choiceCard} onClick={() => setModalStep('write')}>
                  <PenLine size={32} className={styles.choiceIcon} />
                  <span className={styles.choiceLabel}>Write Joke</span>
                  <span className={styles.choiceDesc}>Type your own manual setup and punchline</span>
                </div>
                <div className={styles.choiceCard} onClick={() => setModalStep('generate')}>
                  <Sparkles size={32} className={styles.choiceIcon} />
                  <span className={styles.choiceLabel}>Generate</span>
                  <span className={styles.choiceDesc}>Use AI to craft a stinker automatically</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Write joke modal ── */}
        {modalStep === 'write' && (
          <div className={styles.overlay} onClick={() => setModalStep(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setModalStep(null)}><X size={20} /></button>
              <h2 className={styles.modalTitle}>Write Joke</h2>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>1. The Setup</label>
                <textarea
                  className={styles.fieldInput}
                  value={writeSetup}
                  onChange={e => setWriteSetup(e.target.value)}
                  placeholder="Why did the..."
                  rows={3}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>2. The Punchline</label>
                <textarea
                  className={styles.fieldInput}
                  value={writePunch}
                  onChange={e => setWritePunch(e.target.value)}
                  placeholder="Drop the stinker here..."
                  rows={3}
                />
              </div>
              <button
                className={styles.publishBtn}
                disabled={publishing || !writeSetup.trim() || !writePunch.trim()}
                onClick={() => publishJoke(writeSetup, writePunch)}
              >
                {publishing ? <Loader2 size={18} className={styles.spinner} /> : 'Publish Joke'}
              </button>
            </div>
          </div>
        )}

        {/* ── Share modal ── */}
        {modalStep === 'share' && shareTarget && (() => {
          const jokeText = `${shareTarget.setup}\n${shareTarget.punchline}`
          const encoded = encodeURIComponent(jokeText)
          const platforms = [
            {
              label: 'WhatsApp',
              color: '#25D366',
              href: `https://wa.me/?text=${encoded}`,
              icon: (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.054 23.5l5.832-1.53A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.006-1.374l-.36-.214-3.716.976.993-3.614-.235-.373A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
              ),
            },
            {
              label: 'X',
              color: '#e7e7e7',
              href: `https://twitter.com/intent/tweet?text=${encoded}`,
              icon: (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
                </svg>
              ),
            },
            {
              label: 'Telegram',
              color: '#2AABEE',
              href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encoded}`,
              icon: (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              ),
            },
            {
              label: 'Facebook',
              color: '#1877F2',
              href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encoded}`,
              icon: (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ),
            },
          ]
          return (
            <div className={styles.overlay} onClick={() => setModalStep(null)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={() => setModalStep(null)}><X size={20} /></button>
                <h2 className={styles.modalTitle}>Share Joke</h2>
                <div className={styles.shareModal}>
                  <div className={styles.shareJokePreview}>
                    <div className={styles.shareJokeSetup}>{shareTarget.setup}</div>
                    <div className={styles.shareJokePunch}>{shareTarget.punchline}</div>
                  </div>
                  <div className={styles.sharePlatformGrid}>
                    {platforms.map(p => (
                      <a
                        key={p.label}
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sharePlatformBtn}
                        style={{ '--platform-color': p.color } as React.CSSProperties}
                      >
                        <span className={styles.sharePlatformIcon} style={{ color: p.color }}>{p.icon}</span>
                        <span className={styles.sharePlatformLabel}>{p.label}</span>
                      </a>
                    ))}
                  </div>
                  <button className={styles.shareOption} onClick={handleCopyJoke}>
                    <span className={styles.shareOptionIcon}>
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </span>
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── AI Generate modal ── */}
        {modalStep === 'generate' && (
          <div className={styles.overlay} onClick={() => setModalStep(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setModalStep(null)}><X size={20} /></button>
              <h2 className={styles.modalTitle}>AI Generator</h2>
              <div className={styles.aiLabel}>TOPIC OR KEYWORD</div>
              <input
                className={styles.aiField}
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g. beans, elevator, dog..."
                onKeyDown={e => { if (e.key === 'Enter') generateJoke() }}
              />
              <button
                className={styles.generateBtn}
                disabled={generating || !aiTopic.trim()}
                onClick={generateJoke}
              >
                {generating ? <Loader2 size={18} className={styles.spinner} /> : <><Sparkles size={16} /> Generate Stinker</>}
              </button>
              {aiResult && (
                <div className={styles.aiResult}>
                  <div className={styles.aiResultSetup}>{aiResult.setup}</div>
                  <div className={styles.aiResultPunch}>{aiResult.punchline}</div>
                  <button
                    className={styles.publishBtn}
                    disabled={publishing}
                    onClick={() => publishJoke(aiResult.setup, aiResult.punchline)}
                  >
                    {publishing ? <Loader2 size={18} className={styles.spinner} /> : 'Publish This Joke'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AuthGate>
  )
}

export default FartJokesPage
