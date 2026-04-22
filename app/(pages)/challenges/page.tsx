'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import {
  Video, Trophy, Clock, Plus, X, Upload, Users,
  ChevronRight, Loader2, Search, UserPlus, History, Coins
} from 'lucide-react'
import styles from './challenges.module.css'

const supabase = createClient()

interface ChallengeUser {
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface ChallengeSubmission {
  id: string
  user_id: string
  video_path: string
  title: string | null
  vote_count: number
}

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
  creator?: ChallengeUser
  challenged_user?: ChallengeUser | null
  creator_submission?: ChallengeSubmission | null
  challenged_submission?: ChallengeSubmission | null
  user_vote?: string | null
  vote_count?: { creator_votes: number; challenged_votes: number; total_votes: number }
}

type Tab = 'my-challenges' | 'voting' | 'history' | 'create'

function ChallengesPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [tab, setTab] = useState<Tab>('my-challenges')
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([])
  const [votingChallenges, setVotingChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

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
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CATEGORIES = ['general', 'funny', 'creative', 'extreme', 'musical', 'prank']

  // ─── Fetch helpers ───
  const resolveUsers = async (ids: string[]): Promise<Record<string, ChallengeUser>> => {
    if (ids.length === 0) return {}
    const { data } = await supabase.from('users').select('id, username, display_name, avatar_url').in('id', ids)
    const map: Record<string, ChallengeUser> = {}
    data?.forEach((u: any) => { map[u.id] = { username: u.username, display_name: u.display_name, avatar_url: u.avatar_url } })
    return map
  }

  const enrichChallenges = async (rows: any[]): Promise<Challenge[]> => {
    if (rows.length === 0) return []

    // Resolve all user IDs
    const allUserIds = [...new Set([
      ...rows.map((c: any) => c.creator_id),
      ...rows.filter((c: any) => c.challenged_user_id).map((c: any) => c.challenged_user_id),
    ])]
    const userMap = await resolveUsers(allUserIds)

    // Get all submissions for these challenges
    const challengeIds = rows.map((c: any) => c.id)
    const { data: allSubs } = await supabase
      .from('challenge_submissions')
      .select('id, challenge_id, user_id, video_path, title, vote_count')
      .in('challenge_id', challengeIds)

    // Get user's votes
    const { data: myVotes } = user
      ? await supabase.from('challenge_votes').select('challenge_id, submission_id').eq('user_id', user.id).in('challenge_id', challengeIds)
      : { data: [] }
    const voteMap: Record<string, string> = {}
    myVotes?.forEach((v: any) => { voteMap[v.challenge_id] = v.submission_id })

    // Build submission map per challenge
    const subsByChallenge: Record<string, any[]> = {}
    allSubs?.forEach((s: any) => {
      if (!subsByChallenge[s.challenge_id]) subsByChallenge[s.challenge_id] = []
      subsByChallenge[s.challenge_id].push(s)
    })

    return rows.map((c: any) => {
      const subs = subsByChallenge[c.id] || []
      const creatorSub = subs.find((s: any) => s.user_id === c.creator_id) || null
      const challengedSub = subs.find((s: any) => s.user_id === c.challenged_user_id) || null

      const creatorVotes = creatorSub?.vote_count || 0
      const challengedVotes = challengedSub?.vote_count || 0

      // Determine what the user voted for — map submission_id to user_id
      let userVote: string | null = null
      if (voteMap[c.id]) {
        const votedSub = subs.find((s: any) => s.id === voteMap[c.id])
        if (votedSub) userVote = votedSub.user_id
      }

      return {
        ...c,
        creator: userMap[c.creator_id] || null,
        challenged_user: c.challenged_user_id ? userMap[c.challenged_user_id] || null : null,
        creator_submission: creatorSub,
        challenged_submission: challengedSub,
        user_vote: userVote,
        vote_count: { creator_votes: creatorVotes, challenged_votes: challengedVotes, total_votes: creatorVotes + challengedVotes },
      }
    })
  }

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      if (tab === 'my-challenges' || tab === 'history') {
        const { data, error } = await supabase
          .from('video_challenges')
          .select('*')
          .or(`creator_id.eq.${user.id},challenged_user_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (error) throw error
        const enriched = await enrichChallenges(data || [])
        if (tab === 'my-challenges') {
          setMyChallenges(enriched.filter(c => ['pending', 'active', 'voting'].includes(c.status)))
        } else {
          setMyChallenges(enriched.filter(c => ['completed', 'draw', 'cancelled'].includes(c.status)))
        }
      } else if (tab === 'voting') {
        const { data, error } = await supabase
          .from('video_challenges')
          .select('*')
          .eq('status', 'voting')
          .order('created_at', { ascending: false })

        if (error) throw error
        const enriched = await enrichChallenges(data || [])
        setVotingChallenges(enriched)
      }
    } catch (err: any) {
      console.error('Error loading challenges:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }, [user, tab])

  useEffect(() => { loadData() }, [loadData])

  // ─── Actions ───
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
      setChallengeUsername(''); setTab('my-challenges'); loadData()
    } catch (err: any) { console.error('Error creating challenge:', JSON.stringify(err, null, 2)); alert('Failed to create challenge: ' + (err?.message || err?.code || 'Unknown error')) }
    finally { setCreating(false) }
  }

  const openSubmitModal = (challenge: Challenge) => {
    setSelectedChallenge(challenge)
    setShowSubmitModal(true)
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
      setUploadProgress(100)
      setShowSubmitModal(false); setUploadFile(null); setUploadTitle(''); setSelectedChallenge(null)
      loadData()
    } catch (err) { console.error('Error uploading video:', err); alert('Failed to upload video') }
    finally { setUploading(false); setUploadProgress(0) }
  }

  const handleVote = async (challengeId: string, votedForUserId: string) => {
    if (!user) return
    try {
      // Find the submission belonging to the voted-for user
      const challenge = votingChallenges.find(c => c.id === challengeId)
      if (!challenge) return
      const sub = votedForUserId === challenge.creator_id
        ? challenge.creator_submission
        : challenge.challenged_submission
      if (!sub) return

      const { error } = await supabase.from('challenge_votes').insert({
        challenge_id: challengeId, submission_id: sub.id, user_id: user.id
      })
      if (error) {
        if (error.code === '23505') { alert('You already voted in this challenge'); return }
        throw error
      }
      // Increment vote count
      try {
        await supabase.from('challenge_submissions')
          .update({ vote_count: (sub.vote_count || 0) + 1 })
          .eq('id', sub.id)
      } catch (_) {}
      loadData()
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

  // ─── Render: Challenge Card (My Challenges / History) ───
  const renderChallengeCard = (ch: Challenge) => {
    const isCreator = user?.id === ch.creator_id
    const isChallenged = user?.id === ch.challenged_user_id
    const mySubmission = isCreator ? ch.creator_submission : ch.challenged_submission
    const opponentSubmission = isCreator ? ch.challenged_submission : ch.creator_submission
    const hasSubmitted = !!mySubmission
    const canSubmit = ch.status === 'active' && !hasSubmitted && (isCreator || isChallenged)

    return (
      <div key={ch.id} className={styles.challengeCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <Video size={20} />
            <span>{ch.title}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[ch.status]}`}>
            {ch.status}
          </div>
        </div>

        <div className={styles.participants}>
          <div className={styles.participant}>
            <div className={styles.participantAvatar}>
              {ch.creator?.avatar_url ? (
                <img src={ch.creator.avatar_url} alt={ch.creator.username} />
              ) : (
                <div className={styles.avatarPlaceholder}>{ch.creator?.username?.[0]?.toUpperCase() || '?'}</div>
              )}
            </div>
            <div className={styles.participantInfo}>
              <span className={styles.participantName}>
                {ch.creator?.display_name || ch.creator?.username || 'Unknown'}
                {isCreator && <span className={styles.youBadge}>(You)</span>}
              </span>
              {ch.creator_submission && <span className={styles.submitted}>✓ Submitted</span>}
            </div>
          </div>

          <div className={styles.vsText}>VS</div>

          <div className={styles.participant}>
            <div className={styles.participantAvatar}>
              {ch.challenged_user?.avatar_url ? (
                <img src={ch.challenged_user.avatar_url} alt={ch.challenged_user.username} />
              ) : (
                <div className={styles.avatarPlaceholder}>{ch.challenged_user?.username?.[0]?.toUpperCase() || '?'}</div>
              )}
            </div>
            <div className={styles.participantInfo}>
              <span className={styles.participantName}>
                {ch.challenged_user?.display_name || ch.challenged_user?.username || 'Pending...'}
                {isChallenged && <span className={styles.youBadge}>(You)</span>}
              </span>
              {ch.challenged_submission && <span className={styles.submitted}>✓ Submitted</span>}
            </div>
          </div>
        </div>

        <div className={styles.challengeDetails}>
          {ch.prize_coins > 0 && (
            <div className={styles.detailItem}>
              <Coins size={16} />
              <span>{ch.prize_coins} coins prize</span>
            </div>
          )}
          {ch.status === 'active' && (
            <div className={styles.detailItem}>
              <Clock size={16} />
              <span>{formatTimeLeft(ch.deadline)}</span>
            </div>
          )}
          {ch.status === 'voting' && (
            <div className={styles.detailItem}>
              <Users size={16} />
              <span>{ch.vote_count?.total_votes || 0} votes</span>
            </div>
          )}
          <div className={styles.detailItem}>
            <span className={styles.categoryBadge}>{ch.category}</span>
          </div>
        </div>

        {canSubmit && (
          <button className={styles.submitButton} onClick={() => openSubmitModal(ch)}>
            Submit Video
            <ChevronRight size={18} />
          </button>
        )}

        {hasSubmitted && ch.status === 'active' && (
          <div className={styles.waitingMessage}>
            ⏳ Waiting for opponent to submit...
          </div>
        )}

        {ch.status === 'completed' && ch.winner_id && (
          <div className={styles.winnerBanner}>
            🏆 Winner: {ch.winner_id === ch.creator_id
              ? (ch.creator?.display_name || ch.creator?.username)
              : (ch.challenged_user?.display_name || ch.challenged_user?.username)}
            {ch.winner_id === user?.id && ' — That\'s you!'}
          </div>
        )}
      </div>
    )
  }

  // ─── Render: Voting Card ───
  const renderVotingCard = (ch: Challenge) => {
    const hasVoted = !!ch.user_vote
    const votedForCreator = ch.user_vote === ch.creator_id

    return (
      <div key={ch.id} className={styles.votingCard}>
        <div className={styles.votingHeader}>
          <h3 className={styles.votingTheme}>
            <Trophy size={20} />
            {ch.title}
          </h3>
          <div className={styles.votingTimeLeft}>
            <Clock size={16} />
            {formatTimeLeft(ch.deadline)}
          </div>
        </div>

        <div className={styles.votingContestants}>
          {/* Creator */}
          <div className={`${styles.contestantCard} ${hasVoted && votedForCreator ? styles.voted : ''}`}>
            <div className={styles.contestantHeader}>
              <div className={styles.contestantAvatar}>
                {ch.creator?.avatar_url ? (
                  <img src={ch.creator.avatar_url} alt={ch.creator.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{ch.creator?.username?.[0]?.toUpperCase() || '?'}</div>
                )}
              </div>
              <div>
                <h4>{ch.creator?.display_name || ch.creator?.username}</h4>
                <span className={styles.voteCount}>{ch.vote_count?.creator_votes || 0} votes</span>
              </div>
            </div>

            {ch.creator_submission && (
              <div className={styles.videoPreview}>
                <video
                  src={getVideoUrl(ch.creator_submission.video_path)}
                  className={styles.votingVideo}
                  controls
                  preload="metadata"
                  playsInline
                />
              </div>
            )}

            {!hasVoted && ch.creator_submission && user?.id !== ch.creator_id && user?.id !== ch.challenged_user_id && (
              <button
                className={styles.voteButton}
                onClick={() => handleVote(ch.id, ch.creator_id)}
              >
                Vote for this video
              </button>
            )}

            {hasVoted && votedForCreator && (
              <div className={styles.votedBadge}>✓ You voted for this</div>
            )}
          </div>

          {/* Challenged User */}
          <div className={`${styles.contestantCard} ${hasVoted && !votedForCreator ? styles.voted : ''}`}>
            <div className={styles.contestantHeader}>
              <div className={styles.contestantAvatar}>
                {ch.challenged_user?.avatar_url ? (
                  <img src={ch.challenged_user.avatar_url} alt={ch.challenged_user.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{ch.challenged_user?.username?.[0]?.toUpperCase() || '?'}</div>
                )}
              </div>
              <div>
                <h4>{ch.challenged_user?.display_name || ch.challenged_user?.username}</h4>
                <span className={styles.voteCount}>{ch.vote_count?.challenged_votes || 0} votes</span>
              </div>
            </div>

            {ch.challenged_submission && (
              <div className={styles.videoPreview}>
                <video
                  src={getVideoUrl(ch.challenged_submission.video_path)}
                  className={styles.votingVideo}
                  controls
                  preload="metadata"
                  playsInline
                />
              </div>
            )}

            {!hasVoted && ch.challenged_submission && user?.id !== ch.creator_id && user?.id !== ch.challenged_user_id && (
              <button
                className={styles.voteButton}
                onClick={() => handleVote(ch.id, ch.challenged_user_id!)}
              >
                Vote for this video
              </button>
            )}

            {hasVoted && !votedForCreator && (
              <div className={styles.votedBadge}>✓ You voted for this</div>
            )}
          </div>
        </div>

        {hasVoted && (
          <div className={styles.rewardMessage}>
            🎉 Thanks for voting! You earned 5 FB coins!
          </div>
        )}
      </div>
    )
  }

  // ─── Main Render ───
  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to participate in video challenges">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Video size={32} className={styles.headerIcon} />
            <div>
              <h1>Video Challenges</h1>
              <p>Challenge others and prove your skills!</p>
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'my-challenges' ? styles.active : ''}`} onClick={() => setTab('my-challenges')}>
            <Video size={18} /> My Challenges
          </button>
          <button className={`${styles.tab} ${tab === 'voting' ? styles.active : ''}`} onClick={() => setTab('voting')}>
            <Trophy size={18} /> Voting
          </button>
          <button className={`${styles.tab} ${tab === 'history' ? styles.active : ''}`} onClick={() => setTab('history')}>
            <History size={18} /> History
          </button>
          <button className={`${styles.tab} ${tab === 'create' ? styles.active : ''}`} onClick={() => setTab('create')}>
            <Plus size={18} /> Create
          </button>
        </div>

        <div className={styles.content}>
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
                <div className={styles.formGroup}><label>Duration (days)</label><select className={styles.select} value={createDeadlineDays} onChange={e => setCreateDeadlineDays(Number(e.target.value))}>{[1, 3, 5, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}</select></div>
                <div className={styles.formGroup}><label>Prize (coins)</label><input className={styles.input} type="number" min={0} value={createPrize} onChange={e => setCreatePrize(Math.max(0, Number(e.target.value)))} /></div>
              </div>
              <button className={styles.createBtn} onClick={handleCreateChallenge} disabled={!createTitle.trim() || !selectedChallengedUser || creating}>
                {creating ? <><Loader2 size={16} className={styles.spin} /> Sending Challenge...</> : <><UserPlus size={16} /> Send Challenge</>}
              </button>
            </div>
          ) : loading ? (
            <div className={styles.loadingState}><div className={styles.spinner} /><p>Loading challenges...</p></div>
          ) : (
            <>
              {tab === 'my-challenges' && (
                <div className={styles.challengeGrid}>
                  {myChallenges.length === 0 ? (
                    <div className={styles.empty}>
                      <Video size={64} />
                      <h3>No active challenges</h3>
                      <p>Challenge someone to start a video battle!</p>
                      <button className={styles.createFirstBtn} onClick={() => setTab('create')}><Plus size={18} /> Create Challenge</button>
                    </div>
                  ) : (
                    myChallenges.map(renderChallengeCard)
                  )}
                </div>
              )}

              {tab === 'voting' && (
                <div className={styles.votingList}>
                  {votingChallenges.length === 0 ? (
                    <div className={styles.empty}>
                      <Trophy size={64} />
                      <h3>No challenges available for voting</h3>
                      <p>Check back soon to vote and earn FB coins!</p>
                    </div>
                  ) : (
                    votingChallenges.map(renderVotingCard)
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div className={styles.challengeGrid}>
                  {myChallenges.length === 0 ? (
                    <div className={styles.empty}>
                      <History size={64} />
                      <h3>No challenge history</h3>
                      <p>Your completed challenges will appear here</p>
                    </div>
                  ) : (
                    myChallenges.map(renderChallengeCard)
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload Video Modal */}
        {showSubmitModal && selectedChallenge && (
          <div className={styles.modalOverlay} onClick={() => !uploading && setShowSubmitModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Submit Your Video</h2>
                <button className={styles.modalClose} onClick={() => !uploading && setShowSubmitModal(false)}><X size={20} /></button>
              </div>
              <p className={styles.modalTheme}>Challenge: <strong>{selectedChallenge.title}</strong></p>
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

export default ChallengesPage
