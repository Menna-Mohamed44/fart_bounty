'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bebas_Neue } from 'next/font/google'
import { ArrowLeft, Menu, Search, X, Loader2 } from 'lucide-react'
import { createClient } from '@/app/lib/supabaseClient'
import { getMobilePageTitle } from '@/app/lib/mobilePageTitles'
import { useMobileShell } from '@/app/context/MobileShellContext'
import styles from './MobileTopBar.module.css'

const homeBrandFont = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})

interface SearchResult {
  type: 'user' | 'post'
  id: string
  title: string
  subtitle: string
  avatar_url?: string | null
  username?: string
}

export default function MobileTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { navOpen, toggleNav, closeNav } = useMobileShell()
  const supabase = useMemo(() => createClient(), [])
  const title = getMobilePageTitle(pathname)
  const isHome = pathname === '/home'

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (query.trim().length === 0) {
      setResults([])
      setShowResults(false)
      return
    }
    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(() => runSearch(query), 280)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query])

  useEffect(() => {
    setSearchPanelOpen(false)
    setQuery('')
    setShowResults(false)
  }, [pathname])

  const runSearch = async (q: string) => {
    try {
      const list: SearchResult[] = []
      const { data: users } = await (supabase as any)
        .from('users')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(5)

      users?.forEach((u: any) => {
        list.push({
          type: 'user',
          id: u.id,
          title: u.display_name || u.username,
          subtitle: `@${u.username}`,
          avatar_url: u.avatar_url,
          username: u.username,
        })
      })

      const { data: posts } = await supabase
        .from('posts')
        .select(
          `
          id,
          content,
          user:users!posts_user_id_fkey(username, display_name, avatar_url)
        `
        )
        .ilike('content', `%${q}%`)
        .eq('deleted', false)
        .limit(5)

      posts?.forEach((p: any) => {
        const preview =
          p.content.length > 48 ? p.content.substring(0, 48) + '…' : p.content
        list.push({
          type: 'post',
          id: p.id,
          title: preview,
          subtitle: `by @${p.user?.username || 'unknown'}`,
          avatar_url: p.user?.avatar_url,
        })
      })

      setResults(list)
      setShowResults(true)
    } catch {
      setResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const onPick = (r: SearchResult) => {
    if (r.type === 'user' && r.username) {
      router.push(`/${r.username}`)
    } else {
      router.push('/home')
    }
    setQuery('')
    setShowResults(false)
    setSearchPanelOpen(false)
  }

  const closeSearchPanel = () => {
    setSearchPanelOpen(false)
    setQuery('')
    setShowResults(false)
  }

  const renderResults = (panelClass?: string) => {
    if (!showResults || !query.trim()) return null
    return (
      <div className={`${styles.results} ${panelClass || ''}`}>
        {searchLoading ? (
          <div className={styles.loading}>
            <Loader2 size={18} className={styles.spinner} />
            Searching…
          </div>
        ) : results.length > 0 ? (
          results.map((r) => (
            <div
              key={`${r.type}-${r.id}`}
              className={styles.resultItem}
              onClick={() => onPick(r)}
            >
              <div className={styles.resultAvatar}>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" />
                ) : (
                  <span>{r.title[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className={styles.resultText}>
                <p className={styles.resultTitle}>{r.title}</p>
                <p className={styles.resultSub}>
                  {r.type === 'user' ? '👤 ' : '📝 '}
                  {r.subtitle}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noResults}>No results</div>
        )}
      </div>
    )
  }

  if (isHome) {
    return (
      <>
        {navOpen && (
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={closeNav}
          />
        )}
        {searchPanelOpen && !navOpen && (
          <div
            className={`${styles.backdrop} ${styles.searchPanelBackdrop}`}
            aria-hidden="true"
            onClick={closeSearchPanel}
          />
        )}
        <header className={`${styles.bar} ${styles.barHome}`}>
          <div className={`${styles.brandHome} ${homeBrandFont.className}`}>
            FART BOUNTY
          </div>
          <div className={styles.homeRightActions}>
            <button
              type="button"
              className={`${styles.iconBtn} ${searchPanelOpen ? styles.iconBtnActive : ''}`}
              aria-expanded={searchPanelOpen}
              aria-label="Search"
              onClick={() => setSearchPanelOpen((o) => !o)}
            >
              <Search size={22} />
            </button>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => {
                closeSearchPanel()
                toggleNav()
              }}
            >
              {navOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>
        <div
          className={`${styles.searchPanel} ${searchPanelOpen ? styles.searchPanelOpen : ''}`}
        >
          <div className={styles.searchPanelInner}>
            <div className={styles.searchField}>
              <Search size={16} aria-hidden />
              <input
                type="search"
                className={styles.input}
                placeholder="Search users & posts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim() && setShowResults(true)}
                autoComplete="off"
                enterKeyHint="search"
              />
              {query ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('')
                    setShowResults(false)
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {renderResults(styles.resultsPanelBelow)}
          </div>
        </div>
      </>
    )
  }

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/home')
    }
  }

  return (
    <>
      {navOpen && (
        <div
          className={styles.backdrop}
          aria-hidden="true"
          onClick={closeNav}
        />
      )}
      {searchPanelOpen && !navOpen && (
        <div
          className={`${styles.backdrop} ${styles.searchPanelBackdrop}`}
          aria-hidden="true"
          onClick={closeSearchPanel}
        />
      )}
      <header className={`${styles.bar} ${styles.barPage}`}>
        <div className={styles.pageTitleRow}>
          <button
            type="button"
            className={styles.backBtn}
            aria-label="Go back"
            onClick={goBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} />
          </button>
          <span className={styles.pageTitle} title={title}>
            {title}
          </span>
        </div>
        <div className={styles.homeRightActions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${searchPanelOpen ? styles.iconBtnActive : ''}`}
            aria-expanded={searchPanelOpen}
            aria-label="Search"
            onClick={() => setSearchPanelOpen((o) => !o)}
          >
            <Search size={22} />
          </button>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            onClick={() => {
              closeSearchPanel()
              toggleNav()
            }}
          >
            {navOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      <div
        className={`${styles.searchPanel} ${searchPanelOpen ? styles.searchPanelOpen : ''}`}
      >
        <div className={styles.searchPanelInner}>
          <div className={styles.searchField}>
            <Search size={16} aria-hidden />
            <input
              type="search"
              className={styles.input}
              placeholder="Search users & posts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowResults(true)}
              autoComplete="off"
              enterKeyHint="search"
            />
            {query ? (
              <button
                type="button"
                className={styles.clearBtn}
                aria-label="Clear search"
                onClick={() => {
                  setQuery('')
                  setShowResults(false)
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          {renderResults(styles.resultsPanelBelow)}
        </div>
      </div>
    </>
  )
}
