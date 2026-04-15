'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { usePremium } from '@/app/context/PremiumContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Music, Play, Pause, Download, Calendar, Clock, Settings, Edit3, Check, X, Video, Image, Upload, Volume2 } from 'lucide-react'
import { createClient } from '@/app/lib/supabaseClient'
import type { Database } from '@/types/database'
import styles from './media-library.module.css'

interface UserSound {
  id: string
  name: string
  storage_path: string
  duration_seconds: number
  parameters: any
  created_at: string
  deleted: boolean
}

interface AudioLibrarySound {
  id: string
  name: string
  storage_path: string
  category: string | null
  tags: string[] | null
  duration_seconds: number | null
  created_at: string
  deleted: boolean
}

type MediaType = 'audio' | 'videos' | 'images'
type AudioSource = 'my-generated' | 'audio-library'

// How many library sounds each tier can browse
const LIBRARY_LIMITS: Record<string, number> = {
  'Basic sound library': 10,
  'Extended sound library': 30,
  'Full sound catalog': 100,
  'Complete access': 9999,
}

function ShopPage() {
  const { user } = useAuth()
  const { tierConfig } = usePremium()
  const libraryLimit = LIBRARY_LIMITS[tierConfig.soundLibrary] ?? 10
  const [sounds, setSounds] = useState<UserSound[]>([])
  const [librarySounds, setLibrarySounds] = useState<AudioLibrarySound[]>([])
  const [loading, setLoading] = useState(true)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [playingSound, setPlayingSound] = useState<string | null>(null)
  const [editingSound, setEditingSound] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [activeMediaType, setActiveMediaType] = useState<MediaType>('audio')
  const [activeAudioSource, setActiveAudioSource] = useState<AudioSource>('my-generated')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchUserSounds()
    }
  }, [user])

  useEffect(() => {
    if (activeMediaType === 'audio' && activeAudioSource === 'audio-library') {
      fetchLibrarySounds()
    }
  }, [activeMediaType, activeAudioSource, selectedCategory, libraryLimit])

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

      setSounds(data || [])
    } catch (error) {
      console.error('Failed to fetch sounds:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLibrarySounds = async () => {
    setLibraryLoading(true)
    try {
      let query = supabase
        .from('audio_library')
        .select('*')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(libraryLimit)

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setLibrarySounds(data || [])
    } catch (error) {
      console.error('Failed to fetch library sounds:', error)
    } finally {
      setLibraryLoading(false)
    }
  }

  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const playingSoundRef = useRef<string | null>(null)
  const playSessionRef = useRef(0)

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      // Clear handlers FIRST to prevent onerror from triggering MIME retry
      currentAudioRef.current.onended = null
      currentAudioRef.current.onerror = null
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
  }

  const playFromBucket = async (bucket: string, storagePath: string, soundId: string) => {
    stopCurrentAudio()

    // Toggle off if same sound
    if (playingSoundRef.current === soundId) {
      setPlayingSound(null)
      playingSoundRef.current = null
      return
    }

    if (!storagePath) {
      console.error('Storage path is null/undefined:', storagePath)
      return
    }

    const session = ++playSessionRef.current
    setPlayingSound(soundId)
    playingSoundRef.current = soundId

    const tryPlayUrl = (url: string, onFail: () => void) => {
      if (playSessionRef.current !== session) return
      const audio = new Audio(url)
      audio.volume = 1.0
      currentAudioRef.current = audio
      audio.onended = () => {
        setPlayingSound(null)
        playingSoundRef.current = null
        currentAudioRef.current = null
      }
      audio.onerror = () => {
        if (playSessionRef.current !== session) return
        currentAudioRef.current = null
        onFail()
      }
      audio.play().catch(() => {
        if (playSessionRef.current !== session) return
        currentAudioRef.current = null
        onFail()
      })
    }

    // Step 1: Try public URL (instant, no download wait)
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const publicUrl = publicData?.publicUrl

    const trySignedUrl = async () => {
      try {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 300)
        if (signedError || !signedData?.signedUrl) throw new Error('Could not get signed URL')
        if (playSessionRef.current !== session) return
        tryPlayUrl(signedData.signedUrl, () => {
          console.error('All URL methods failed for:', storagePath)
          if (playSessionRef.current === session) {
            setPlayingSound(null)
            playingSoundRef.current = null
          }
        })
      } catch (err) {
        console.error('Failed to get signed URL:', err)
        if (playSessionRef.current === session) {
          setPlayingSound(null)
          playingSoundRef.current = null
        }
      }
    }

    if (publicUrl) {
      tryPlayUrl(publicUrl, trySignedUrl)
    } else {
      await trySignedUrl()
    }
  }

  const handlePlayPause = async (sound: UserSound) => {
    await playFromBucket('sounds', sound.storage_path, sound.id)
  }

  const handlePlayPauseLibrary = async (sound: AudioLibrarySound) => {
    if (!sound.storage_path) {
      console.error('No storage_path for library sound:', sound)
      return
    }
    await playFromBucket('audio-library', sound.storage_path, sound.id)
  }

  const handleDownload = async (sound: UserSound) => {
    try {
      const { data: blobData, error } = await supabase.storage
        .from('sounds')
        .download(sound.storage_path)

      if (error || !blobData) {
        // Fallback to signed URL
        const { data: signedData, error: signedError } = await supabase.storage
          .from('sounds')
          .createSignedUrl(sound.storage_path, 300)

        if (signedError || !signedData?.signedUrl) throw signedError
        const link = document.createElement('a')
        link.href = signedData.signedUrl
        link.download = sound.name ? `${sound.name}.wav` : `fart-sound-${sound.id}.wav`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      const blobUrl = URL.createObjectURL(blobData)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = sound.name ? `${sound.name}.wav` : `fart-sound-${sound.id}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Failed to download sound:', error)
    }
  }

  const handleDownloadLibrary = async (sound: AudioLibrarySound) => {
    if (!sound.storage_path) return
    try {
      const { data: blobData, error } = await supabase.storage
        .from('audio-library')
        .download(sound.storage_path)

      if (error || !blobData) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('audio-library')
          .createSignedUrl(sound.storage_path, 300)

        if (signedError || !signedData?.signedUrl) throw signedError
        const link = document.createElement('a')
        link.href = signedData.signedUrl
        link.download = `${sound.name}.wav`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      const blobUrl = URL.createObjectURL(blobData)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${sound.name}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Failed to download library sound:', error)
    }
  }

  const handleRename = async (soundId: string) => {
    if (!editName.trim() || !user?.id) return

    try {
      const { error } = await (supabase as any)
        .from('sounds')
        .update({ name: editName.trim() })
        .eq('id', soundId)
        .eq('user_id', user.id)

      if (error) throw error

      setEditingSound(null)
      setEditName('')
      await fetchUserSounds()
    } catch (error) {
      console.error('Failed to rename sound:', error)
    }
  }

  const startEditing = (sound: UserSound) => {
    setEditingSound(sound.id)
    setEditName(sound.name)
  }

  const cancelEditing = () => {
    setEditingSound(null)
    setEditName('')
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const stats = {
    total: sounds.length,
    totalDuration: sounds.reduce((sum, s) => sum + s.duration_seconds, 0)
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to access your media library">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <h1>Media Library</h1>
              <p>Your personal collection of media files</p>
            </div>
          </div>

          {/* Media Type Tabs */}
          <div className={styles.mediaTypeTabs}>
            <button
              className={`${styles.mediaTypeTab} ${activeMediaType === 'audio' ? styles.active : ''}`}
              onClick={() => setActiveMediaType('audio')}
            >
              <Music size={18} />
              Audio
            </button>
            <button
              className={`${styles.mediaTypeTab} ${activeMediaType === 'videos' ? styles.active : ''}`}
              onClick={() => setActiveMediaType('videos')}
            >
              <Video size={18} />
              Videos
            </button>
            <button
              className={`${styles.mediaTypeTab} ${activeMediaType === 'images' ? styles.active : ''}`}
              onClick={() => setActiveMediaType('images')}
            >
              <Image size={18} />
              Images
            </button>
          </div>

          {/* Audio Source Tabs (only show when audio is active) */}
          {activeMediaType === 'audio' && (
            <div className={styles.audioSourceTabs}>
              <button
                className={`${styles.audioSourceTab} ${activeAudioSource === 'my-generated' ? styles.active : ''}`}
                onClick={() => setActiveAudioSource('my-generated')}
              >
                My Generated
              </button>
              <button
                className={`${styles.audioSourceTab} ${activeAudioSource === 'audio-library' ? styles.active : ''}`}
                onClick={() => setActiveAudioSource('audio-library')}
              >
                Audio Library
              </button>
            </div>
          )}

          {activeMediaType === 'audio' && activeAudioSource === 'my-generated' && (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>{stats.total}</span>
                <span className={styles.statLabel}>Total Sounds</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>{formatDuration(stats.totalDuration)}</span>
                <span className={styles.statLabel}>Total Duration</span>
              </div>
            </div>
          )}
        </div>

        {/* Audio - My Generated */}
        {activeMediaType === 'audio' && activeAudioSource === 'my-generated' && (
          <>
            {/* Loading State */}
            {loading && (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading your sounds...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && sounds.length === 0 && (
              <div className={styles.empty}>
                <Music size={64} className={styles.emptyIcon} />
                <h3>No sounds yet</h3>
                <p>Visit the Generator to create your first sound!</p>
              </div>
            )}

            {/* Sounds Grid */}
            {!loading && sounds.length > 0 && (
          <div className={styles.soundsGrid}>
            {sounds.map((sound) => (
              <div key={sound.id} className={styles.soundCard}>
                <div className={styles.soundHeader}>
                  <div className={styles.soundInfo}>
                    <Music className={styles.soundIcon} />
                    <div>
                      {editingSound === sound.id ? (
                        <div className={styles.nameEditContainer}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRename(sound.id)
                              } else if (e.key === 'Escape') {
                                cancelEditing()
                              }
                            }}
                            className={styles.nameEditInput}
                            autoFocus
                          />
                          <div className={styles.nameEditActions}>
                            <button
                              onClick={() => handleRename(sound.id)}
                              className={styles.saveButton}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className={styles.cancelButton}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className={styles.soundTitle}>{sound.name}</h3>
                          <div className={styles.soundMeta}>
                            <span className={styles.soundDuration}>
                              <Clock size={12} />
                              {formatDuration(sound.duration_seconds)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.soundActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handlePlayPause(sound)}
                      title={playingSound === sound.id ? 'Pause' : 'Play'}
                    >
                      {playingSound === sound.id ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleDownload(sound)}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => startEditing(sound)}
                      title="Rename"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.soundContent}>
                  <div className={styles.soundDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Created:</span>
                      <span className={styles.detailValue}>
                        <Calendar size={12} />
                        {formatDate(sound.created_at)}
                      </span>
                    </div>
                    {sound.parameters && Object.keys(sound.parameters).length > 0 && (
                      <div className={styles.parameterTags}>
                        {Object.entries(sound.parameters).map(([key, value]) => (
                          <span key={key} className={styles.paramTag}>
                            <span className={styles.paramKey}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                            <span className={styles.paramVal}>{typeof value === 'number' ? Math.round(value as number) : String(value)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}

        {/* Audio - Library */}
        {activeMediaType === 'audio' && activeAudioSource === 'audio-library' && (
          <div className={styles.librarySection}>
            <div className={styles.libraryHeader}>
              <h3>Audio Library</h3>
              <p>Browse and use pre-made audio files</p>
            </div>

            {/* Loading State */}
            {libraryLoading && (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading audio library...</p>
              </div>
            )}

            {/* Empty State */}
            {!libraryLoading && librarySounds.length === 0 && (
              <div className={styles.empty}>
                <Music size={64} className={styles.emptyIcon} />
                <h3>No sounds in library yet</h3>
                <p>Audio files will appear here once they're uploaded!</p>
              </div>
            )}

            {/* Library Sounds Grid */}
            {!libraryLoading && librarySounds.length > 0 && (
              <div className={styles.soundsGrid}>
                {librarySounds.map((sound) => (
                  <div key={sound.id} className={styles.soundCard}>
                    <div className={styles.soundHeader}>
                      <div className={styles.soundInfo}>
                        <Music className={styles.soundIcon} />
                        <div>
                          <h3 className={styles.soundTitle}>{sound.name}</h3>
                          <div className={styles.soundMeta}>
                            <span className={styles.soundDuration}>
                              <Clock size={12} />
                              {formatDuration(sound.duration_seconds ?? 0)}
                            </span>
                            {sound.category && (
                              <span className={styles.soundCategory}>{sound.category}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={styles.soundActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handlePlayPauseLibrary(sound)}
                          title={playingSound === sound.id ? 'Pause' : 'Play'}
                        >
                          {playingSound === sound.id ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleDownloadLibrary(sound)}
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.soundContent}>
                      {sound.tags && sound.tags.length > 0 && (
                        <div className={styles.soundTags}>
                          {sound.tags.map((tag, index) => (
                            <span key={index} className={styles.tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upgrade prompt when library is capped */}
            {!libraryLoading && librarySounds.length >= libraryLimit && libraryLimit < 9999 && (
              <div className={styles.empty} style={{ marginTop: '1rem', padding: '1.5rem' }}>
                <Volume2 size={32} style={{ color: '#0bda51', marginBottom: '0.5rem' }} />
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Showing {libraryLimit} sounds ({tierConfig.soundLibrary})</h3>
                <p style={{ fontSize: '0.85rem', color: '#999' }}>Upgrade your plan to browse more sounds</p>
              </div>
            )}
          </div>
        )}

        {/* Videos Section */}
        {activeMediaType === 'videos' && (
          <div className={styles.empty}>
            <Video size={64} className={styles.emptyIcon} />
            <h3>Videos Coming Soon</h3>
            <p>Video support will be added in a future update!</p>
          </div>
        )}

        {/* Images Section */}
        {activeMediaType === 'images' && (
          <div className={styles.empty}>
            <Image size={64} className={styles.emptyIcon} />
            <h3>Images Coming Soon</h3>
            <p>Image support will be added in a future update!</p>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default ShopPage
