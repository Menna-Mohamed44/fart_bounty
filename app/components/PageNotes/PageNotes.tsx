'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Plus, Trash2, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import styles from './PageNotes.module.css'

interface NoteItem {
  id: string
  text: string
  createdAt: string
}

export default function PageNotes() {
  const pathname = usePathname()
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [saving, setSaving] = useState(false)

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([])
      return
    }
    const { data } = await supabase
      .from('page_notes')
      .select('id, text, created_at')
      .eq('user_id', user.id)
      .eq('page_path', pathname)
      .order('created_at', { ascending: false })

    if (data) {
      setNotes(data.map((n: { id: string; text: string; created_at: string }) => ({
        id: n.id,
        text: n.text,
        createdAt: n.created_at,
      })))
    }
  }, [user, pathname, supabase])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const addNote = async () => {
    if (!newNote.trim() || !user) return
    setSaving(true)

    const { data, error } = await supabase
      .from('page_notes')
      .insert({
        user_id: user.id,
        page_path: pathname,
        text: newNote.trim(),
      })
      .select('id, text, created_at')
      .single()

    if (!error && data) {
      setNotes((prev) => [
        { id: data.id, text: data.text, createdAt: data.created_at },
        ...prev,
      ])
      setNewNote('')
    }
    setSaving(false)
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('page_notes').delete().eq('id', id)
    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
    }
  }

  if (!user) return null

  return (
    <>
      <button className={styles.fab} onClick={() => setOpen((v) => !v)} title="Page Notes">
        <MessageSquare size={18} />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h4>Page Notes</h4>
            <button onClick={() => setOpen(false)} className={styles.iconBtn}>
              <X size={16} />
            </button>
          </div>
          <p className={styles.pathLabel}>{pathname}</p>

          <div className={styles.inputRow}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className={styles.input}
              placeholder="Leave a note for this page..."
              rows={3}
            />
            <button onClick={addNote} className={styles.addBtn} disabled={saving}>
              <Plus size={14} />
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>

          <div className={styles.list}>
            {notes.length === 0 ? (
              <p className={styles.empty}>No notes yet.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className={styles.noteCard}>
                  <p>{note.text}</p>
                  <div className={styles.noteMeta}>
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                    <button onClick={() => deleteNote(note.id)} className={styles.iconBtn}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}
