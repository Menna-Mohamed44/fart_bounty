'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, X, Swords, Trophy, Clock, AlertCircle, Trash2, Heart, MessageCircle, Share2, Users, Video, Flame, Laugh } from 'lucide-react'
import { useNotifications } from '@/app/context/NotificationsContext'
import { useBattles } from '@/app/context/BattlesContext'
import { useAuth } from '@/app/context/AuthContext'
import styles from './NotificationDropdown.module.css'

export default function NotificationDropdown() {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { acceptChallenge, declineChallenge } = useBattles()
  const [open, setOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return date.toLocaleDateString()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'battle_challenge': return <Swords size={16} className={styles.iconChallenge} />
      case 'battle_accepted':
      case 'battle_started': return <Clock size={16} className={styles.iconActive} />
      case 'battle_voting_started': return <Trophy size={16} className={styles.iconVoting} />
      case 'battle_won': return <Trophy size={16} className={styles.iconWon} />
      case 'battle_lost': return <AlertCircle size={16} className={styles.iconLost} />
      case 'post_liked': return <Heart size={16} className={styles.iconLike} />
      case 'post_commented': return <MessageCircle size={16} className={styles.iconComment} />
      case 'post_shared': return <Share2 size={16} className={styles.iconShare} />
      case 'group_discussion_liked':
      case 'group_comment_liked': return <Users size={16} className={styles.iconGroup} />
      case 'group_discussion_commented': return <MessageCircle size={16} className={styles.iconGroup} />
      case 'confessional_reacted': return <Flame size={16} className={styles.iconConfessional} />
      case 'confessional_commented': return <MessageCircle size={16} className={styles.iconConfessional} />
      case 'joke_reacted': return <Laugh size={16} className={styles.iconJoke} />
      case 'challenge_received':
      case 'challenge_submission': return <Video size={16} className={styles.iconChallenge} />
      case 'challenge_voted': return <Trophy size={16} className={styles.iconVoting} />
      default: return <Bell size={16} />
    }
  }

  const handleClick = async (n: any) => {
    if (!n.read) await markAsRead(n.id)
    setOpen(false)
    if (n.battle_id) router.push('/battles')
    else if (n.challenge_id) router.push('/challenges')
    else if (n.group_id) router.push('/groups')
    else if (n.confessional_id) router.push('/confessional')
    else if (n.joke_id) router.push('/fart-jokes')
    else if (n.post_id) router.push(`/home?scrollTo=${n.post_id}`)
    else router.push('/notifications')
  }

  const handleAccept = async (battleId: string, notifId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActionLoading(battleId)
    const result = await acceptChallenge(battleId)
    if (result.success) {
      await markAsRead(notifId)
      setOpen(false)
      router.push('/battles')
    }
    setActionLoading(null)
  }

  const handleDecline = async (battleId: string, notifId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActionLoading(battleId)
    const result = await declineChallenge(battleId)
    if (result.success) await markAsRead(notifId)
    setActionLoading(null)
  }

  const handleDelete = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(notifId)
  }

  if (!user) return null

  const recent = notifications.slice(0, 15)

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notifications</span>
            <div className={styles.dropdownActions}>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={markAllAsRead} title="Mark all read">
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                className={styles.viewAllBtn}
                onClick={() => { setOpen(false); router.push('/notifications') }}
              >
                View all
              </button>
            </div>
          </div>

          <div className={styles.dropdownList}>
            {loading ? (
              <div className={styles.dropdownEmpty}>Loading…</div>
            ) : recent.length === 0 ? (
              <div className={styles.dropdownEmpty}>No notifications</div>
            ) : (
              recent.map(n => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={styles.itemIcon}>{getIcon(n.type)}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemTitle}>{n.title}</p>
                    <p className={styles.itemMsg}>{n.message}</p>
                    {n.type === 'battle_challenge' && n.battle_id && !n.read && (
                      <div className={styles.itemActions}>
                        <button
                          className={styles.acceptBtn}
                          onClick={(e) => handleAccept(n.battle_id!, n.id, e)}
                          disabled={actionLoading === n.battle_id}
                        >
                          <Check size={12} /> Accept
                        </button>
                        <button
                          className={styles.declineBtn}
                          onClick={(e) => handleDecline(n.battle_id!, n.id, e)}
                          disabled={actionLoading === n.battle_id}
                        >
                          <X size={12} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemTime}>{formatTimeAgo(n.created_at)}</span>
                    <button className={styles.itemDeleteBtn} onClick={(e) => handleDelete(n.id, e)} title="Delete">
                      <X size={12} />
                    </button>
                  </div>
                  {!n.read && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
