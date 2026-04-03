'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays, Copy, Newspaper, Plus, Share2, ThumbsUp, Archive, X } from 'lucide-react'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import styles from './news.module.css'

interface Article {
  id: string
  title: string
  excerpt: string
  body: string
  image: string
  authorName: string
  authorUsername: string
  authorAvatar: string
  date: string
  isLatestReport?: boolean
  isEditorsPick?: boolean
  likes: number
}

const FALLBACK_NEWS_IMAGE = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1800&q=80'
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80'

function getISOWeekKey(): string {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const start = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000
  const week = Math.ceil(((now.getTime() - start) / 86400000 + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function NewsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [liveArticles, setLiveArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [sliderIndex, setSliderIndex] = useState(0)
  const [showArchive, setShowArchive] = useState(false)
  const [showAddNews, setShowAddNews] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareModalArticle, setShareModalArticle] = useState<Article | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [newsForm, setNewsForm] = useState({
    title: '',
    excerpt: '',
    body: '',
    image: '',
    isLatestReport: true,
    isEditorsPick: false,
    moveCurrentToArchive: false,
  })

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true)
      const { data: stories } = await supabase
        .from('news_articles')
        .select('id, author_id, title, excerpt, content, image_url, author_name_override, author_avatar_override, section, likes_count, published_at')
        .order('published_at', { ascending: false })

      if (!stories || stories.length === 0) {
        setLiveArticles([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(stories.map((s) => s.author_id).filter(Boolean))]
      const { data: users } = userIds.length > 0
        ? await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] }

      // Load liked state from localStorage
      if (user) {
        try {
          const saved = localStorage.getItem(`news-likes:${user.id}`)
          if (saved) setLikedIds(new Set(JSON.parse(saved)))
        } catch { /* ignore */ }
      }

      const mapped: Article[] = stories.map((story) => {
        const author = users?.find((u) => u.id === story.author_id)
        const isMe = user && story.author_id === user.id

        const avatar =
          (story.author_avatar_override || '').trim() ||
          (isMe ? (user.avatar_url || '').trim() : '') ||
          (author?.avatar_url || '').trim() ||
          ''

        return {
          id: story.id,
          title: story.title,
          excerpt: story.excerpt || story.content.slice(0, 140) + (story.content.length > 140 ? '...' : ''),
          body: story.content,
          image: story.image_url || FALLBACK_NEWS_IMAGE,
          authorName: (story.author_name_override || '').trim() || author?.display_name || (isMe ? user.display_name : null) || author?.username || (isMe ? user.username : null) || 'Community Reporter',
          authorUsername: author?.username || (isMe ? user.username : '') || '',
          authorAvatar: avatar,
          date: new Date(story.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          isLatestReport: story.section === 'latest',
          isEditorsPick: story.section === 'editor',
          likes: story.likes_count || 0,
        }
      })

      // Remove duplicates by ID
      const uniqueMapped = mapped.filter((article, index, self) => 
        index === self.findIndex((a) => a.id === article.id)
      )

      setLiveArticles(uniqueMapped)
      setLoading(false)
    }

    fetchNews()
  }, [user])

  const allNews = useMemo(() => liveArticles, [liveArticles])
  const sliderNews = allNews.slice(0, Math.max(1, allNews.length))
  const latestReports = allNews.filter((a) => a.isLatestReport).slice(0, 3)
  const editorsPicks = allNews.filter((a) => a.isEditorsPick).slice(0, 3)
  const oldStories = allNews.filter((a) => !a.isLatestReport && !a.isEditorsPick)

  const openArticle = (article: Article) => {
    setSelectedArticle(article)
  }

  const nextSlide = () => {
    setSliderIndex((prev) => (prev + 1) % sliderNews.length)
  }

  const prevSlide = () => {
    setSliderIndex((prev) => (prev - 1 + sliderNews.length) % sliderNews.length)
  }

  const handleLike = async (articleId: string) => {
    if (!user) return
    const isLiked = likedIds.has(articleId)
    const nowLiked = !isLiked

    // Optimistic UI update
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (nowLiked) next.add(articleId); else next.delete(articleId)
      localStorage.setItem(`news-likes:${user.id}`, JSON.stringify([...next]))
      return next
    })
    const delta = nowLiked ? 1 : -1
    setLiveArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, likes: Math.max(0, a.likes + delta) } : a))
    )
    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle((prev) => prev ? { ...prev, likes: Math.max(0, prev.likes + delta) } : prev)
    }

    // Call DB function to update likes_count directly on news_articles
    const { data: newCount, error } = await (supabase as any).rpc('toggle_news_like', {
      p_article_id: articleId,
      p_liked: nowLiked,
    })

    if (error) {
      // Revert on failure
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (nowLiked) next.delete(articleId); else next.add(articleId)
        localStorage.setItem(`news-likes:${user.id}`, JSON.stringify([...next]))
        return next
      })
      setLiveArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, likes: Math.max(0, a.likes - delta) } : a))
      )
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle((prev) => prev ? { ...prev, likes: Math.max(0, prev.likes - delta) } : prev)
      }
      return
    }

    // Sync with actual DB count
    if (typeof newCount === 'number') {
      setLiveArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, likes: newCount } : a))
      )
      if (selectedArticle && selectedArticle.id === articleId) {
        setSelectedArticle((prev) => prev ? { ...prev, likes: newCount } : prev)
      }
    }
  }

  const openShareModal = (article: Article) => {
    setShareModalArticle(article)
    setShowShareModal(true)
    setShareCopied(false)
  }

  const handleCopyLink = async () => {
    if (!shareModalArticle) return
    try {
      await navigator.clipboard.writeText(`${shareModalArticle.title} - ${window.location.href}`)
      setShareCopied(true)
    } catch { /* clipboard not available */ }
  }

  const handleShareTwitter = () => {
    if (!shareModalArticle) return
    const text = encodeURIComponent(shareModalArticle.title)
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer,width=550,height=420')
  }

  const handleShareWhatsApp = () => {
    if (!shareModalArticle) return
    const text = encodeURIComponent(`${shareModalArticle.title} - ${window.location.href}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const handleShareReddit = () => {
    if (!shareModalArticle) return
    const title = encodeURIComponent(shareModalArticle.title)
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.reddit.com/submit?title=${title}&url=${url}`, '_blank', 'noopener,noreferrer')
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setNewsForm((prev) => ({ ...prev, image: String(reader.result || '') }))
    }
    reader.readAsDataURL(file)
  }

  const trackChallenge = (challengeId: string, periodKey: string | null) => {
    if (!user) return
    ;(supabase as any).rpc('increment_challenge_progress', {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_period_key: periodKey,
    }).then(() => {}).catch(() => {})
  }

  const [publishing, setPublishing] = useState(false)

  const publishNews = async () => {
    if (!user) {
      alert('Please sign in to publish news.')
      return
    }
    if (!newsForm.title.trim()) {
      alert('Please enter a title.')
      return
    }
    if (!newsForm.body.trim()) {
      alert('Please enter the news content.')
      return
    }
    if (publishing) return
    setPublishing(true)

    try {
      const section = newsForm.moveCurrentToArchive ? 'archive' : newsForm.isEditorsPick ? 'editor' : 'latest'
      const imageUrl = newsForm.image.trim() || FALLBACK_NEWS_IMAGE

      const { data: inserted, error } = await supabase
        .from('news_articles')
        .insert({
          author_id: user.id,
          title: newsForm.title.trim(),
          excerpt: newsForm.excerpt.trim() || newsForm.body.trim().slice(0, 140),
          content: newsForm.body.trim(),
          image_url: imageUrl,
          section,
        })
        .select('id, title, excerpt, content, image_url, section, likes_count, published_at')
        .single()

      if (error || !inserted) {
        alert('Failed to publish news. Please try again.')
        return
      }

      const newArticle: Article = {
        id: inserted.id,
        title: inserted.title,
        excerpt: inserted.excerpt,
        body: inserted.content,
        image: inserted.image_url || FALLBACK_NEWS_IMAGE,
        authorName: user.display_name || user.username || 'Community Reporter',
        authorUsername: user.username || '',
        authorAvatar: (user.avatar_url || '').trim() || FALLBACK_AVATAR,
        date: new Date(inserted.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isLatestReport: inserted.section === 'latest',
        isEditorsPick: inserted.section === 'editor',
        likes: inserted.likes_count || 0,
      }

      setLiveArticles((prev) => {
        const exists = prev.some(article => article.id === newArticle.id)
        if (exists) return prev
        return [newArticle, ...prev]
      })
      trackChallenge('w2', getISOWeekKey())
      trackChallenge('l3', null)
      setShowAddNews(false)
      setNewsForm({
        title: '',
        excerpt: '',
        body: '',
        image: '',
        isLatestReport: true,
        isEditorsPick: false,
        moveCurrentToArchive: false,
      })
    } catch (err) {
      console.error('Error publishing news:', err)
      alert('Failed to publish news. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  if (selectedArticle) {
    const liked = likedIds.has(selectedArticle.id)
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => setSelectedArticle(null)}>
          <ArrowLeft size={18} />
          Back to News
        </button>

        <article className={styles.detailCard}>
          <div className={styles.detailHero} style={{ backgroundImage: `url(${selectedArticle.image})` }}>
            <h1 className={styles.detailTitle}>{selectedArticle.title}</h1>
          </div>

          <div className={styles.metaRow}>
            <div className={styles.publisherInfo}>
              {selectedArticle.authorAvatar ? (
                <img
                  src={selectedArticle.authorAvatar}
                  alt={selectedArticle.authorName}
                  className={styles.publisherAvatar}
                  onClick={() => selectedArticle.authorUsername && router.push(`/${selectedArticle.authorUsername}`)}
                  style={{ cursor: selectedArticle.authorUsername ? 'pointer' : 'default' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden) }}
                />
              ) : null}
              {!selectedArticle.authorAvatar && (
                <div
                  className={styles.publisherAvatarFallback}
                  onClick={() => selectedArticle.authorUsername && router.push(`/${selectedArticle.authorUsername}`)}
                  style={{ cursor: selectedArticle.authorUsername ? 'pointer' : 'default' }}
                >
                  {selectedArticle.authorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p
                  className={styles.publisherName}
                  onClick={() => selectedArticle.authorUsername && router.push(`/${selectedArticle.authorUsername}`)}
                  style={{ cursor: selectedArticle.authorUsername ? 'pointer' : 'default' }}
                >
                  {selectedArticle.authorName}
                </p>
                <p className={styles.publishDate}>{selectedArticle.date}</p>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={`${styles.grayActionBtn} ${liked ? styles.likedBtn : ''}`}
                onClick={() => handleLike(selectedArticle.id)}
              >
                <ThumbsUp size={14} />
                {selectedArticle.likes}
              </button>
              <button className={styles.grayActionBtn} onClick={() => openShareModal(selectedArticle)}>
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>

          <p className={styles.detailBody}>{selectedArticle.body}</p>
        </article>

        {showShareModal && shareModalArticle && (
          <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
            <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.shareModalHeader}>
                <h3>Share this article</h3>
                <button onClick={() => setShowShareModal(false)} className={styles.shareCloseBtn}>
                  <X size={18} />
                </button>
              </div>
              <p className={styles.shareArticleTitle}>{shareModalArticle.title}</p>
              <div className={styles.shareOptions}>
                <button className={styles.shareOptionBtn} onClick={handleCopyLink}>
                  <Copy size={18} />
                  {shareCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button className={`${styles.shareOptionBtn} ${styles.shareTwitter}`} onClick={handleShareTwitter}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>𝕏</span>
                  Twitter / X
                </button>
                <button className={`${styles.shareOptionBtn} ${styles.shareWhatsApp}`} onClick={handleShareWhatsApp}>
                  <Share2 size={18} />
                  WhatsApp
                </button>
                <button className={`${styles.shareOptionBtn} ${styles.shareReddit}`} onClick={handleShareReddit}>
                  <Share2 size={18} />
                  Reddit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleWrap}>
        <h1 className={styles.pageTitle}>
          <Newspaper size={28} className={styles.titleIcon} />
          FART NEWS
        </h1>
        <div className={styles.glowLine} />
      </div>

      <button className={styles.addNewsBtn} onClick={() => setShowAddNews(true)}>
        <Plus size={16} />
        Add News
      </button>

      {allNews.length > 0 && (
      <section className={styles.sliderShell}>
        <button className={styles.slideBtn} onClick={prevSlide} aria-label="Previous story">
          <ArrowLeft size={20} />
        </button>
        <div
          className={styles.heroNewsCard}
          style={{ backgroundImage: `url(${sliderNews[sliderIndex]?.image})` }}
          onClick={() => openArticle(sliderNews[sliderIndex])}
        >
          <div className={styles.heroOverlay}>
            <h2>{sliderNews[sliderIndex]?.title}</h2>
            <p>{sliderNews[sliderIndex]?.excerpt}</p>
          </div>
        </div>
        <button className={styles.slideBtn} onClick={nextSlide} aria-label="Next story">
          <ArrowRight size={20} />
        </button>
      </section>
      )}
      {loading && <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '-0.75rem', marginBottom: '1rem' }}>Loading live news...</p>}
      {!loading && allNews.length === 0 && <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1rem' }}>No news found. Publish the first article.</p>}

      <section className={styles.sectionWrap}>
        <h2 className={styles.sectionTitle}>LATEST REPORTS</h2>
        <div className={styles.threeCardGrid}>
          {latestReports.map((article) => (
            <div key={article.id} className={styles.storyCard}>
              <div className={styles.storyImage} style={{ backgroundImage: `url(${article.image})` }} />
              <div className={styles.storyBody}>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <button className={styles.readStoryBtn} onClick={() => openArticle(article)}>
                  READ STORY <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionWrap}>
        <h2 className={styles.sectionTitleYellow}>EDITOR&apos;S PICKS</h2>
        <div className={styles.threeCardGrid}>
          {editorsPicks.map((article) => (
            <div key={article.id} className={styles.storyCard}>
              <div className={styles.storyImage} style={{ backgroundImage: `url(${article.image})` }}>
                <span className={styles.featuredTag}>FEATURED</span>
              </div>
              <div className={styles.storyBody}>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <button className={styles.readStoryBtn} onClick={() => openArticle(article)}>
                  READ STORY <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className={styles.archiveBtn} onClick={() => setShowArchive((prev) => !prev)}>
        <Archive size={18} />
        BROWSE OLD STORIES ARCHIVE
      </button>

      {showArchive && (
        <div className={styles.archiveList}>
          {oldStories.map((story) => (
            <button key={story.id} className={styles.archiveItem} onClick={() => openArticle(story)}>
              <CalendarDays size={14} />
              {story.date} - {story.title}
            </button>
          ))}
        </div>
      )}

      {showAddNews && (
        <div className={styles.modalOverlay} onClick={() => setShowAddNews(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Publish News</h3>
            <input
              className={styles.input}
              placeholder="Title"
              value={newsForm.title}
              onChange={(e) => setNewsForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="Short excerpt"
              value={newsForm.excerpt}
              onChange={(e) => setNewsForm((prev) => ({ ...prev, excerpt: e.target.value }))}
            />
            <textarea
              className={styles.textarea}
              placeholder="Full news content"
              value={newsForm.body}
              onChange={(e) => setNewsForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <input
              className={styles.input}
              placeholder="Image URL"
              value={newsForm.image}
              onChange={(e) => setNewsForm((prev) => ({ ...prev, image: e.target.value }))}
            />
            <input className={styles.input} type="file" accept="image/*" onChange={handleImageUpload} />
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={newsForm.isLatestReport}
                onChange={(e) => setNewsForm((prev) => ({ ...prev, isLatestReport: e.target.checked }))}
              />
              Show in Latest Reports
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={newsForm.isEditorsPick}
                onChange={(e) => setNewsForm((prev) => ({ ...prev, isEditorsPick: e.target.checked }))}
              />
              Show in Editor&apos;s Picks
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={newsForm.moveCurrentToArchive}
                onChange={(e) => setNewsForm((prev) => ({ ...prev, moveCurrentToArchive: e.target.checked }))}
              />
              Move current top stories to archive
            </label>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAddNews(false)} disabled={publishing}>Cancel</button>
              <button className={styles.publishBtn} onClick={publishNews} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function News() {
  return (
    <AuthGate>
      <NewsPage />
    </AuthGate>
  )
}
