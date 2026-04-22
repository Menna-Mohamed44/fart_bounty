'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import {
  Video, Trophy, Clock, Plus, X, Upload, Star,
  ThumbsUp, Users, ChevronRight, Loader2, Award, Search, UserPlus
} from 'lucide-react'
import styles from './challenges.module.css'

const supabase = createClient()

interface Challenge {
  id: string
  creator_id: string
  challenged_user_id: string | null
  title: string
  description: string | null
  category: string
  deadline: string | null
  prize_coins: number
  status: string
  winner_id: string | null
  created_at: string
  creator?: { username: string; display_name: string | null; avatar_url: string | null }
  challenged_user?: { username: string; display_name: string | null; avatar_url: string | null } | null
  submission_count: number
  user_submitted: boolean
}

interface Submission {
  id: string
  challenge_id: string
  user_id: string
  video_path: string
  thumbnail_path: string | null
  title: string | null
  description: string | null
  vote_count: number
  created_at: string
  user?: { username: string; display_name: string | null; avatar_url: string | null }
  user_voted: boolean
}

type Tab = 'browse' | 'my-challenges' | 'create'

function ChallengesPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('browse')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  const [createTitle, setCreateTitle] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createCategory, setCreateCategory] = useState('general')
  const [createDeadlineDays, setCreateDeadlineDays] = useState(7)
  const [createPrize, setCreatePrize] = useState(0)
  const [creating, setCreating] = useState(false)
  const [challengeUsername, setChallengeUsername] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{id: string; username: string; display_name: string | null; avatar_url: string | null}[]>([])
  const [selectedChallengedUser, setSelectedChallengedUser] = useState<{id: string; username: string; display_name: string | null} | null>(null)
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  const CATEGORIES = ['general', 'funny', 'creative', 'extreme', 'musical', 'prank']

  const fetchChallenges = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase
        .from('video_challenges')
        .select('*')
        .order('created_at', { ascending: false })

      if (tab === 'my-challenges') {
        query = query.eq('creator_id', user.id)
      } else {
        query = query.in('status', ['active', 'voting'])
      }

      const { data, error } = await query
      if (error) {
        console.error('Supabase error details:', error.message, error.code, error.hint, error.details)
        throw error
      }

      const rows = data || []

      // Resolve creator usernames from public.users
      const creatorIds = [...new Set(rows.map((c: any) => c.creator_id))]
      let creatorMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', creatorIds)
        if (creators) {
          creators.forEach((u: any) => { creatorMap[u.id] = u })
        }
      }

      // Get submission counts and user submission status
      const ids = rows.map((c: any) => c.id)
      let subCounts: Record<string, number> = {}
      let userSubmitted = new Set<string>()

      if (ids.length > 0) {
        const { data: subs } = await supabase
          .from('challenge_submissions')
          .select('challenge_id, user_id')
          .in('challenge_id', ids)

        if (subs) {
          subs.forEach((s: any) => {
            subCounts[s.challenge_id] = (subCounts[s.challenge_id] || 0) + 1
            if (s.user_id === user.id) userSubmitted.add(s.challenge_id)
          })
        }
      }

      // Also resolve challenged user info
      const challengedIds = [...new Set(rows.filter((c: any) => c.challenged_user_id).map((c: any) => c.challenged_user_id))]
      let challengedMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
      if (challengedIds.length > 0) {
        const { data: challenged } = await supabase.from('users').select('id, username, display_name, avatar_url').in('id', challengedIds)
        if (challenged) challenged.forEach((u: any) => { challengedMap[u.id] = u })
      }

      setChallenges(rows.map((c: any) => ({
        ...c,
        creator: creatorMap[c.creator_id] || null,
        challenged_user: c.challenged_user_id ? challengedMap[c.challenged_user_id] || null : null,
        submission_count: subCounts[c.id] || 0,
        user_submitted: userSubmitted.has(c.id),
      })))
    } catch (err: any) {
      console.error('Error fetching challenges:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [user, tab])

  useEffect(() => { fetchChallenges() }, [fetchChallenges])

  useEffect(() => {
    if (!user) return
    supabase.from('user_favorites').select('item_id').eq('user_id', user.id).eq('item_type', 'video').then(({ data }: any) => {
      if (data) setFavoriteIds(new Set(data.map((r: any) => r.item_id)))
    })
  }, [user])

  const toggleFavorite = async (submissionId: string, title: string | null) => {
    if (!user) return
    const isFav = favoriteIds.has(submissionId)
    if (isFav) {
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('item_type', 'video').eq('item_id', submissionId)
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(submissionId); return n })
    } else {
      await supabase.from('user_favorites').insert({ user_id: user.id, item_type: 'video', item_id: submissionId, title: title || 'Video submission' })
      setFavoriteIds(prev => new Set(prev).add(submissionId))
    }
  }

  const fetchSubmissions = async (challengeId: string) => {
    if (!user) return
    setSubmissionsLoading(true)
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('vote_count', { ascending: false })

      if (error) throw error

      const rows = data || []

      // Resolve submitter usernames from public.users
      const userIds = [...new Set(rows.map((s: any) => s.user_id))]
      let userMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
        if (users) users.forEach((u: any) => { userMap[u.id] = u })
      }

      const { data: votes } = await supabase
        .from('challenge_votes')
        .select('submission_id')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)

      const votedIds = new Set((votes || []).map((v: any) => v.submission_id))

      setSubmissions(rows.map((s: any) => ({
        ...s, user: userMap[s.user_id] || null, user_voted: votedIds.has(s.id),
      })))
    } catch (err) {
      console.error('Error fetching submissions:', err)
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    setChallengeUsername(query)
    if (query.trim().length < 2) { setUserSearchResults([]); return }
    setSearchingUsers(true)
    try {
      const { data } = await supabase.from('users').select('id, username, display_name, avatar_url').ilike('username', `%${query.trim()}%`).neq('id', user?.id || '').limit(5)
      setUserSearchResults(data || [])
    } catch { setUserSearchResults([]) }
    finally { setSearchingUsers(false) }
  }

  const handleCreateChallenge = async () => {
    if (!user || !createTitle.trim() || !selectedChallengedUser || creating) return
    setCreating(true)
    try {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + createDeadlineDays)
      const { error } = await supabase.from('video_challenges').insert({
        creator_id: user.id, challenged_user_id: selectedChallengedUser.id,
        title: createTitle.trim(),
        description: createDesc.trim() || null, category: createCategory,
        deadline: deadline.toISOString(), prize_coins: createPrize,
      })
      if (error) throw error
      setCreateTitle(''); setCreateDesc(''); setCreateCategory('general')
      setCreateDeadlineDays(7); setCreatePrize(0); setSelectedChallengedUser(null)
      setChallengeUsername(''); setTab('browse'); fetchChallenges()
    } catch (err: any) { console.error('Error creating challenge:', JSON.stringify(err, null, 2)); alert('Failed to create challenge: ' + (err?.message || err?.code || 'Unknown error')) }
    finally { setCreating(false) }
  }

  const handleUploadVideo = async () => {
    if (!user || !uploadFile || !selectedChallenge || uploading) return
    setUploading(true); setUploadProgress(0)
    try {
      const ext = uploadFile.name.split('.').pop() || 'mp4'
      const path = `${user.id}/${selectedChallenge.id}_${Date.now()}.${ext}`
      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage.from('challenge-videos').upload(path, uploadFile, { upsert: false })
      if (uploadError) throw uploadError
      setUploadProgress(70)
      const { error: insertError } = await supabase.from('challenge_submissions').insert({
        challenge_id: selectedChallenge.id, user_id: user.id, video_path: path, title: uploadTitle.trim() || null,
      })
      if (insertError) throw insertError
      setUploadProgress(100); setShowSubmitModal(false); setUploadFile(null); setUploadTitle('')
      fetchChallenges(); if (selectedChallenge) fetchSubmissions(selectedChallenge.id)
    } catch (err) { console.error('Error uploading video:', err); alert('Failed to upload video') }
    finally { setUploading(false); setUploadProgress(0) }
  }

  const handleVote = async (challengeId: string, submissionId: string) => {
    if (!user) return
    try {
      const { error } = await supabase.from('challenge_votes').insert({ challenge_id: challengeId, submission_id: submissionId, user_id: user.id })
      if (error) { if (error.code === '23505') { alert('You already voted in this challenge'); return }; throw error }
      try {
        await supabase.from('challenge_submissions')
          .update({ vote_count: (submissions.find(s => s.id === submissionId)?.vote_count || 0) + 1 })
          .eq('id', submissionId)
      } catch (_) {}
      setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, vote_count: s.vote_count + 1, user_voted: true } : s))
    } catch (err) { console.error('Error voting:', err); alert('Failed to vote') }
  }

  const formatTimeLeft = (deadline: string | null) => {
    if (!deadline) return 'No deadline'
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`
  }

  const getVideoUrl = (path: string) => supabase.storage.from('challenge-videos').getPublicUrl(path).data.publicUrl

  const openChallenge = (ch: Challenge) => { setSelectedChallenge(ch); fetchSubmissions(ch.id) }

  if (selectedChallenge) {
    return (
      <AuthGate requireAuth={true} promptMessage="Sign in to view challenges">
        <div className={styles.container}>
          <button className={styles.backBtn} onClick={() => setSelectedChallenge(null)}>← Back to Challenges</button>
          <div className={styles.detailHeader}>
            <div className={styles.detailInfo}>
              <h1>{selectedChallenge.title}</h1>
              {selectedChallenge.description && <p className={styles.detailDesc}>{selectedChallenge.description}</p>}
              <div className={styles.detailMeta}>
                <span className={styles.categoryBadge}>{selectedChallenge.category}</span>
                <span className={`${styles.statusBadge} ${styles[selectedChallenge.status]}`}>{selectedChallenge.status}</span>
                <span className={styles.metaItem}><Clock size={14} /> {formatTimeLeft(selectedChallenge.deadline)}</span>
                <span className={styles.metaItem}><Users size={14} /> {selectedChallenge.submission_count} submissions</span>
                {selectedChallenge.prize_coins > 0 && <span className={styles.metaItem}><Trophy size={14} /> {selectedChallenge.prize_coins} coins prize</span>}
              </div>
            </div>
            {selectedChallenge.status === 'active' && !selectedChallenge.user_submitted && (
              <button className={styles.submitBtn} onClick={() => setShowSubmitModal(true)}><Upload size={18} /> Submit Video</button>
            )}
            {selectedChallenge.user_submitted && <div className={styles.submittedBadge}>✓ You submitted</div>}
          </div>

          <h2 className={styles.submissionsTitle}>Submissions ({submissions.length})</h2>

          {submissionsLoading ? (
            <div className={styles.loadingSmall}><Loader2 size={20} className={styles.spin} /> Loading...</div>
          ) : submissions.length === 0 ? (
            <div className={styles.empty}><Video size={48} /><p>No submissions yet. Be the first!</p></div>
          ) : (
            <div className={styles.submissionGrid}>
              {submissions.map(sub => (
                <div key={sub.id} className={styles.submissionCard}>
                  <div className={styles.videoContainer}>
                    <video src={getVideoUrl(sub.video_path)} className={styles.videoPlayer} controls preload="metadata" playsInline />
                  </div>
                  <div className={styles.submissionInfo}>
                    <div className={styles.submissionUser}>
                      <div className={styles.subAvatar}>
                        {sub.user?.avatar_url ? <img src={sub.user.avatar_url} alt="" /> : <span>{(sub.user?.display_name || sub.user?.username || '?')[0]}</span>}
                      </div>
                      <div>
                        <span className={styles.subUsername}>{sub.user?.display_name || sub.user?.username}</span>
                        {sub.title && <span className={styles.subTitle}>{sub.title}</span>}
                      </div>
                    </div>
                    <div className={styles.submissionActions}>
                      <div className={styles.voteCount}><ThumbsUp size={14} /> {sub.vote_count}</div>
                      {selectedChallenge.status !== 'completed' && !sub.user_voted && sub.user_id !== user?.id && (
                        <button className={styles.voteBtn} onClick={() => handleVote(selectedChallenge.id, sub.id)}><ThumbsUp size={14} /> Vote</button>
                      )}
                      {sub.user_voted && <span className={styles.votedLabel}>✓ Voted</span>}
                      <button className={styles.favBtn} onClick={() => toggleFavorite(sub.id, sub.title)} title={favoriteIds.has(sub.id) ? 'Remove from favorites' : 'Add to favorites'}>
                        <Star size={14} fill={favoriteIds.has(sub.id) ? '#f59e0b' : 'none'} color={favoriteIds.has(sub.id) ? '#f59e0b' : 'currentColor'} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showSubmitModal && (
            <div className={styles.modalOverlay} onClick={() => !uploading && setShowSubmitModal(false)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Submit Your Video</h2>
                  <button className={styles.modalClose} onClick={() => !uploading && setShowSubmitModal(false)}><X size={20} /></button>
                </div>
                <div className={styles.uploadArea} onClick={() => !uploading && fileInputRef.current?.click()}>
                  {uploadFile ? (
                    <div className={styles.filePreview}><Video size={32} /><p>{uploadFile.name}</p><span className={styles.fileSize}>{(uploadFile.size / 1048576).toFixed(1)} MB</span></div>
                  ) : (
                    <><Upload size={40} /><p>Click to select a video</p><span className={styles.uploadHint}>MP4, WebM, MOV • Max 100MB</span></>
                  )}
                  <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f && f.size > 104857600) { alert('File too large (max 100MB)'); return }; if (f) setUploadFile(f) }} />
                </div>
                <input className={styles.titleInput} placeholder="Video title (optional)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
                {uploading && <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} /></div>}
                <button className={styles.uploadBtn} onClick={handleUploadVideo} disabled={!uploadFile || uploading}>
                  {uploading ? <><Loader2 size={16} className={styles.spin} /> Uploading...</> : <><Upload size={16} /> Upload & Submit</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to view video challenges">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Video size={32} className={styles.headerIcon} /><div><h1>Fart Challenges</h1><p>Upload your best videos and compete!</p></div>
          </div>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'browse' ? styles.active : ''}`} onClick={() => setTab('browse')}><Video size={18} /> Browse</button>
          <button className={`${styles.tab} ${tab === 'my-challenges' ? styles.active : ''}`} onClick={() => setTab('my-challenges')}><Award size={18} /> My Challenges</button>
          <button className={`${styles.tab} ${tab === 'create' ? styles.active : ''}`} onClick={() => setTab('create')}><Plus size={18} /> Create</button>
        </div>

        {tab === 'create' ? (
          <div className={styles.createForm}>
            <h2><UserPlus size={20} /> Challenge Someone</h2>
            <div className={styles.formGroup}>
              <label>Who do you want to challenge? *</label>
              {selectedChallengedUser ? (
                <div className={styles.selectedUser}>
                  <span>@{selectedChallengedUser.username}{selectedChallengedUser.display_name ? ` (${selectedChallengedUser.display_name})` : ''}</span>
                  <button className={styles.removeUser} onClick={() => { setSelectedChallengedUser(null); setChallengeUsername('') }}><X size={14} /></button>
                </div>
              ) : (
                <div className={styles.userSearchWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input className={styles.input} placeholder="Search username..." value={challengeUsername} onChange={e => searchUsers(e.target.value)} />
                  {userSearchResults.length > 0 && (
                    <div className={styles.userSearchDropdown}>
                      {userSearchResults.map(u => (
                        <button key={u.id} className={styles.userSearchItem} onClick={() => { setSelectedChallengedUser({ id: u.id, username: u.username, display_name: u.display_name }); setUserSearchResults([]); setChallengeUsername('') }}>
                          <div className={styles.searchAvatar}>{u.avatar_url ? <img src={u.avatar_url} alt="" /> : <span>{(u.display_name || u.username)[0]}</span>}</div>
                          <div><strong>@{u.username}</strong>{u.display_name && <span className={styles.searchDisplayName}>{u.display_name}</span>}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.formGroup}><label>Challenge Title *</label><input className={styles.input} placeholder="e.g. Best Fart Impression" value={createTitle} onChange={e => setCreateTitle(e.target.value)} maxLength={100} /></div>
            <div className={styles.formGroup}><label>Description</label><textarea className={styles.textarea} placeholder="Describe the challenge rules..." value={createDesc} onChange={e => setCreateDesc(e.target.value)} rows={3} maxLength={500} /></div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}><label>Category</label><select className={styles.select} value={createCategory} onChange={e => setCreateCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
              <div className={styles.formGroup}><label>Duration (days)</label><select className={styles.select} value={createDeadlineDays} onChange={e => setCreateDeadlineDays(Number(e.target.value))}>{[1,3,5,7,14,30].map(d => <option key={d} value={d}>{d} days</option>)}</select></div>
              <div className={styles.formGroup}><label>Prize (coins)</label><input className={styles.input} type="number" min={0} value={createPrize} onChange={e => setCreatePrize(Math.max(0, Number(e.target.value)))} /></div>
            </div>
            <button className={styles.createBtn} onClick={handleCreateChallenge} disabled={!createTitle.trim() || !selectedChallengedUser || creating}>
              {creating ? <><Loader2 size={16} className={styles.spin} /> Sending Challenge...</> : <><UserPlus size={16} /> Send Challenge</>}
            </button>
          </div>
        ) : (
          <div className={styles.content}>
            {loading ? (
              <div className={styles.loadingState}><div className={styles.spinner} /><p>Loading challenges...</p></div>
            ) : challenges.length === 0 ? (
              <div className={styles.empty}>
                <Video size={64} />
                <h3>{tab === 'my-challenges' ? 'No challenges created' : 'No active challenges'}</h3>
                <p>{tab === 'my-challenges' ? 'Create your first video challenge!' : 'Check back soon or create one yourself!'}</p>
                <button className={styles.createFirstBtn} onClick={() => setTab('create')}><Plus size={18} /> Create Challenge</button>
              </div>
            ) : (
              <div className={styles.challengeGrid}>
                {challenges.map(ch => (
                  <div key={ch.id} className={styles.challengeCard} onClick={() => openChallenge(ch)}>
                    <div className={styles.cardHeader}><span className={styles.categoryBadge}>{ch.category}</span><span className={`${styles.statusBadge} ${styles[ch.status]}`}>{ch.status}</span></div>
                    <h3 className={styles.cardTitle}>{ch.title}</h3>
                    <div className={styles.vsRow}>
                      <span className={styles.vsUser}>{ch.creator?.display_name || ch.creator?.username || 'Unknown'}</span>
                      <span className={styles.vsBadge}>VS</span>
                      <span className={styles.vsUser}>{ch.challenged_user?.display_name || ch.challenged_user?.username || 'Someone'}</span>
                    </div>
                    {ch.description && <p className={styles.cardDesc}>{ch.description}</p>}
                    <div className={styles.cardMeta}>
                      <span><Clock size={13} /> {formatTimeLeft(ch.deadline)}</span>
                      <span><Users size={13} /> {ch.submission_count}</span>
                      {ch.prize_coins > 0 && <span><Trophy size={13} /> {ch.prize_coins}</span>}
                    </div>
                    <div className={styles.cardFooter}><span className={styles.creatorName}>Voting {ch.status === 'active' ? 'starts when both submit' : 'in progress'}</span><ChevronRight size={16} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default ChallengesPage
