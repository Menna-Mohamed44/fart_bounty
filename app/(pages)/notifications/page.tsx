'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useNotifications } from '@/app/context/NotificationsContext'
import { useBattles } from '@/app/context/BattlesContext'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import { Bell, Check, CheckCheck, X, Swords, Trophy, Clock, AlertCircle, Trash2 } from 'lucide-react'
import styles from './notifications.module.css'

function NotificationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { acceptChallenge, declineChallenge } = useBattles()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'battle_challenge':
        return <Swords size={20} className={styles.iconChallenge} />
      case 'battle_accepted':
      case 'battle_started':
        return <Clock size={20} className={styles.iconActive} />
      case 'battle_voting_started':
        return <Trophy size={20} className={styles.iconVoting} />
      case 'battle_won':
        return <Trophy size={20} className={styles.iconWon} />
      case 'battle_lost':
        return <AlertCircle size={20} className={styles.iconLost} />
      case 'battle_draw':
        return <CheckCheck size={20} className={styles.iconDraw} />
      case 'battle_cancelled':
        return <X size={20} className={styles.iconCancelled} />
      case 'post_liked':
        return <Bell size={20} className={styles.iconLiked} />
      case 'post_commented':
        return <Bell size={20} className={styles.iconCommented} />
      case 'post_shared':
        return <Bell size={20} className={styles.iconShared} />
      default:
        return <Bell size={20} />
    }
  }

  const handleAcceptChallenge = async (battleId: string, notificationId: string) => {
    setActionLoading(battleId)
    const result = await acceptChallenge(battleId)
    
    if (result.success) {
      await markAsRead(notificationId)
      router.push('/battles')
    } else {
      alert(result.message || 'Failed to accept challenge')
    }
    setActionLoading(null)
  }

  const handleDeclineChallenge = async (battleId: string, notificationId: string) => {
    setActionLoading(battleId)
    const result = await declineChallenge(battleId)
    
    if (result.success) {
      await markAsRead(notificationId)
    } else {
      alert(result.message || 'Failed to decline challenge')
    }
    setActionLoading(null)
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.battle_id) {
      router.push('/battles')
    } else if (notification.post_id) {
      // Navigate to home with post ID as query parameter
      router.push(`/home?scrollTo=${notification.post_id}`)
    }
  }

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this notification?')) {
      await deleteNotification(notificationId)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <AuthGate requireAuth={true} promptMessage="Sign in to view your notifications">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerTitleRow}>
              <Bell size={32} className={styles.headerIcon} aria-hidden />
              <h1>Notifications</h1>
            </div>
            <p className={styles.headerSubtitle}>
              Stay updated with your battles, posts, and interactions
            </p>
          </div>

          <div className={styles.headerActions}>
            {notifications.some(n => !n.read) && (
              <button
                className={styles.markAllButton}
                onClick={markAllAsRead}
              >
                <CheckCheck size={18} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
            <span className={styles.count}>{notifications.length}</span>
          </button>
          <button
            className={`${styles.filterTab} ${filter === 'unread' ? styles.active : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
            <span className={styles.count}>{notifications.filter(n => !n.read).length}</span>
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={64} className={styles.emptyIcon} />
            <h3>No notifications</h3>
            <p>
              {filter === 'unread' 
                ? "You're all caught up!" 
                : 'Notifications will appear here when you receive battle challenges, post interactions, or updates'}
            </p>
          </div>
        ) : (
          <div className={styles.notificationsList}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationCard} ${!notification.read ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h4>{notification.title}</h4>
                    <span className={styles.time}>{formatTimeAgo(notification.created_at)}</span>
                  </div>
                  <p className={styles.message}>{notification.message}</p>

                  {/* Action buttons for challenge invitations */}
                  {notification.type === 'battle_challenge' && notification.battle_id && !notification.read && (
                    <div className={styles.actions}>
                      <button
                        className={styles.acceptButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAcceptChallenge(notification.battle_id!, notification.id)
                        }}
                        disabled={actionLoading === notification.battle_id}
                      >
                        <Check size={16} />
                        {actionLoading === notification.battle_id ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        className={styles.declineButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeclineChallenge(notification.battle_id!, notification.id)
                        }}
                        disabled={actionLoading === notification.battle_id}
                      >
                        <X size={16} />
                        Decline
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDelete(notification.id, e)}
                  title="Delete notification"
                >
                  <Trash2 size={16} />
                </button>

                {!notification.read && <div className={styles.unreadDot}></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  )
}

export default NotificationsPage
