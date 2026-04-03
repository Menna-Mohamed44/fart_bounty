'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/context/AuthContext'
import { useCurrency } from '@/app/context/CurrencyContext'
import { useNotifications } from '@/app/context/NotificationsContext'
import { usePremium, TIER_CONFIGS } from '@/app/context/PremiumContext'
import { useRole } from '@/app/context/RoleContext'
import {
  Home,
  User,
  BookOpen,
  Gamepad2,
  Trophy,
  Zap,
  MessageSquare,
  Settings,
  Crown,
  Package,
  Library,
  Coins,
  LogOut,
  Bell,
  Swords,
  Award,
  Shield,
  Bot,
  Sparkles,
  HelpCircle,
  Users,
  Store,
  Newspaper
} from 'lucide-react'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { fbCoins, fbGold, loading: coinsLoading } = useCurrency()
  const { unreadCount } = useNotifications()
  const { premiumTier } = usePremium()
  const { roleLevel, roleConfig, hasPermission } = useRole()
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => pathname === path

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        // Could show a toast notification here if needed
        alert('Failed to sign out. Please try again.')
        return
      }
      
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out. Please try again.')
    }
  }

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <h1>Fart Bounty</h1>
      </div>

      {/* User Profile Section */}
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" />
          ) : (
            <span>{user?.display_name?.[0] || user?.username?.[0] || 'G'}</span>
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {user?.display_name || user?.username || 'Guest User'}
            {premiumTier !== 'free' && (
              <span className={styles.verifiedBadge} title="Premium Member">
                <Crown size={16} />
              </span>
            )}
            {roleLevel > 0 && roleConfig.badge && (
              <span className={styles.roleBadge} title={roleConfig.title}>
                <Image src={roleConfig.badge} alt={roleConfig.title} width={22} height={22} />
              </span>
            )}
          </div>
          <div className={styles.userHandle}>
            @{user?.username || 'guest'}
          </div>
          <div className={styles.currencyContainer}>
            <div className={styles.userCoins}>
              <Coins size={16} />
              <span>{coinsLoading ? '...' : fbCoins.toLocaleString()}</span>
            </div>
            <div className={styles.userGold}>
              <Award size={16} />
              <span>{coinsLoading ? '...' : fbGold.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <Link href="/settings" className={styles.settingsButton} aria-label="Settings">
          <Settings size={20} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {/* HOME Section */}
        <div className={styles.navSection}>
          <div className={styles.sectionLabel}>HOME</div>
          <Link
            href={user?.username ? `/home` : '/'}
            className={`${styles.navLink} ${pathname?.includes(`/${user?.username}`) && !isActive(`/${user?.username}`) ? styles.active : ''}`}
          >
            <Home size={20} />
            <span>Latest</span>
          </Link>

          {user?.username ? (
            <Link
              href={`/${user.username}`}
              className={`${styles.navLink} ${isActive(`/${user.username}`) ? styles.active : ''}`}
            >
              <User size={20} />
              <span>Profile</span>
            </Link>
          ) : (
            <div 
              className={`${styles.navLink} ${styles.disabled}`}
              title="Profile not available"
            >
              <User size={20} />
              <span>Profile</span>
            </div>
          )}

          <Link
            href="/stories"
            className={`${styles.navLink} ${isActive('/stories') ? styles.active : ''}`}
          >
            <BookOpen size={20} />
            <span>Stories</span>
          </Link>

          <Link
            href="/notifications"
            className={`${styles.navLink} ${isActive('/notifications') ? styles.active : ''}`}
          >
            <div className={styles.iconWithBadge}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </div>
            <span>Notifications</span>
          </Link>

          <Link
            href="/battles"
            className={`${styles.navLink} ${isActive('/battles') ? styles.active : ''}`}
          >
            <Swords size={20} />
            <span>Battles</span>
          </Link>

          <Link
            href="/challenges"
            className={`${styles.navLink} ${isActive('/challenges') ? styles.active : ''}`}
          >
            <Trophy size={20} />
            <span>Challenges</span>
          </Link>

          <Link
            href="/hall-of-fame"
            className={`${styles.navLink} ${isActive('/hall-of-fame') ? styles.active : ''}`}
          >
            <Award size={20} />
            <span>Hall of Fame</span>
          </Link>

          <Link
            href="/assets"
            className={`${styles.navLink} ${isActive('/assets') ? styles.active : ''}`}
          >
            <Package size={20} />
            <span>Assets</span>
          </Link>

          <Link
            href="/media-library"
            className={`${styles.navLink} ${isActive('/media-library') ? styles.active : ''}`}
          >
            <Library size={20} />
            <span>Media Library</span>
          </Link>

          <Link
            href="/groups"
            className={`${styles.navLink} ${isActive('/groups') ? styles.active : ''}`}
          >
            <Users size={20} />
            <span>Fart Groups</span>
          </Link>

          <Link
            href="/news"
            className={`${styles.navLink} ${isActive('/news') ? styles.active : ''}`}
          >
            <Newspaper size={20} />
            <span>Fart News</span>
          </Link>

        </div>

        {/* STAFF Section - visible to anyone with a role (level 1+) */}
        {roleLevel >= 1 && (
          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>STAFF</div>

            {hasPermission('moderation.view') && (
              <Link
                href="/moderation"
                className={`${styles.navLink} ${styles.staffLink} ${isActive('/moderation') ? styles.active : ''}`}
              >
                <Shield size={20} />
                <span>Moderation</span>
              </Link>
            )}

            {hasPermission('bots.view') && (
              <Link
                href="/admin/bots"
                className={`${styles.navLink} ${styles.staffLink} ${isActive('/admin/bots') ? styles.active : ''}`}
              >
                <Bot size={20} />
                <span>Bot Manager</span>
              </Link>
            )}

            {hasPermission('content.manage') && (
              <Link
                href="/admin/content"
                className={`${styles.navLink} ${styles.staffLink} ${isActive('/admin/content') ? styles.active : ''}`}
              >
                <Library size={20} />
                <span>Content Manager</span>
              </Link>
            )}

            {hasPermission('roles.manage') && (
              <Link
                href="/admin/roles"
                className={`${styles.navLink} ${styles.staffLink} ${isActive('/admin/roles') ? styles.active : ''}`}
              >
                <Users size={20} />
                <span>Role Manager</span>
              </Link>
            )}

            {hasPermission('admin.full') && (
              <Link
                href="/admin/notes"
                className={`${styles.navLink} ${styles.staffLink} ${isActive('/admin/notes') ? styles.active : ''}`}
              >
                <MessageSquare size={20} />
                <span>User Notes</span>
              </Link>
            )}
          </div>
        )}

        {/* FUN Section */}
        <div className={styles.navSection}>
          <div className={styles.sectionLabel}>FUN</div>
          <Link
            href="/games"
            className={`${styles.navLink} ${isActive('/games') ? styles.active : ''}`}
          >
            <Gamepad2 size={20} />
            <span>Games</span>
          </Link>

          <Link
            href="/generator"
            className={`${styles.navLink} ${isActive('/generator') ? styles.active : ''}`}
          >
            <Zap size={20} />
            <span>Generator</span>
          </Link>

          <Link
            href="/confessional"
            className={`${styles.navLink} ${isActive('/confessional') ? styles.active : ''}`}
          >
            <MessageSquare size={20} />
            <span>Confessional</span>
          </Link>

          <Link
            href="/help"
            className={`${styles.navLink} ${isActive('/help') ? styles.active : ''}`}
          >
            <HelpCircle size={20} />
            <span>Help</span>
          </Link>
        </div>
      </nav>

      {/* Premium Button - links to settings */}
      <div className={styles.premiumSection}>
        {premiumTier !== 'free' ? (
          <Link href="/settings" className={styles.premiumCurrentTier}>
            <Crown size={16} />
            <span>{TIER_CONFIGS[premiumTier].name}</span>
          </Link>
        ) : (
          <Link href="/settings" className={styles.premiumButton}>
            <Sparkles size={16} />
            <span>Become Premium</span>
          </Link>
        )}
      </div>

      {/* Marketplace Button */}
      <div className={styles.marketplace}>
        <Link href="/shop" className={styles.marketplaceButton}>
          MARKETPLACE
        </Link>
      </div>

      {/* Sign Out Button */}
      <div className={styles.signOutSection}>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  )
}