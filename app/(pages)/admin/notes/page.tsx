'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import RoleGate from '@/app/components/RoleGate/RoleGate'
import { MessageSquare, Search, Trash2, RefreshCw, Filter } from 'lucide-react'
import styles from './NotesAdmin.module.css'

interface AdminNote {
  id: string
  user_id: string
  page_path: string
  text: string
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default function NotesAdminPage() {
  return (
    <RoleGate minLevel={5} permission="admin.full" fallbackMessage="You need Admin (Level 5) access to view user notes.">
      <NotesAdminContent />
    </RoleGate>
  )
}

function NotesAdminContent() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [notes, setNotes] = useState<AdminNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [uniquePaths, setUniquePaths] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchNotes = async () => {
    setLoading(true)

    const { data: rawNotes, error } = await supabase
      .from('page_notes')
      .select('id, user_id, page_path, text, created_at')
      .order('created_at', { ascending: false })

    if (error || !rawNotes) {
      console.error('Failed to fetch notes:', error)
      setNotes([])
      setLoading(false)
      return
    }

    const userIds = [...new Set(rawNotes.map((n: { user_id: string }) => n.user_id))]
    const { data: users } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)

    const mapped: AdminNote[] = rawNotes.map((n: { id: string; user_id: string; page_path: string; text: string; created_at: string }) => {
      const u = users?.find((u: { id: string }) => u.id === n.user_id)
      return {
        ...n,
        username: u?.username || 'Unknown',
        display_name: u?.display_name || null,
        avatar_url: u?.avatar_url || null,
      }
    })

    setNotes(mapped)

    const paths = [...new Set(rawNotes.map((n: { page_path: string }) => n.page_path))].sort()
    setUniquePaths(paths)

    setLoading(false)
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  const handleDelete = async (noteId: string) => {
    setActionLoading(noteId)
    const { error } = await supabase.from('page_notes').delete().eq('id', noteId)
    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }
    setActionLoading(null)
  }

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesPath = !pathFilter || n.page_path === pathFilter

    return matchesSearch && matchesPath
  })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare size={28} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>User Notes</h1>
            <p className={styles.subtitle}>View all notes left by users across the site</p>
          </div>
        </div>
        <button className={styles.refreshButton} onClick={fetchNotes} disabled={loading}>
          <RefreshCw size={18} className={loading ? styles.spinning : ''} />
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{notes.length}</span>
          <span className={styles.statLabel}>Total Notes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{new Set(notes.map((n) => n.user_id)).size}</span>
          <span className={styles.statLabel}>Users</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{uniquePaths.length}</span>
          <span className={styles.statLabel}>Pages</span>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            className={styles.searchInput}
            placeholder="Search notes or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.pathFilterBox}>
          <Filter size={16} />
          <select
            className={styles.pathSelect}
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
          >
            <option value="">All Pages</option>
            {uniquePaths.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading notes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquare size={48} />
          <p>{notes.length === 0 ? 'No user notes yet.' : 'No notes match the current filter.'}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredNotes.map((note) => (
            <div key={note.id} className={styles.card}>
              <div className={styles.cardTop}>
                {note.avatar_url ? (
                  <img src={note.avatar_url} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {(note.display_name || note.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.cardMeta}>
                  <span className={styles.cardUser}>{note.display_name || note.username}</span>
                  <span className={styles.cardUsername}>@{note.username}</span>
                </div>
                <span className={styles.cardPath}>{note.page_path}</span>
                <span className={styles.cardDate}>
                  {new Date(note.created_at).toLocaleString()}
                </span>
              </div>
              <div className={styles.cardContent}>{note.text}</div>
              <div className={styles.cardActions}>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => handleDelete(note.id)}
                  disabled={actionLoading === note.id}
                >
                  <Trash2 size={14} />
                  {actionLoading === note.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
