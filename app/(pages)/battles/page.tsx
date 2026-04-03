'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useBattles, type BattleWithDetails } from '@/app/context/BattlesContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Swords, Trophy, History, Clock, Play, Pause, Users, Coins, ChevronRight } from 'lucide-react'
import styles from './battles.module.css'

function BattlesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { fbCoins } = useCurrency()
  const { submitToBattle, voteInBattle, getBattleDetails, getMyBattles, getVotingBattles } = useBattles()
  const [tab, setTab] = useState<'my-battles' | 'voting' | 'history'>('my-battles')
  const [myBattles, setMyBattles] = useState<BattleWithDetails[]>([])
  const [votingBattles, setVotingBattles] = useState<BattleWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false)
  const [selectedBattle, setSelectedBattle] = useState<BattleWithDetails | null>(null)
  const [userSounds, setUserSounds] = useState<any[]>([])
  const [playingSound, setPlayingSound] = useState<string | null>(null)
  const supabase = createClient()

  const trackChallenge = (challengeId: string, periodKey: string | null) => {
    if (!user) return
    ;(supabase as any).rpc('increment_challenge_progress', {
      p_user_id: user.id,
      p_challenge_id: challengeId,
      p_period_key: periodKey,
    }).then(() => {}).catch(() => {})
  }

  useEffect(() => {
    loadData()
  }, [tab, user])

  const loadData = async () => {
    setLoading(true)
    
    if (tab === 'my-battles' || tab === 'history') {
      const battles = await getMyBattles()
      if (tab === 'my-battles') {
        setMyBattles(battles.filter(b => ['pending', 'active', 'voting'].includes(b.status)))
      } else {
        setMyBattles(battles.filter(b => ['completed', 'draw', 'cancelled'].includes(b.status)))
      }
    } else if (tab === 'voting') {
      const battles = await getVotingBattles()
      setVotingBattles(battles)
    }
    
    setLoading(false)
  }

  const loadUserSounds = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('sounds')
      .select('*')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setUserSounds(data)
    }
  }

  const handleSubmitSound = async (battleId: string, soundId: string) => {
    const result = await submitToBattle(battleId, soundId)
    
    if (result.success) {
      setSubmissionModalOpen(false)
      setSelectedBattle(null)
      loadData()
    } else {
      alert(result.message)
    }
  }

  const handleVote = async (battleId: string, votedForUserId: string) => {
    const result = await voteInBattle(battleId, votedForUserId)
    
    if (result.success) {
      const today = new Date().toISOString().slice(0, 10)
      trackChallenge('d2', today)
      loadData()
    } else {
      alert(result.message)
    }
  }

  const openSubmissionModal = async (battle: BattleWithDetails) => {
    setSelectedBattle(battle)
    await loadUserSounds()
    setSubmissionModalOpen(true)
  }

  const formatTimeRemaining = (deadline: string | null) => {
    if (!deadline) return 'N/A'
    
    const now = new Date()
    const end = new Date(deadline)
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h left`
    }
    
    return `${hours}h ${minutes}m left`
  }

  const playSound = async (soundPath: string, soundId: string) => {
    if (playingSound === soundId) {
      setPlayingSound(null)
      return
    }

    try {
      const { data } = supabase.storage.from('sounds').getPublicUrl(soundPath)
      const audio = new Audio(data.publicUrl)
      audio.play()
      setPlayingSound(soundId)
      audio.onended = () => setPlayingSound(null)
    } catch (error) {
      console.error('Failed to play sound:', error)
    }
  }

  const renderBattleCard = (battle: BattleWithDetails) => {
    const isChallenger = user?.id === battle.challenger_id
    const isOpponent = user?.id === battle.opponent_id
    const mySubmission = isChallenger ? battle.challenger_submission : battle.opponent_submission
    const opponentSubmission = isChallenger ? battle.opponent_submission : battle.challenger_submission
    const hasSubmitted = !!mySubmission
    const canSubmit = battle.status === 'active' && !hasSubmitted

    return (
      <div key={battle.id} className={styles.battleCard}>
        <div className={styles.battleHeader}>
          <div className={styles.battleTheme}>
            <Swords size={20} />
            <span>{battle.theme}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[battle.status]}`}>
            {battle.status}
          </div>
        </div>

        <div className={styles.battleParticipants}>
          <div className={styles.participant}>
            <div className={styles.participantAvatar}>
              {battle.challenger?.avatar_url ? (
                <img src={battle.challenger.avatar_url} alt={battle.challenger.username} />
              ) : (
                <div className={styles.avatarPlaceholder}>{battle.challenger?.username[0]?.toUpperCase()}</div>
              )}
            </div>
            <div className={styles.participantInfo}>
              <span className={styles.participantName}>
                {battle.challenger?.display_name || battle.challenger?.username}
                {isChallenger && <span className={styles.youBadge}>(You)</span>}
              </span>
              {battle.challenger_submission && <span className={styles.submitted}>✓ Submitted</span>}
            </div>
          </div>

          <div className={styles.vsText}>VS</div>

          <div className={styles.participant}>
            <div className={styles.participantAvatar}>
              {battle.opponent?.avatar_url ? (
                <img src={battle.opponent.avatar_url} alt={battle.opponent.username} />
              ) : (
                <div className={styles.avatarPlaceholder}>{battle.opponent?.username[0]?.toUpperCase()}</div>
              )}
            </div>
            <div className={styles.participantInfo}>
              <span className={styles.participantName}>
                {battle.opponent?.display_name || battle.opponent?.username}
                {isOpponent && <span className={styles.youBadge}>(You)</span>}
              </span>
              {battle.opponent_submission && <span className={styles.submitted}>✓ Submitted</span>}
            </div>
          </div>
        </div>

        <div className={styles.battleDetails}>
          <div className={styles.detailItem}>
            <Coins size={16} />
            <span>{battle.wager_amount * 2} FB coins</span>
          </div>
          {battle.status === 'active' && (
            <div className={styles.detailItem}>
              <Clock size={16} />
              <span>{formatTimeRemaining(battle.submission_deadline)}</span>
            </div>
          )}
          {battle.status === 'voting' && (
            <div className={styles.detailItem}>
              <Users size={16} />
              <span>{battle.vote_count?.total_votes || 0} votes</span>
            </div>
          )}
        </div>

        {canSubmit && (
          <button
            className={styles.submitButton}
            onClick={() => openSubmissionModal(battle)}
          >
            Submit Sound
            <ChevronRight size={18} />
          </button>
        )}

        {hasSubmitted && battle.status === 'active' && (
          <div className={styles.waitingMessage}>
            ⏳ Waiting for opponent to submit...
          </div>
        )}
      </div>
    )
  }

  const renderVotingCard = (battle: BattleWithDetails) => {
    const hasVoted = !!battle.user_vote
    const votedForChallenger = battle.user_vote === battle.challenger_id

    return (
      <div key={battle.id} className={styles.votingCard}>
        <div className={styles.votingHeader}>
          <h3 className={styles.votingTheme}>
            <Trophy size={20} />
            {battle.theme}
          </h3>
          <div className={styles.votingTimeLeft}>
            <Clock size={16} />
            {formatTimeRemaining(battle.voting_deadline)}
          </div>
        </div>

        <div className={styles.votingContestants}>
          {/* Challenger */}
          <div className={`${styles.contestantCard} ${hasVoted && votedForChallenger ? styles.voted : ''}`}>
            <div className={styles.contestantHeader}>
              <div className={styles.contestantAvatar}>
                {battle.challenger?.avatar_url ? (
                  <img src={battle.challenger.avatar_url} alt={battle.challenger.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{battle.challenger?.username[0]?.toUpperCase()}</div>
                )}
              </div>
              <div>
                <h4>{battle.challenger?.display_name || battle.challenger?.username}</h4>
                <span className={styles.voteCount}>{battle.vote_count?.challenger_votes || 0} votes</span>
              </div>
            </div>

            {battle.challenger_submission?.sound && (
              <button
                className={styles.playButton}
                onClick={() => playSound(battle.challenger_submission!.sound!.storage_path, battle.challenger_submission!.sound!.id)}
              >
                {playingSound === battle.challenger_submission.sound.id ? <Pause size={20} /> : <Play size={20} />}
                {battle.challenger_submission.sound.name}
              </button>
            )}

            {!hasVoted && (
              <button
                className={styles.voteButton}
                onClick={() => handleVote(battle.id, battle.challenger_id)}
              >
                Vote for this sound
              </button>
            )}

            {hasVoted && votedForChallenger && (
              <div className={styles.votedBadge}>✓ You voted for this</div>
            )}
          </div>

          {/* Opponent */}
          <div className={`${styles.contestantCard} ${hasVoted && !votedForChallenger ? styles.voted : ''}`}>
            <div className={styles.contestantHeader}>
              <div className={styles.contestantAvatar}>
                {battle.opponent?.avatar_url ? (
                  <img src={battle.opponent.avatar_url} alt={battle.opponent.username} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{battle.opponent?.username[0]?.toUpperCase()}</div>
                )}
              </div>
              <div>
                <h4>{battle.opponent?.display_name || battle.opponent?.username}</h4>
                <span className={styles.voteCount}>{battle.vote_count?.opponent_votes || 0} votes</span>
              </div>
            </div>

            {battle.opponent_submission?.sound && (
              <button
                className={styles.playButton}
                onClick={() => playSound(battle.opponent_submission!.sound!.storage_path, battle.opponent_submission!.sound!.id)}
              >
                {playingSound === battle.opponent_submission.sound.id ? <Pause size={20} /> : <Play size={20} />}
                {battle.opponent_submission.sound.name}
              </button>
            )}

            {!hasVoted && (
              <button
                className={styles.voteButton}
                onClick={() => handleVote(battle.id, battle.opponent_id)}
              >
                Vote for this sound
              </button>
            )}

            {hasVoted && !votedForChallenger && (
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

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to participate in battles">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Swords size={32} className={styles.headerIcon} />
            <div>
              <h1>Sound Battles</h1>
              <p>Challenge others and prove your sound-making skills!</p>
            </div>
          </div>
          <div className={styles.coinDisplay}>
            <Coins size={20} />
            <span>{fbCoins} FB Coins</span>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'my-battles' ? styles.active : ''}`}
            onClick={() => setTab('my-battles')}
          >
            <Swords size={18} />
            My Battles
          </button>
          <button
            className={`${styles.tab} ${tab === 'voting' ? styles.active : ''}`}
            onClick={() => setTab('voting')}
          >
            <Trophy size={18} />
            Voting
          </button>
          <button
            className={`${styles.tab} ${tab === 'history' ? styles.active : ''}`}
            onClick={() => setTab('history')}
          >
            <History size={18} />
            History
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading battles...</p>
            </div>
          ) : (
            <>
              {tab === 'my-battles' && (
                <div className={styles.battlesGrid}>
                  {myBattles.length === 0 ? (
                    <div className={styles.empty}>
                      <Swords size={64} />
                      <h3>No active battles</h3>
                      <p>Challenge someone from their profile to start a battle!</p>
                    </div>
                  ) : (
                    myBattles.map(renderBattleCard)
                  )}
                </div>
              )}

              {tab === 'voting' && (
                <div className={styles.votingList}>
                  {votingBattles.length === 0 ? (
                    <div className={styles.empty}>
                      <Trophy size={64} />
                      <h3>No battles available for voting</h3>
                      <p>Check back soon to vote and earn FB coins!</p>
                    </div>
                  ) : (
                    votingBattles.map(renderVotingCard)
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div className={styles.battlesGrid}>
                  {myBattles.length === 0 ? (
                    <div className={styles.empty}>
                      <History size={64} />
                      <h3>No battle history</h3>
                      <p>Your completed battles will appear here</p>
                    </div>
                  ) : (
                    myBattles.map(renderBattleCard)
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Submission Modal */}
        {submissionModalOpen && selectedBattle && (
          <div className={styles.modalOverlay} onClick={() => setSubmissionModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2>Submit Sound</h2>
              <p className={styles.modalTheme}>Theme: <strong>{selectedBattle.theme}</strong></p>

              <div className={styles.soundsList}>
                {userSounds.length === 0 ? (
                  <p className={styles.noSounds}>You don't have any sounds yet. Visit the generator to create one!</p>
                ) : (
                  userSounds.map((sound) => (
                    <div key={sound.id} className={styles.soundItem}>
                      <button
                        className={styles.soundPlayButton}
                        onClick={() => playSound(sound.storage_path, sound.id)}
                      >
                        {playingSound === sound.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <span className={styles.soundName}>{sound.name}</span>
                      <button
                        className={styles.selectSoundButton}
                        onClick={() => handleSubmitSound(selectedBattle.id, sound.id)}
                      >
                        Select
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button className={styles.closeModalButton} onClick={() => setSubmissionModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default BattlesPage
