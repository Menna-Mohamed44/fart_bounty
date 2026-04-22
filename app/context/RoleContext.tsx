'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { createClient } from '../lib/supabaseClient'

// ── Role Levels ──────────────────────────────────────────────
// 0 = Regular user (no role)
// 1 = Junior Moderator   → view flagged content, dismiss flags
// 2 = Moderator          → full content moderation (remove, warn, review)
// 3 = Senior Moderator   → bot management, ban users
// 4 = Content Manager    → manage audio library, site content, store
// 5 = Admin              → full access to everything

export type Permission =
  | 'moderation.view'
  | 'moderation.action'
  | 'moderation.ban'
  | 'bots.view'
  | 'bots.manage'
  | 'content.manage'
  | 'store.manage'
  | 'users.manage'
  | 'roles.manage'
  | 'admin.full'

// Which permissions each level unlocks (cumulative)
const LEVEL_PERMISSIONS: Record<number, Permission[]> = {
  1: ['moderation.view'],
  2: ['moderation.view', 'moderation.action'],
  3: ['moderation.view', 'moderation.action', 'moderation.ban', 'bots.view', 'bots.manage'],
  4: ['moderation.view', 'moderation.action', 'moderation.ban', 'bots.view', 'bots.manage', 'content.manage', 'store.manage'],
  5: ['moderation.view', 'moderation.action', 'moderation.ban', 'bots.view', 'bots.manage', 'content.manage', 'store.manage', 'users.manage', 'roles.manage', 'admin.full'],
}

export const ROLE_CONFIG: Record<number, { title: string; badge: string; color: string }> = {
  0: { title: 'Member', badge: '', color: '#888' },
  1: { title: 'Junior Moderator', badge: '/Moderator badge levels/level_1.png', color: '#8B7355' },
  2: { title: 'Moderator', badge: '/Moderator badge levels/level_2.png', color: '#9CA3AF' },
  3: { title: 'Senior Moderator', badge: '/Moderator badge levels/level_3.png', color: '#A855F7' },
  4: { title: 'Content Manager', badge: '/Moderator badge levels/level_4.png', color: '#3B82F6' },
  5: { title: 'Admin', badge: '/Moderator badge levels/level_5.png', color: '#EAB308' },
}

export interface UserRole {
  id: string
  user_id: string
  role_level: number
  role_title: string
  assigned_by: string | null
  assigned_at: string
  notes: string | null
}

interface RoleContextType {
  roleLevel: number
  roleTitle: string
  roleConfig: typeof ROLE_CONFIG[0]
  loading: boolean
  hasPermission: (permission: Permission) => boolean
  hasMinLevel: (minLevel: number) => boolean
  refreshRole: () => Promise<void>
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [roleLevel, setRoleLevel] = useState(0)
  const [roleTitle, setRoleTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRole = async () => {
    if (!user) {
      setRoleLevel(0)
      setRoleTitle('')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        // PGRST116 = no rows found (normal for users without a role)
        // 42P01 = table doesn't exist yet (migration not run)
        // 406 = Not Acceptable (PostgREST header issue, treat as no row)
        const isExpected = error.code === 'PGRST116' || error.code === '42P01' ||
          error.code === '406' || String(error.status) === '406' ||
          (error.message && error.message.includes('does not exist'))
        if (!isExpected) {
          console.warn('Error fetching user role:', error.code, error.message)
        }
      }

      if (data) {
        setRoleLevel(data.role_level)
        setRoleTitle(data.role_title || ROLE_CONFIG[data.role_level]?.title || '')
      } else if (user.is_admin) {
        // Fallback: if user is_admin but has no role record, treat as level 5
        setRoleLevel(5)
        setRoleTitle('Admin')
      } else {
        setRoleLevel(0)
        setRoleTitle('')
      }
    } catch (err) {
      // Fallback to is_admin check if anything goes wrong
      if (user.is_admin) {
        setRoleLevel(5)
        setRoleTitle('Admin')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchRole()
  }, [user?.id])

  const hasPermission = (permission: Permission): boolean => {
    if (roleLevel === 0) return false
    const perms = LEVEL_PERMISSIONS[roleLevel] || []
    return perms.includes(permission)
  }

  const hasMinLevel = (minLevel: number): boolean => {
    return roleLevel >= minLevel
  }

  const roleConfig = ROLE_CONFIG[roleLevel] || ROLE_CONFIG[0]

  return (
    <RoleContext.Provider value={{
      roleLevel,
      roleTitle,
      roleConfig,
      loading,
      hasPermission,
      hasMinLevel,
      refreshRole: fetchRole,
    }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
