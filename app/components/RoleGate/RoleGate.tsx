'use client'

import { useRole, type Permission, ROLE_CONFIG } from '@/app/context/RoleContext'
import { useAuth } from '@/app/context/AuthContext'
import { ShieldAlert } from 'lucide-react'
import Image from 'next/image'
import styles from './RoleGate.module.css'

interface RoleGateProps {
  children: React.ReactNode
  /** Minimum role level required (1-5) */
  minLevel?: number
  /** Specific permission required */
  permission?: Permission
  /** Custom message shown when access is denied */
  fallbackMessage?: string
}

export default function RoleGate({
  children,
  minLevel,
  permission,
  fallbackMessage,
}: RoleGateProps) {
  const { user } = useAuth()
  const { roleLevel, loading, hasPermission, hasMinLevel } = useRole()

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Checking access...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.denied}>
        <ShieldAlert size={64} className={styles.icon} />
        <h2>Authentication Required</h2>
        <p>Please sign in to access this area.</p>
      </div>
    )
  }

  // Check permission or level
  let hasAccess = false
  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (minLevel !== undefined) {
    hasAccess = hasMinLevel(minLevel)
  }

  if (!hasAccess) {
    // Figure out what level is needed to show the right badge
    const neededLevel = minLevel || 1
    const neededConfig = ROLE_CONFIG[neededLevel] || ROLE_CONFIG[1]

    return (
      <div className={styles.denied}>
        <div className={styles.badgeContainer}>
          {neededConfig.badge && (
            <Image
              src={neededConfig.badge}
              alt={neededConfig.title}
              width={120}
              height={120}
              className={styles.badgeImage}
            />
          )}
        </div>
        <h2>Access Restricted</h2>
        <p className={styles.message}>
          {fallbackMessage || `You need at least ${neededConfig.title} (Level ${neededLevel}) access to view this area.`}
        </p>
        {roleLevel > 0 && (
          <p className={styles.currentRole}>
            Your current role: <strong>{ROLE_CONFIG[roleLevel]?.title || 'Member'}</strong> (Level {roleLevel})
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}
