'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, Copy, VolumeX, Volume2, Flag, LogOut, Users, MessageSquare, ChevronDown, Plus, X, Lock, Globe, Eye, EyeOff, Loader2, Send, Heart } from 'lucide-react'
import { useAuth } from '@/app/context/AuthContext'
import { createClient } from '@/app/lib/supabaseClient'
import AuthGate from '@/app/components/AuthGate/AuthGate'
import styles from './groups.module.css'

// ─── Types ───
interface GroupLeader {
  name: string
  username: string
  initials: string
  role: string
  avatar_url?: string | null
}

interface GroupMember {
  id: string
  user_id: string
  role: string
  username: string
  display_name: string | null
  avatar_url: string | null
  initials: string
}

interface DiscussionComment {
  id: string
  user_id: string
  body: string
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  initials: string
  parent_id: string | null
  reply_to_username: string | null
  like_count: number
  is_liked: boolean
  replies: DiscussionComment[]
}

interface GroupDiscussion {
  id: string
  user_id: string
  title: string
  body: string
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  initials: string
  comment_count: number
  like_count: number
  is_liked: boolean
}

interface FollowingDiscussion extends GroupDiscussion {
  group_id: string
  group_name: string
}

interface GroupData {
  id: string
  name: string
  description: string
  category: string
  privacy: string
  allow_invites: boolean
  require_approval: boolean
  max_members: number | null
  rules: string[]
  owner_id: string
  created_at: string
  member_count: number
  discussion_count: number
  comment_count: number
  leaders: GroupLeader[]
  is_member: boolean
}

type MainTab = 'overview' | 'following' | 'explore'
type DetailTab = 'about' | 'discussions' | 'members'
type ExploreSort = 'popular' | 'newest'
type DiscussionSort = 'newest' | 'hot'
type MemberFilter = 'everyone' | 'owners' | 'moderators'

interface CreateGroupForm {
  name: string
  description: string
  category: string
  privacy: 'public' | 'private'
  allowInvites: boolean
  requireApproval: boolean
  rules: string
  maxMembers: string
}

const INITIAL_FORM: CreateGroupForm = {
  name: '',
  description: '',
  category: 'general',
  privacy: 'public',
  allowInvites: true,
  requireApproval: false,
  rules: '',
  maxMembers: '',
}

function getInitials(name: string | null, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase()
  const parts = name.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getISOWeekKey(): string {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const start = jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000
  const week = Math.ceil(((now.getTime() - start) / 86400000 + 1) / 7)
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function GroupsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mainTab, setMainTab] = useState<MainTab>('overview')
  const [exploreSort, setExploreSort] = useState<ExploreSort>('popular')
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('about')
  const [discussionSort, setDiscussionSort] = useState<DiscussionSort>('newest')
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('everyone')
  const [showDropdown, setShowDropdown] = useState(false)
  const [overviewDropdownId, setOverviewDropdownId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateGroupForm>(INITIAL_FORM)

  const [loading, setLoading] = useState(true)
  const [joinedGroupsList, setJoinedGroupsList] = useState<GroupData[]>([])
  const [exploreGroupsList, setExploreGroupsList] = useState<GroupData[]>([])
  const [discussions, setDiscussions] = useState<GroupDiscussion[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [followingDiscussions, setFollowingDiscussions] = useState<FollowingDiscussion[]>([])
  const [followingLoading, setFollowingLoading] = useState(false)
  const [showNewDiscussion, setShowNewDiscussion] = useState(false)
  const [newDiscTitle, setNewDiscTitle] = useState('')
  const [newDiscBody, setNewDiscBody] = useState('')
  const [submittingDisc, setSubmittingDisc] = useState(false)
  const [expandedDiscId, setExpandedDiscId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, DiscussionComment[]>>({})
  const [newCommentText, setNewCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [mutedGroupIds, setMutedGroupIds] = useState<Set<string>>(new Set())
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('inappropriate_content')
  const [reportDescription, setReportDescription] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  // ─── Fetch groups ───
  const fetchGroups = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Fetch all public groups
      const { data: allGroups, error: groupsErr } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (groupsErr) {
        console.error('Supabase groups query error:', groupsErr.message, groupsErr.code, groupsErr.details)
        throw groupsErr
      }
      if (!allGroups) { setLoading(false); return }

      // Fetch user's memberships
      const { data: myMemberships } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id)

      const membershipMap = new Map<string, string>()
      myMemberships?.forEach(m => membershipMap.set(m.group_id, m.role))

      // For each group, get counts and leaders
      const enriched: GroupData[] = await Promise.all(allGroups.map(async (g) => {
        // Member count
        const { count: memberCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)

        // Discussion count
        const { count: discussionCount } = await supabase
          .from('group_discussions')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)

        // Comment count (across all discussions in this group)
        const { data: groupDiscussionIds } = await supabase
          .from('group_discussions')
          .select('id')
          .eq('group_id', g.id)

        let commentCount = 0
        if (groupDiscussionIds && groupDiscussionIds.length > 0) {
          const { count } = await supabase
            .from('group_discussion_comments')
            .select('*', { count: 'exact', head: true })
            .in('discussion_id', groupDiscussionIds.map(d => d.id))
          commentCount = count || 0
        }

        // Leaders (owner + moderators)
        const { data: leaderMembers } = await supabase
          .from('group_members')
          .select('user_id, role')
          .eq('group_id', g.id)
          .in('role', ['owner', 'moderator'])

        const leaders: GroupLeader[] = []
        if (leaderMembers && leaderMembers.length > 0) {
          const { data: leaderUsers } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', leaderMembers.map(l => l.user_id))

          leaderMembers.forEach(lm => {
            const u = leaderUsers?.find(u => u.id === lm.user_id)
            if (u) {
              leaders.push({
                name: u.display_name || u.username,
                username: u.username,
                initials: getInitials(u.display_name, u.username),
                role: lm.role === 'owner' ? 'Owner' : 'Moderator',
                avatar_url: u.avatar_url,
              })
            }
          })
        }

        // Fallback: if no leaders found but group has an owner_id, fetch that user
        if (leaders.length === 0 && g.owner_id) {
          const { data: ownerUser } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_url')
            .eq('id', g.owner_id)
            .single()
          if (ownerUser) {
            leaders.push({
              name: ownerUser.display_name || ownerUser.username,
              username: ownerUser.username,
              initials: getInitials(ownerUser.display_name, ownerUser.username),
              role: 'Owner',
              avatar_url: ownerUser.avatar_url,
            })
          }
        }

        return {
          id: g.id,
          name: g.name,
          description: g.description,
          category: g.category,
          privacy: g.privacy,
          allow_invites: g.allow_invites,
          require_approval: g.require_approval,
          max_members: g.max_members,
          rules: g.rules || [],
          owner_id: g.owner_id,
          created_at: g.created_at,
          member_count: memberCount || 0,
          discussion_count: discussionCount || 0,
          comment_count: commentCount,
          leaders,
          is_member: membershipMap.has(g.id),
        }
      }))

      setJoinedGroupsList(enriched.filter(g => g.is_member))
      setExploreGroupsList(enriched.filter(g => !g.is_member))
    } catch (err) {
      console.error('Error fetching groups:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  // ─── Fetch user's muted groups ───
  const fetchMutedGroups = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('group_mutes').select('group_id').eq('user_id', user.id)
    if (data) setMutedGroupIds(new Set(data.map(d => d.group_id)))
  }, [user, supabase])

  useEffect(() => {
    fetchGroups()
    fetchMutedGroups()
  }, [fetchGroups, fetchMutedGroups])

  // ─── Fetch discussions for selected group ───
  const fetchDiscussions = useCallback(async (groupId: string) => {
    const { data, error } = await supabase
      .from('group_discussions')
      .select('id, user_id, title, body, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: discussionSort === 'newest' ? false : true })

    if (error || !data) { setDiscussions([]); return }

    const userIds = [...new Set(data.map(d => d.user_id))]
    const { data: users } = await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)

    // Fetch user's likes
    const discIds = data.map(d => d.id)
    const { data: myLikes } = user
      ? await supabase.from('group_discussion_likes').select('discussion_id').eq('user_id', user.id).in('discussion_id', discIds)
      : { data: [] }
    const likedSet = new Set(myLikes?.map(l => l.discussion_id) || [])

    const withUsers: GroupDiscussion[] = await Promise.all(data.map(async (d) => {
      const u = users?.find(u => u.id === d.user_id)
      const { count: commentCount } = await supabase.from('group_discussion_comments').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id)
      const { count: likeCount } = await supabase.from('group_discussion_likes').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id)
      return {
        ...d,
        username: u?.username || 'unknown',
        display_name: u?.display_name || null,
        avatar_url: u?.avatar_url || null,
        initials: getInitials(u?.display_name || null, u?.username || '??'),
        comment_count: commentCount || 0,
        like_count: likeCount || 0,
        is_liked: likedSet.has(d.id),
      }
    }))
    setDiscussions(withUsers)
  }, [supabase, discussionSort, user])

  // ─── Fetch members for selected group ───
  const fetchMembers = useCallback(async (groupId: string, ownerId?: string) => {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, user_id, role')
      .eq('group_id', groupId)

    if (error || !data) { setMembers([]); return }

    const userIds = [...new Set(data.map(m => m.user_id))]
    const { data: users } = await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)

    const rolePriority: Record<string, number> = { owner: 3, moderator: 2, member: 1 }
    const dedupedByUser = new Map<string, { id: string; user_id: string; role: string }>()
    data.forEach((m) => {
      const existing = dedupedByUser.get(m.user_id)
      if (!existing || (rolePriority[m.role] || 0) > (rolePriority[existing.role] || 0)) {
        dedupedByUser.set(m.user_id, m)
      }
    })

    const mapped: GroupMember[] = Array.from(dedupedByUser.values()).map(m => {
      const u = users?.find(u => u.id === m.user_id)
      const isOwner = ownerId && m.user_id === ownerId
      return {
        id: m.id,
        user_id: m.user_id,
        role: isOwner ? 'Owner' : m.role === 'owner' ? 'Owner' : m.role === 'moderator' ? 'Moderator' : 'Member',
        username: u?.username || 'unknown',
        display_name: u?.display_name || null,
        avatar_url: u?.avatar_url || null,
        initials: getInitials(u?.display_name || null, u?.username || '??'),
      }
    })

    // If the owner isn't in the members table at all, fetch and prepend them
    if (ownerId && !mapped.some(m => m.user_id === ownerId)) {
      const { data: ownerUser } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', ownerId)
        .single()
      if (ownerUser) {
        mapped.unshift({
          id: `owner-${ownerId}`,
          user_id: ownerId,
          role: 'Owner',
          username: ownerUser.username || 'unknown',
          display_name: ownerUser.display_name || null,
          avatar_url: ownerUser.avatar_url || null,
          initials: getInitials(ownerUser.display_name || null, ownerUser.username || '??'),
        })
      }
    }

    setMembers(mapped)
  }, [supabase])

  // ─── Join / Leave group ───
  const toggleJoin = async (groupId: string) => {
    if (!user) return
    const isMember = joinedGroupsList.some(g => g.id === groupId)
    const group = [...joinedGroupsList, ...exploreGroupsList].find(g => g.id === groupId)

    // Prevent the owner from leaving their own group
    if (isMember && group && group.owner_id === user.id) {
      alert('You cannot leave a group you own. Transfer ownership first.')
      return
    }

    try {
      if (isMember) {
        await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
      } else {
        // Use upsert to avoid duplicate row if user already exists (e.g. as owner)
        const { data: existing } = await supabase
          .from('group_members')
          .select('id, role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'member' })
        }
      }
      await fetchGroups()
      // Update selected group if open
      if (selectedGroup && selectedGroup.id === groupId) {
        const updated = isMember
          ? { ...selectedGroup, is_member: false, member_count: selectedGroup.member_count - 1 }
          : { ...selectedGroup, is_member: true, member_count: selectedGroup.member_count + 1 }
        setSelectedGroup(updated)
      }
    } catch (err) {
      console.error('Error toggling group membership:', err)
    }
  }

  // ─── Toggle mute on a group ───
  const handleMuteGroup = async (groupId: string) => {
    if (!user) return
    const isMuted = mutedGroupIds.has(groupId)
    try {
      if (isMuted) {
        const { error } = await supabase.from('group_mutes').delete().eq('group_id', groupId).eq('user_id', user.id)
        if (error) throw error
        setMutedGroupIds(prev => { const n = new Set(prev); n.delete(groupId); return n })
        alert('Group unmuted. You will receive notifications from this group again.')
      } else {
        const { error } = await supabase.from('group_mutes').insert({ group_id: groupId, user_id: user.id })
        if (error) {
          if (error.code === '23505') {
            setMutedGroupIds(prev => new Set(prev).add(groupId))
            alert('Group is already muted.')
            return
          }
          throw error
        }
        setMutedGroupIds(prev => new Set(prev).add(groupId))
        alert('Group muted. You will no longer receive notifications from this group.')
      }
    } catch (err: any) {
      console.error('Error toggling mute:', err)
      alert(`Failed to ${isMuted ? 'unmute' : 'mute'} group: ${err?.message || 'Unknown error'}`)
    }
  }

  // ─── Report a group ───
  const handleReportGroup = async () => {
    if (!user || !selectedGroup) return
    setSubmittingReport(true)
    try {
      const { error } = await supabase.from('group_reports').insert({
        group_id: selectedGroup.id,
        reported_by: user.id,
        reason: reportReason,
        description: reportDescription.trim(),
        status: 'pending',
      })
      if (error) {
        if (error.code === '23505') {
          alert('You have already reported this group.')
        } else {
          throw error
        }
      } else {
        alert('Group reported successfully. Our moderation team will review it.')
      }
      setShowReportModal(false)
      setReportReason('inappropriate_content')
      setReportDescription('')
    } catch (err) {
      console.error('Error reporting group:', err)
      alert('Failed to submit report. Please try again.')
    } finally {
      setSubmittingReport(false)
    }
  }

  const openGroup = async (group: GroupData) => {
    setSelectedGroup(group)
    setDetailTab('about')
    setShowDropdown(false)
    setDetailLoading(true)
    await Promise.all([fetchDiscussions(group.id), fetchMembers(group.id, group.owner_id)])
    setDetailLoading(false)
  }

  // ─── Create group ───
  const handleCreateGroup = async () => {
    if (!createForm.name.trim() || !user) return
    setCreating(true)
    try {
      const rulesArr = createForm.rules.split('\n').map(r => r.trim()).filter(Boolean)
      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert({
          name: createForm.name.trim(),
          description: createForm.description.trim(),
          category: createForm.category,
          privacy: createForm.privacy,
          allow_invites: createForm.allowInvites,
          require_approval: createForm.requireApproval,
          max_members: createForm.maxMembers ? parseInt(createForm.maxMembers) : null,
          rules: rulesArr,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Auto-join as owner
      await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'owner',
      })

      setShowCreateModal(false)
      setCreateForm(INITIAL_FORM)
      await fetchGroups()
    } catch (err) {
      console.error('Error creating group:', err)
    } finally {
      setCreating(false)
    }
  }

  // ─── Fetch discussions from all joined groups (for Following tab) ───
  const fetchFollowingDiscussions = useCallback(async () => {
    if (!user || joinedGroupsList.length === 0) { setFollowingDiscussions([]); return }
    setFollowingLoading(true)
    try {
      const groupIds = joinedGroupsList.map(g => g.id)
      const { data, error } = await supabase
        .from('group_discussions')
        .select('id, group_id, user_id, title, body, created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error || !data) { setFollowingDiscussions([]); return }

      const userIds = [...new Set(data.map(d => d.user_id))]
      const { data: users } = userIds.length > 0
        ? await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] }

      const groupMap = new Map(joinedGroupsList.map(g => [g.id, g.name]))

      // Fetch user's likes for following discussions
      const followDiscIds = data.map(d => d.id)
      const { data: followLikes } = user
        ? await supabase.from('group_discussion_likes').select('discussion_id').eq('user_id', user.id).in('discussion_id', followDiscIds)
        : { data: [] }
      const followLikedSet = new Set(followLikes?.map(l => l.discussion_id) || [])

      const withMeta: FollowingDiscussion[] = await Promise.all(data.map(async (d) => {
        const u = users?.find(u => u.id === d.user_id)
        const { count: commentCount } = await supabase.from('group_discussion_comments').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id)
        const { count: likeCount } = await supabase.from('group_discussion_likes').select('*', { count: 'exact', head: true }).eq('discussion_id', d.id)
        return {
          ...d,
          group_name: groupMap.get(d.group_id) || 'Unknown Group',
          username: u?.username || 'unknown',
          display_name: u?.display_name || null,
          avatar_url: u?.avatar_url || null,
          initials: getInitials(u?.display_name || null, u?.username || '??'),
          comment_count: commentCount || 0,
          like_count: likeCount || 0,
          is_liked: followLikedSet.has(d.id),
        }
      }))
      setFollowingDiscussions(withMeta)
    } catch (err) {
      console.error('Error fetching following discussions:', err)
    } finally {
      setFollowingLoading(false)
    }
  }, [user, joinedGroupsList, supabase])

  // ─── Create discussion ───
  const handleCreateDiscussion = async () => {
    if (!user || !selectedGroup || !newDiscBody.trim()) return
    setSubmittingDisc(true)
    try {
      const { error } = await supabase.from('group_discussions').insert({
        group_id: selectedGroup.id,
        user_id: user.id,
        title: newDiscTitle.trim(),
        body: newDiscBody.trim(),
      })
      if (error) throw error
      ;(supabase as any).rpc('increment_challenge_progress', {
        p_user_id: user.id,
        p_challenge_id: 'w3',
        p_period_key: getISOWeekKey(),
      }).then(() => {}).catch(() => {})
      setNewDiscTitle('')
      setNewDiscBody('')
      setShowNewDiscussion(false)
      await fetchDiscussions(selectedGroup.id)
    } catch (err) {
      console.error('Error creating discussion:', err)
    } finally {
      setSubmittingDisc(false)
    }
  }

  // ─── Fetch comments for a discussion ───
  const fetchComments = useCallback(async (discussionId: string) => {
    const { data, error } = await supabase
      .from('group_discussion_comments')
      .select('id, user_id, parent_id, body, created_at')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true })

    if (error || !data) { setCommentsMap(prev => ({ ...prev, [discussionId]: [] })); return }

    const userIds = [...new Set(data.map(c => c.user_id))]
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, username, display_name, avatar_url').in('id', userIds)
      : { data: [] }

    // Fetch comment likes
    const commentIds = data.map(c => c.id)
    const { data: myCommentLikes } = user && commentIds.length > 0
      ? await supabase.from('group_comment_likes').select('comment_id').eq('user_id', user.id).in('comment_id', commentIds)
      : { data: [] }
    const likedCommentSet = new Set(myCommentLikes?.map(l => l.comment_id) || [])

    // Get like counts per comment
    const likeCounts: Record<string, number> = {}
    if (commentIds.length > 0) {
      const { data: allLikes } = await supabase.from('group_comment_likes').select('comment_id').in('comment_id', commentIds)
      allLikes?.forEach(l => { likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1 })
    }

    // Build flat list with user info
    const flat: DiscussionComment[] = data.map(c => {
      const u = users?.find(u => u.id === c.user_id)
      const parentComment = c.parent_id ? data.find(p => p.id === c.parent_id) : null
      const parentUser = parentComment ? users?.find(u => u.id === parentComment.user_id) : null
      return {
        ...c,
        parent_id: c.parent_id || null,
        reply_to_username: parentUser ? (parentUser.display_name || parentUser.username) : null,
        username: u?.username || 'unknown',
        display_name: u?.display_name || null,
        avatar_url: u?.avatar_url || null,
        initials: getInitials(u?.display_name || null, u?.username || '??'),
        like_count: likeCounts[c.id] || 0,
        is_liked: likedCommentSet.has(c.id),
        replies: [],
      }
    })

    // Build tree: top-level comments get nested replies
    const topLevel: DiscussionComment[] = []
    const byId = new Map(flat.map(c => [c.id, c]))
    flat.forEach(c => {
      if (c.parent_id) {
        const parent = byId.get(c.parent_id)
        if (parent) parent.replies.push(c)
      } else {
        topLevel.push(c)
      }
    })

    setCommentsMap(prev => ({ ...prev, [discussionId]: topLevel }))
  }, [supabase, user])

  // ─── Add comment to a discussion ───
  const handleAddComment = async (discussionId: string) => {
    if (!user || !newCommentText.trim()) return
    setSubmittingComment(true)
    try {
      const { error } = await supabase.from('group_discussion_comments').insert({
        discussion_id: discussionId,
        user_id: user.id,
        body: newCommentText.trim(),
      })
      if (error) throw error
      setNewCommentText('')
      await fetchComments(discussionId)
      // Update comment count in discussions list
      setDiscussions(prev => prev.map(d =>
        d.id === discussionId ? { ...d, comment_count: d.comment_count + 1 } : d
      ))
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // ─── Reply to a comment ───
  const handleReply = async (discussionId: string, parentId: string) => {
    if (!user || !replyText.trim()) return
    setSubmittingComment(true)
    try {
      const { error } = await supabase.from('group_discussion_comments').insert({
        discussion_id: discussionId,
        user_id: user.id,
        parent_id: parentId,
        body: replyText.trim(),
      })
      if (error) throw error
      setReplyText('')
      setReplyingToId(null)
      await fetchComments(discussionId)
      setDiscussions(prev => prev.map(d =>
        d.id === discussionId ? { ...d, comment_count: d.comment_count + 1 } : d
      ))
    } catch (err) {
      console.error('Error replying:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // ─── Toggle like on a comment ───
  const toggleCommentLike = async (discussionId: string, commentId: string, isLiked: boolean) => {
    if (!user) return
    try {
      if (isLiked) {
        await supabase.from('group_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      } else {
        await supabase.from('group_comment_likes').insert({ comment_id: commentId, user_id: user.id })
      }
      // Re-fetch to update tree
      await fetchComments(discussionId)
    } catch (err) {
      console.error('Error toggling comment like:', err)
    }
  }

  // ─── Toggle like on a discussion ───
  const toggleLike = async (discussionId: string) => {
    if (!user) return
    const disc = discussions.find(d => d.id === discussionId)
    if (!disc) return
    try {
      if (disc.is_liked) {
        await supabase.from('group_discussion_likes').delete().eq('discussion_id', discussionId).eq('user_id', user.id)
        setDiscussions(prev => prev.map(d =>
          d.id === discussionId ? { ...d, is_liked: false, like_count: d.like_count - 1 } : d
        ))
      } else {
        await supabase.from('group_discussion_likes').insert({ discussion_id: discussionId, user_id: user.id })
        setDiscussions(prev => prev.map(d =>
          d.id === discussionId ? { ...d, is_liked: true, like_count: d.like_count + 1 } : d
        ))
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  // ─── Toggle expand discussion (load comments) ───
  const toggleExpandDiscussion = async (discussionId: string) => {
    if (expandedDiscId === discussionId) {
      setExpandedDiscId(null)
      setNewCommentText('')
    } else {
      setExpandedDiscId(discussionId)
      setNewCommentText('')
      if (!commentsMap[discussionId]) {
        await fetchComments(discussionId)
      }
    }
  }

  // Re-fetch discussions when sort changes
  useEffect(() => {
    if (selectedGroup && detailTab === 'discussions') {
      fetchDiscussions(selectedGroup.id)
    }
  }, [discussionSort, selectedGroup, detailTab, fetchDiscussions])

  // Fetch following discussions when tab switches or joined groups change
  useEffect(() => {
    if (mainTab === 'following') {
      fetchFollowingDiscussions()
    }
  }, [mainTab, fetchFollowingDiscussions])

  // Sorted explore list
  const sortedExplore = [...exploreGroupsList].sort((a, b) =>
    exploreSort === 'popular' ? b.member_count - a.member_count : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Background position offsets for variety per card
  const bgPositions = ['center top', 'center center', 'center bottom', 'left center', 'right center', 'left top', 'right bottom', 'left bottom', 'right top']

  // ═══════ GROUP DETAIL VIEW ═══════
  if (selectedGroup) {
    const filteredMembers = members.filter(m => {
      if (memberFilter === 'owners') return m.role === 'Owner'
      if (memberFilter === 'moderators') return m.role === 'Moderator'
      return true
    })

    const isJoined = selectedGroup.is_member

    return (
      <div className={styles.container}>
        <div className={styles.detailHeader}>
          <button className={styles.backBtn} onClick={() => { setSelectedGroup(null); fetchGroups() }}>
            <ArrowLeft size={20} />
          </button>
          <h2 className={styles.detailHeaderTitle}>Fart Groups</h2>
        </div>

        <div className={styles.detailTitleRow}>
          <div style={{ flex: 1 }}>
            <h1 className={styles.detailName}>{selectedGroup.name}</h1>
            <p className={styles.detailMembers}>{selectedGroup.member_count.toLocaleString()} members</p>
            <p className={styles.detailDiscussions}>{selectedGroup.discussion_count} discussions</p>
          </div>
          <div className={styles.detailLeadersRow}>
            <span className={styles.leadersLabelGreen} onClick={() => { setDetailTab('members'); setMemberFilter('owners'); fetchMembers(selectedGroup.id, selectedGroup.owner_id) }}>Leaders</span>
            <div className={styles.leaderAvatars}>
              {selectedGroup.leaders.map((l, i) => (
                <div key={i} className={styles.leaderAvatar} onClick={(e) => { e.stopPropagation(); router.push(`/${l.username}`) }} style={{ cursor: 'pointer' }}>
                  {l.avatar_url ? <img src={l.avatar_url} alt={l.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : l.initials}
                </div>
              ))}
            </div>
            <div className={styles.moreBtn} onClick={() => setShowDropdown(!showDropdown)}>
              <MoreHorizontal size={20} />
              {showDropdown && (
                <div className={styles.dropdown}>
                  <button className={styles.dropdownItem} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/groups?id=${selectedGroup.id}`); setShowDropdown(false); alert('Link copied!') }}><Copy size={14} /> Copy Link</button>
                  <button className={styles.dropdownItem} onClick={() => { handleMuteGroup(selectedGroup.id); setShowDropdown(false) }}>
                    {mutedGroupIds.has(selectedGroup.id) ? <><Volume2 size={14} /> Unmute Group</> : <><VolumeX size={14} /> Mute Group</>}
                  </button>
                  <button className={styles.dropdownItem} onClick={() => { setShowReportModal(true); setShowDropdown(false) }}><Flag size={14} /> Report Group</button>
                  {isJoined && (
                    <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={() => { toggleJoin(selectedGroup.id); setShowDropdown(false) }}><LogOut size={14} /> Leave Group</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          className={`${styles.detailJoinBtn} ${isJoined ? styles.detailJoinedBtn : ''}`}
          onClick={() => toggleJoin(selectedGroup.id)}
        >
          {isJoined ? 'Joined' : 'JOIN'}
        </button>

        {/* Detail Tabs */}
        <div className={styles.detailTabs}>
          <button className={`${styles.detailTab} ${detailTab === 'about' ? styles.detailTabActive : ''}`} onClick={() => setDetailTab('about')}>About & Rules</button>
          <button className={`${styles.detailTab} ${detailTab === 'discussions' ? styles.detailTabActive : ''}`} onClick={() => { setDetailTab('discussions'); fetchDiscussions(selectedGroup.id) }}>Discussions</button>
          <button className={`${styles.detailTab} ${detailTab === 'members' ? styles.detailTabActive : ''}`} onClick={() => { setDetailTab('members'); fetchMembers(selectedGroup.id, selectedGroup.owner_id) }}>Members</button>
        </div>

        {/* ABOUT & RULES */}
        {detailTab === 'about' && (
          <div className={styles.aboutLayout}>
            <div className={styles.aboutLeft}>
              <div className={styles.statBlock}>
                <h4>Group Stats</h4>
                <div className={styles.statGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{selectedGroup.member_count.toLocaleString()}</span>
                    <span className={styles.statLabel}>Members</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{selectedGroup.discussion_count}</span>
                    <span className={styles.statLabel}>Discussions</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{selectedGroup.comment_count}</span>
                    <span className={styles.statLabel}>Comments</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>{discussions.reduce((sum, d) => sum + d.like_count, 0)}</span>
                    <span className={styles.statLabel}>Likes</span>
                  </div>
                </div>
                <p className={styles.createdDate}>Created on {new Date(selectedGroup.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>

              <div className={styles.leadersBlock}>
                <h4>Group Leaders</h4>
                {selectedGroup.leaders.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>No leaders assigned</p>
                ) : (
                  selectedGroup.leaders.map((l, i) => (
                    <div key={i} className={styles.leaderItem} onClick={() => router.push(`/${l.username}`)} style={{ cursor: 'pointer' }}>
                      <div className={styles.leaderItemAvatar}>
                        {l.avatar_url ? <img src={l.avatar_url} alt={l.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : l.initials}
                      </div>
                      <span className={styles.leaderItemName}>{l.name}</span>
                      <span className={styles.leaderItemRole}>{l.role}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.aboutRight}>
              <p className={styles.aboutDescription}>{selectedGroup.description || 'No description provided.'}</p>
              <p className={styles.aboutSupport}>
                Need technical support?<br />
                <a href="/help" className={styles.aboutSupportLink}>Try our help section</a>
              </p>
              {selectedGroup.rules.length > 0 && (
                <div className={styles.rulesBlock}>
                  <h4>Rules</h4>
                  <ol className={styles.rulesList}>
                    {selectedGroup.rules.map((rule, i) => (
                      <li key={i} className={styles.ruleItem}>
                        <span className={styles.ruleNumber}>{i + 1}.</span>
                        {rule}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCUSSIONS */}
        {detailTab === 'discussions' && (
          <>
            <div className={styles.discussionControls}>
              <select className={styles.sortSelect} value={discussionSort} onChange={e => setDiscussionSort(e.target.value as DiscussionSort)}>
                <option value="newest">Newest Discussions</option>
                <option value="hot">Hot Discussions</option>
              </select>
              {isJoined && !showNewDiscussion && (
                <button className={styles.startDiscussionBtn} onClick={() => setShowNewDiscussion(true)}>
                  <Plus size={14} /> New Discussion
                </button>
              )}
            </div>

            {showNewDiscussion && (
              <div className={styles.newDiscussionForm}>
                <input
                  className={styles.newDiscussionInput}
                  placeholder="Discussion title (optional)"
                  value={newDiscTitle}
                  onChange={e => setNewDiscTitle(e.target.value)}
                  maxLength={120}
                />
                <textarea
                  className={styles.newDiscussionTextarea}
                  placeholder="What do you want to discuss?"
                  value={newDiscBody}
                  onChange={e => setNewDiscBody(e.target.value)}
                  rows={3}
                />
                <div className={styles.newDiscussionActions}>
                  <button className={styles.newDiscussionCancel} onClick={() => { setShowNewDiscussion(false); setNewDiscTitle(''); setNewDiscBody('') }}>Cancel</button>
                  <button className={styles.newDiscussionSubmit} disabled={!newDiscBody.trim() || submittingDisc} onClick={handleCreateDiscussion}>
                    {submittingDisc ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {detailLoading ? (
              <p className={styles.emptyState}><Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Loading...</p>
            ) : discussions.length === 0 ? (
              <p className={styles.emptyState}>No discussions yet.{isJoined ? ' Be the first to start one!' : ' Join to start a discussion.'}</p>
            ) : (
              discussions.map(d => (
                <div key={d.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentAvatar} onClick={() => router.push(`/${d.username}`)} style={{ cursor: 'pointer' }}>
                      {d.avatar_url ? <img src={d.avatar_url} alt={d.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : d.initials}
                    </div>
                    <span className={styles.commentUser} onClick={() => router.push(`/${d.username}`)} style={{ cursor: 'pointer' }}>{d.display_name || d.username}</span>
                    <span className={styles.commentTime}>{timeAgo(d.created_at)}</span>
                  </div>
                  {d.title && <p className={styles.discussionTitleText}>{d.title}</p>}
                  <p className={styles.commentBody}>{d.body}</p>
                  <div className={styles.discussionActions}>
                    <button className={`${styles.likeBtn} ${d.is_liked ? styles.likeBtnActive : ''}`} onClick={() => toggleLike(d.id)}>
                      <Heart size={14} fill={d.is_liked ? '#e53e3e' : 'none'} /> {d.like_count}
                    </button>
                    <button className={styles.commentToggleBtn} onClick={() => toggleExpandDiscussion(d.id)}>
                      <MessageSquare size={14} /> {d.comment_count} {d.comment_count === 1 ? 'comment' : 'comments'}
                    </button>
                  </div>

                  {expandedDiscId === d.id && (
                    <div className={styles.commentsSection}>
                      {(commentsMap[d.id] || []).length === 0 ? (
                        <p className={styles.noComments}>No comments yet</p>
                      ) : (
                        (commentsMap[d.id] || []).map(c => (
                          <div key={c.id} className={styles.inlineComment}>
                            <div className={styles.inlineCommentAvatar} onClick={() => router.push(`/${c.username}`)} style={{ cursor: 'pointer' }}>
                              {c.avatar_url ? <img src={c.avatar_url} alt={c.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : c.initials}
                            </div>
                            <div className={styles.inlineCommentContent}>
                              <div className={styles.inlineCommentHeader}>
                                <span className={styles.inlineCommentUser} onClick={() => router.push(`/${c.username}`)} style={{ cursor: 'pointer' }}>{c.display_name || c.username}</span>
                                <span className={styles.inlineCommentTime}>{timeAgo(c.created_at)}</span>
                              </div>
                              <p className={styles.inlineCommentBody}>{c.body}</p>
                              <div className={styles.commentActions}>
                                <button className={`${styles.commentLikeBtn} ${c.is_liked ? styles.commentLikeBtnActive : ''}`} onClick={() => toggleCommentLike(d.id, c.id, c.is_liked)}>
                                  <Heart size={11} fill={c.is_liked ? '#e53e3e' : 'none'} /> {c.like_count > 0 ? c.like_count : ''}
                                </button>
                                {isJoined && (
                                  <button className={styles.commentReplyBtn} onClick={() => { setReplyingToId(replyingToId === c.id ? null : c.id); setReplyText('') }}>
                                    Reply
                                  </button>
                                )}
                              </div>
                              {replyingToId === c.id && (
                                <div className={styles.addCommentRow} style={{ marginTop: '0.35rem' }}>
                                  <input
                                    className={styles.addCommentInput}
                                    placeholder={`Reply to ${c.display_name || c.username}...`}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(d.id, c.id) } }}
                                    autoFocus
                                  />
                                  <button className={styles.addCommentBtn} disabled={!replyText.trim() || submittingComment} onClick={() => handleReply(d.id, c.id)}>
                                    <Send size={14} />
                                  </button>
                                </div>
                              )}
                              {c.replies.length > 0 && (
                                <div className={styles.repliesSection}>
                                  {c.replies.map(r => (
                                    <div key={r.id} className={styles.inlineComment}>
                                      <div className={styles.inlineCommentAvatar} onClick={() => router.push(`/${r.username}`)} style={{ cursor: 'pointer' }}>
                                        {r.avatar_url ? <img src={r.avatar_url} alt={r.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : r.initials}
                                      </div>
                                      <div className={styles.inlineCommentContent}>
                                        <div className={styles.inlineCommentHeader}>
                                          <span className={styles.inlineCommentUser} onClick={() => router.push(`/${r.username}`)} style={{ cursor: 'pointer' }}>{r.display_name || r.username}</span>
                                          {r.reply_to_username && <span className={styles.replyToLabel}>→ {r.reply_to_username}</span>}
                                          <span className={styles.inlineCommentTime}>{timeAgo(r.created_at)}</span>
                                        </div>
                                        <p className={styles.inlineCommentBody}>{r.body}</p>
                                        <div className={styles.commentActions}>
                                          <button className={`${styles.commentLikeBtn} ${r.is_liked ? styles.commentLikeBtnActive : ''}`} onClick={() => toggleCommentLike(d.id, r.id, r.is_liked)}>
                                            <Heart size={11} fill={r.is_liked ? '#e53e3e' : 'none'} /> {r.like_count > 0 ? r.like_count : ''}
                                          </button>
                                          {isJoined && (
                                            <button className={styles.commentReplyBtn} onClick={() => { setReplyingToId(replyingToId === r.id ? null : r.id); setReplyText('') }}>
                                              Reply
                                            </button>
                                          )}
                                        </div>
                                        {replyingToId === r.id && (
                                          <div className={styles.addCommentRow} style={{ marginTop: '0.35rem' }}>
                                            <input
                                              className={styles.addCommentInput}
                                              placeholder={`Reply to ${r.display_name || r.username}...`}
                                              value={replyText}
                                              onChange={e => setReplyText(e.target.value)}
                                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(d.id, c.id) } }}
                                              autoFocus
                                            />
                                            <button className={styles.addCommentBtn} disabled={!replyText.trim() || submittingComment} onClick={() => handleReply(d.id, c.id)}>
                                              <Send size={14} />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isJoined && (
                        <div className={styles.addCommentRow}>
                          <input
                            className={styles.addCommentInput}
                            placeholder="Write a comment..."
                            value={newCommentText}
                            onChange={e => setNewCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(d.id) } }}
                          />
                          <button className={styles.addCommentBtn} disabled={!newCommentText.trim() || submittingComment} onClick={() => handleAddComment(d.id)}>
                            <Send size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}

        {/* MEMBERS */}
        {detailTab === 'members' && (
          <>
            <div className={styles.membersControls}>
              <span className={styles.membersLabel}>Members :</span>
              <select className={styles.sortSelect} value={memberFilter} onChange={e => setMemberFilter(e.target.value as MemberFilter)}>
                <option value="everyone">Everyone</option>
                <option value="owners">Owners</option>
                <option value="moderators">Moderators</option>
              </select>
            </div>
            {detailLoading ? (
              <p className={styles.emptyState}><Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Loading...</p>
            ) : (
              <div className={styles.membersGrid}>
                {filteredMembers.map((m) => (
                  <div key={m.id} className={styles.memberCard} onClick={() => router.push(`/${m.username}`)} style={{ cursor: 'pointer' }}>
                    <div className={styles.memberAvatar}>
                      {m.avatar_url ? <img src={m.avatar_url} alt={m.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : m.initials}
                    </div>
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>{m.display_name || m.username}</p>
                      <p className={styles.memberRole}>{m.role}</p>
                    </div>
                  </div>
                ))}
                {filteredMembers.length === 0 && (
                  <p className={styles.emptyState}>No members match this filter</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Report Group Modal */}
        {showReportModal && (
          <div className={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h2 className={styles.modalTitle} style={{ margin: 0 }}>Report Group</h2>
                <button className={styles.backBtn} onClick={() => setShowReportModal(false)}><X size={20} /></button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Report <strong style={{ color: '#fff' }}>{selectedGroup.name}</strong> for violating community guidelines.
              </p>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reason</label>
                <select className={`${styles.formInput} ${styles.sortSelect}`} value={reportReason} onChange={e => setReportReason(e.target.value)}>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="hate_speech">Hate Speech</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="copyright_violation">Copyright Violation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Additional Details (optional)</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Provide more context about why you're reporting this group..."
                  value={reportDescription}
                  onChange={e => setReportDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => { setShowReportModal(false); setReportReason('inappropriate_content'); setReportDescription('') }}>Cancel</button>
                <button className={styles.modalCreateBtn} style={{ background: '#e53e3e' }} disabled={submittingReport} onClick={handleReportGroup}>
                  {submittingReport ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════ MAIN GROUPS LIST VIEW ═══════
  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle} style={{ margin: 0 }}>Fart Groups</h1>
        <button className={styles.createGroupBtn} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Create Group
        </button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${mainTab === 'overview' ? styles.tabActive : ''}`} onClick={() => setMainTab('overview')}>Overview</button>
        <button className={`${styles.tab} ${mainTab === 'following' ? styles.tabActive : ''}`} onClick={() => setMainTab('following')}>Following</button>
        <button className={`${styles.tab} ${mainTab === 'explore' ? styles.tabActive : ''}`} onClick={() => setMainTab('explore')}>Explore</button>
      </div>

      {loading ? (
        <p className={styles.emptyState}><Loader2 size={20} style={{ display: 'inline', marginRight: '0.5rem' }} /> Loading groups...</p>
      ) : (
        <>
          {/* OVERVIEW */}
          {mainTab === 'overview' && (
            <>
              <h2 className={styles.sectionTitle}>Groups you joined</h2>
              {joinedGroupsList.length === 0 ? (
                <p className={styles.emptyState}>You haven&apos;t joined any groups yet. Check out the Explore tab!</p>
              ) : (
                joinedGroupsList.map((group, idx) => (
                  <div key={group.id} className={styles.groupRow} style={{ backgroundPosition: bgPositions[idx % bgPositions.length] }}>
                    <span className={styles.groupRowName} onClick={() => openGroup(group)}>{group.name}</span>
                    <div className={styles.groupRowDots} onClick={(e) => { e.stopPropagation(); setOverviewDropdownId(overviewDropdownId === group.id ? null : group.id) }}>
                      <MoreHorizontal size={18} />
                      {overviewDropdownId === group.id && (
                        <div className={styles.groupRowDropdown}>
                          <button className={styles.groupRowDropdownItem} onClick={() => { openGroup(group); setOverviewDropdownId(null) }}><Eye size={14} /> View Group</button>
                          <button className={styles.groupRowDropdownItem} onClick={() => { handleMuteGroup(group.id); setOverviewDropdownId(null) }}>
                            {mutedGroupIds.has(group.id) ? <><Volume2 size={14} /> Unmute</> : <><VolumeX size={14} /> Mute</>}
                          </button>
                          <button className={styles.groupRowDropdownItem} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/groups?id=${group.id}`); setOverviewDropdownId(null); alert('Link copied!') }}><Copy size={14} /> Copy Link</button>
                          <button className={`${styles.groupRowDropdownItem} ${styles.groupRowDropdownDanger}`} onClick={() => { toggleJoin(group.id); setOverviewDropdownId(null) }}><LogOut size={14} /> Leave Group</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* FOLLOWING */}
          {mainTab === 'following' && (
            <>
              <div className={styles.followingHeader}>
                <h2 className={styles.sectionTitle}>Discussions following</h2>
                <button className={styles.markAllRead}>Mark all as read</button>
              </div>
              {joinedGroupsList.length === 0 ? (
                <p className={styles.emptyState}>Join groups to see discussions here.</p>
              ) : followingLoading ? (
                <p className={styles.emptyState}><Loader2 size={20} style={{ display: 'inline', marginRight: '0.5rem' }} /> Loading discussions...</p>
              ) : followingDiscussions.length === 0 ? (
                <p className={styles.emptyState}>No discussions yet in your groups.</p>
              ) : (
                followingDiscussions.map((disc, idx) => {
                  const group = joinedGroupsList.find(g => g.id === disc.group_id)
                  return (
                    <div
                      key={disc.id}
                      className={styles.followingDiscussionCard}
                      style={{ backgroundPosition: bgPositions[idx % bgPositions.length] }}
                      onClick={() => group && openGroup(group)}
                    >
                      <div className={styles.followingDiscussionContent}>
                        <p className={styles.followingDiscussionGroupName}>{disc.group_name}</p>
                        {disc.title && <p className={styles.followingDiscussionTitle}>{disc.title}</p>}
                        <p className={styles.followingDiscussionBody}>{disc.body}</p>
                        <span className={styles.followingDiscussionMeta}>
                          {disc.display_name || disc.username} · {timeAgo(disc.created_at)}
                        </span>
                      </div>
                      {disc.comment_count > 0 && (
                        <span className={styles.followingCommentBadge}>{disc.comment_count}</span>
                      )}
                    </div>
                  )
                })
              )}
            </>
          )}

          {/* EXPLORE */}
          {mainTab === 'explore' && (
            <>
              <div className={styles.toggleRow}>
                <button className={`${styles.toggleBtn} ${exploreSort === 'popular' ? styles.toggleBtnActive : ''}`} onClick={() => setExploreSort('popular')}>Popular</button>
                <button className={`${styles.toggleBtn} ${exploreSort === 'newest' ? styles.toggleBtnActive : ''}`} onClick={() => setExploreSort('newest')}>Newest</button>
              </div>
              {sortedExplore.length === 0 ? (
                <p className={styles.emptyState}>You&apos;ve joined all available groups!</p>
              ) : (
                sortedExplore.map((group, idx) => (
                  <div key={group.id} className={styles.exploreCard} style={{ backgroundPosition: bgPositions[idx % bgPositions.length] }}>
                    <div className={styles.exploreInfo} onClick={() => openGroup(group)} style={{ cursor: 'pointer' }}>
                      <p className={styles.exploreName}>{group.name}</p>
                      <p className={styles.exploreDesc}>{group.description}</p>
                      <p className={styles.exploreStat}>{group.member_count.toLocaleString()} members · {group.discussion_count} discussions</p>
                    </div>
                    <button
                      className={styles.joinBtn}
                      onClick={() => toggleJoin(group.id)}
                    >
                      JOIN
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className={styles.modalTitle} style={{ margin: 0 }}>Create New Group</h2>
              <button className={styles.backBtn} onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Group Name *</label>
              <input className={styles.formInput} placeholder="Enter group name" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} maxLength={60} />
              <p className={styles.formHint}>{createForm.name.length}/60 characters</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea className={styles.formTextarea} placeholder="What is this group about?" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} maxLength={500} />
              <p className={styles.formHint}>{createForm.description.length}/500 characters</p>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select className={`${styles.formInput} ${styles.sortSelect}`} value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>
                  <option value="general">General</option>
                  <option value="competitive">Competitive</option>
                  <option value="sound-design">Sound Design</option>
                  <option value="memes">Memes & Humor</option>
                  <option value="science">Science</option>
                  <option value="premium">Premium</option>
                  <option value="support">Support</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Max Members</label>
                <input className={styles.formInput} type="number" placeholder="Unlimited" value={createForm.maxMembers} onChange={e => setCreateForm({ ...createForm, maxMembers: e.target.value })} min={2} />
                <p className={styles.formHint}>Leave empty for unlimited</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Privacy</label>
              <div className={styles.toggleRow}>
                <button className={`${styles.toggleBtn} ${createForm.privacy === 'public' ? styles.toggleBtnActive : ''}`} onClick={() => setCreateForm({ ...createForm, privacy: 'public' })}>
                  <Globe size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} /> Public
                </button>
                <button className={`${styles.toggleBtn} ${createForm.privacy === 'private' ? styles.toggleBtnActive : ''}`} onClick={() => setCreateForm({ ...createForm, privacy: 'private' })}>
                  <Lock size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} /> Private
                </button>
              </div>
              <p className={styles.formHint}>{createForm.privacy === 'public' ? 'Anyone can find and join this group' : 'Only invited users can join'}</p>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formToggle}>
                <div>
                  <div className={styles.formToggleLabel}>Allow members to invite others</div>
                  <div className={styles.formToggleDesc}>Members can send invites to their friends</div>
                </div>
                <button className={`${styles.toggleSwitch} ${createForm.allowInvites ? styles.toggleSwitchOn : ''}`} onClick={() => setCreateForm({ ...createForm, allowInvites: !createForm.allowInvites })} />
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formToggle}>
                <div>
                  <div className={styles.formToggleLabel}>Require approval to join</div>
                  <div className={styles.formToggleDesc}>New members must be approved by a leader</div>
                </div>
                <button className={`${styles.toggleSwitch} ${createForm.requireApproval ? styles.toggleSwitchOn : ''}`} onClick={() => setCreateForm({ ...createForm, requireApproval: !createForm.requireApproval })} />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Group Rules</label>
              <textarea className={styles.formTextarea} placeholder="Enter each rule on a new line..." value={createForm.rules} onChange={e => setCreateForm({ ...createForm, rules: e.target.value })} rows={4} />
              <p className={styles.formHint}>One rule per line. These will be displayed in the About section.</p>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => { setShowCreateModal(false); setCreateForm(INITIAL_FORM) }}>Cancel</button>
              <button className={styles.modalCreateBtn} disabled={!createForm.name.trim() || creating} onClick={handleCreateGroup}>
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function Groups() {
  return (
    <AuthGate>
      <GroupsPage />
    </AuthGate>
  )
}
