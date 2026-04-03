'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/lib/supabaseClient';
import { Shield, Flag, User, Users, ChevronDown, Check, X, Eye, Ban, AlertTriangle } from 'lucide-react';
import RoleGate from '@/app/components/RoleGate/RoleGate';
import { useRole } from '@/app/context/RoleContext';
import styles from './moderation.module.css';

type FlagStatus = 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
type FlagReason = 'spam' | 'harassment' | 'hate_speech' | 'misinformation' | 'inappropriate_content' | 'copyright_violation' | 'other';

interface FlaggedContent {
  flag_id: string;
  content_type: 'post' | 'video' | 'comment';
  content_id: string;
  content_text: string;
  content_author_id: string;
  content_author_username: string;
  content_author_avatar: string;
  reason: FlagReason;
  description: string;
  status: FlagStatus;
  reported_by_id: string;
  reported_by_username: string;
  flag_count: number;
  created_at: string;
}

interface FlaggedUser {
  flag_id: string;
  flagged_user_id: string;
  flagged_username: string;
  flagged_avatar: string;
  reason: FlagReason;
  description: string;
  status: FlagStatus;
  reported_by_id: string;
  reported_by_username: string;
  flag_count: number;
  total_flags: number;
  created_at: string;
}

interface GroupReport {
  id: string;
  group_id: string;
  group_name: string;
  reported_by: string;
  reported_by_username: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

export default function ModerationPage() {
  return (
    <RoleGate minLevel={1} permission="moderation.view" fallbackMessage="You need at least Junior Moderator (Level 1) access to view the moderation dashboard.">
      <ModerationDashboard />
    </RoleGate>
  );
}

function ModerationDashboard() {
  const { hasPermission } = useRole();
  const [activeTab, setActiveTab] = useState<'content' | 'users' | 'groups'>('content');
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('pending');
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([]);
  const [groupReports, setGroupReports] = useState<GroupReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'content') {
        const { data, error } = await supabase.rpc('get_flagged_content' as any, {
          p_status: statusFilter === 'all' ? null : statusFilter,
          p_limit: 50,
          p_offset: 0
        } as any);

        if (error) {
          console.error('RPC Error (get_flagged_content):', error);
          setError(`Failed to load flagged content: ${error.message || 'Unknown error'}`);
          setFlaggedContent([]);
        } else {
          setFlaggedContent(data || []);
          setError(null);
        }
      } else if (activeTab === 'users') {
        const { data, error } = await supabase.rpc('get_flagged_users' as any, {
          p_status: statusFilter === 'all' ? null : statusFilter,
          p_limit: 50,
          p_offset: 0
        } as any);

        if (error) {
          console.error('RPC Error (get_flagged_users):', error);
          setError(`Failed to load flagged users: ${error.message || 'Unknown error'}`);
          setFlaggedUsers([]);
        } else {
          setFlaggedUsers(data || []);
          setError(null);
        }
      } else {
        // Group reports tab
        let query = supabase
          .from('group_reports')
          .select('id, group_id, reported_by, reason, description, status, created_at')
          .order('created_at', { ascending: false })
          .limit(50);

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data: reports, error: reportsErr } = await query;

        if (reportsErr) {
          console.error('Group reports error:', reportsErr);
          setError(`Failed to load group reports: ${reportsErr.message}`);
          setGroupReports([]);
        } else if (reports && reports.length > 0) {
          // Fetch group names and reporter usernames
          const groupIds = [...new Set(reports.map(r => r.group_id))];
          const userIds = [...new Set(reports.map(r => r.reported_by))];
          const { data: groups } = await supabase.from('groups').select('id, name').in('id', groupIds);
          const { data: users } = await supabase.from('users').select('id, username').in('id', userIds);
          const groupMap = new Map((groups || []).map(g => [g.id, g.name]));
          const userMap = new Map((users || []).map(u => [u.id, u.username]));

          setGroupReports(reports.map(r => ({
            ...r,
            group_name: groupMap.get(r.group_id) || 'Unknown Group',
            reported_by_username: userMap.get(r.reported_by) || 'unknown',
          })));
          setError(null);
        } else {
          setGroupReports([]);
          setError(null);
        }
      }
    } catch (error: any) {
      console.error('Error loading flagged items:', error);
      setError(error?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function moderateFlag(
    flagId: string,
    flagType: 'content' | 'user',
    newStatus: FlagStatus,
    actionType?: string,
    actionReason?: string
  ) {
    setActionInProgress(flagId);
    try {
      // Try the RPC approach first
      const { error: rpcError } = await supabase.rpc('moderate_flag' as any, {
        p_flag_id: flagId,
        p_flag_type: flagType,
        p_new_status: newStatus,
        p_action_type: actionType,
        p_action_reason: actionReason
      } as any);

      if (rpcError) {
        console.warn('RPC moderate_flag failed, using fallback:', rpcError.message);

        // Fallback: directly update the flag status
        if (flagType === 'content') {
          await (supabase as any)
            .from('content_flags')
            .update({ status: newStatus, reviewed_at: new Date().toISOString() })
            .eq('id', flagId);
        } else {
          await (supabase as any)
            .from('user_flags')
            .update({ status: newStatus, reviewed_at: new Date().toISOString() })
            .eq('id', flagId);
        }
      }

      // Directly remove the content from the database to guarantee it disappears
      if (actionType === 'remove_content' && flagType === 'content') {
        const item = flaggedContent.find(c => c.flag_id === flagId);
        if (item) {
          const table = item.content_type === 'post' ? 'posts' : item.content_type === 'comment' ? 'comments' : null;
          if (table) {
            // Set deleted=true (feeds filter on this) AND is_banned=true (RLS backup)
            const { error: deleteError } = await (supabase as any)
              .from(table)
              .update({
                deleted: true,
                is_banned: true,
                ban_reason: actionReason || 'Removed by moderator'
              })
              .eq('id', item.content_id);

            if (deleteError) {
              console.warn(`Direct ${table} update failed:`, deleteError.message);
              // Try just deleted flag as last resort
              await (supabase as any)
                .from(table)
                .update({ deleted: true })
                .eq('id', item.content_id);
            }
          }
        }
      }

      // Ban user directly
      if (actionType === 'ban_user' && flagType === 'user') {
        const item = flaggedUsers.find(u => u.flag_id === flagId);
        if (item) {
          const { error: banError } = await (supabase as any)
            .from('users')
            .update({
              is_banned: true,
              ban_reason: actionReason || 'Banned by moderator',
              banned_at: new Date().toISOString()
            })
            .eq('id', item.flagged_user_id);

          if (banError) {
            console.warn('Direct user ban failed:', banError.message);
          }
        }
      }

      const actionLabels: Record<string, string> = {
        'remove_content': 'Content removed',
        'ban_user': 'User banned',
        'warn_user': 'User warned',
        'dismissed': 'Flag dismissed',
        'reviewed': 'Marked as reviewed'
      };
      const label = actionLabels[actionType || newStatus] || 'Action completed';
      alert(`${label} successfully!`);

      await loadData();
      setSelectedItem(null);
    } catch (error: any) {
      console.error('Error moderating flag:', error);
      alert(`Moderation action failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setActionInProgress(null);
    }
  }

  const reasonLabels: Record<FlagReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    hate_speech: 'Hate Speech',
    misinformation: 'Misinformation',
    inappropriate_content: 'Inappropriate Content',
    copyright_violation: 'Copyright Violation',
    other: 'Other'
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Shield size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Moderation Dashboard</h1>
            <p className={styles.subtitle}>Review and manage flagged content and users</p>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status:</label>
          <select 
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FlagStatus | 'all')}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="action_taken">Action Taken</option>
          </select>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'content' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <Flag size={18} />
          Flagged Content
          {activeTab === 'content' && (
            <span className={styles.tabBadge}>{flaggedContent.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <User size={18} />
          Flagged Users
          {activeTab === 'users' && (
            <span className={styles.tabBadge}>{flaggedUsers.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'groups' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <Users size={18} />
          Group Reports
          {activeTab === 'groups' && (
            <span className={styles.tabBadge}>{groupReports.length}</span>
          )}
        </button>
      </div>

      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={loadData} className={styles.retryButton}>
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading flagged items...</p>
          </div>
        ) : activeTab === 'content' ? (
          <div className={styles.list}>
            {flaggedContent.length === 0 ? (
              <div className={styles.empty}>
                <Flag size={48} />
                <p>No flagged content found</p>
              </div>
            ) : (
              flaggedContent.map((item) => (
                <div key={item.flag_id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardUser}>
                      <img
                        src={item.content_author_avatar || '/profile.jpg'}
                        alt={item.content_author_username}
                        className={styles.avatar}
                      />
                      <div>
                        <div className={styles.username}>{item.content_author_username}</div>
                        <div className={styles.meta}>
                          <span className={styles.contentType}>{item.content_type}</span>
                          <span className={styles.dot}>•</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.flagInfo}>
                      <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                        {item.status}
                      </span>
                      {item.flag_count > 1 && (
                        <span className={styles.flagCount}>
                          {item.flag_count} flags
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardContent}>
                    <p className={styles.contentText}>{item.content_text}</p>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.reportInfo}>
                      <AlertTriangle size={14} className={styles.warningIcon} />
                      <span className={styles.reason}>{reasonLabels[item.reason]}</span>
                      {item.description && (
                        <span className={styles.description}>- {item.description}</span>
                      )}
                    </div>
                    <div className={styles.reportedBy}>
                      Reported by <strong>{item.reported_by_username}</strong>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionDismiss}`}
                        onClick={() => moderateFlag(item.flag_id, 'content', 'dismissed')}
                        disabled={actionInProgress === item.flag_id}
                      >
                        <X size={16} />
                        {actionInProgress === item.flag_id ? 'Processing...' : 'Dismiss'}
                      </button>
                      {hasPermission('moderation.action') && (
                        <>
                          <button
                            className={`${styles.actionButton} ${styles.actionReview}`}
                            onClick={() => moderateFlag(item.flag_id, 'content', 'reviewed')}
                            disabled={actionInProgress === item.flag_id}
                          >
                            <Eye size={16} />
                            Mark Reviewed
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.actionRemove}`}
                            onClick={() => moderateFlag(item.flag_id, 'content', 'action_taken', 'remove_content', 'Content removed by moderator')}
                            disabled={actionInProgress === item.flag_id}
                          >
                            <Ban size={16} />
                            {actionInProgress === item.flag_id ? 'Removing...' : 'Remove Content'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className={styles.list}>
            {flaggedUsers.length === 0 ? (
              <div className={styles.empty}>
                <User size={48} />
                <p>No flagged users found</p>
              </div>
            ) : (
              flaggedUsers.map((item) => (
                <div key={item.flag_id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardUser}>
                      <img
                        src={item.flagged_avatar || '/profile.jpg'}
                        alt={item.flagged_username}
                        className={styles.avatar}
                      />
                      <div>
                        <div className={styles.username}>{item.flagged_username}</div>
                        <div className={styles.meta}>
                          <span>{item.total_flags} total content flags</span>
                          <span className={styles.dot}>•</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.flagInfo}>
                      <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                        {item.status}
                      </span>
                      {item.flag_count > 1 && (
                        <span className={styles.flagCount}>
                          {item.flag_count} user flags
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.reportInfo}>
                      <AlertTriangle size={14} className={styles.warningIcon} />
                      <span className={styles.reason}>{reasonLabels[item.reason]}</span>
                      {item.description && (
                        <span className={styles.description}>- {item.description}</span>
                      )}
                    </div>
                    <div className={styles.reportedBy}>
                      Reported by <strong>{item.reported_by_username}</strong>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionDismiss}`}
                        onClick={() => moderateFlag(item.flag_id, 'user', 'dismissed')}
                        disabled={actionInProgress === item.flag_id}
                      >
                        <X size={16} />
                        Dismiss
                      </button>
                      {hasPermission('moderation.action') && (
                        <>
                          <button
                            className={`${styles.actionButton} ${styles.actionReview}`}
                            onClick={() => moderateFlag(item.flag_id, 'user', 'reviewed')}
                            disabled={actionInProgress === item.flag_id}
                          >
                            <Eye size={16} />
                            Mark Reviewed
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.actionWarn}`}
                            onClick={() => moderateFlag(item.flag_id, 'user', 'action_taken', 'warn_user', 'User warned by moderator')}
                            disabled={actionInProgress === item.flag_id}
                          >
                            <AlertTriangle size={16} />
                            Warn User
                          </button>
                        </>
                      )}
                      {hasPermission('moderation.ban') && (
                        <button
                          className={`${styles.actionButton} ${styles.actionBan}`}
                          onClick={() => moderateFlag(item.flag_id, 'user', 'action_taken', 'ban_user', 'User banned by moderator')}
                          disabled={actionInProgress === item.flag_id}
                        >
                          <Ban size={16} />
                          {actionInProgress === item.flag_id ? 'Processing...' : 'Ban User'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {groupReports.length === 0 ? (
              <div className={styles.empty}>
                <Users size={48} />
                <p>No group reports found</p>
              </div>
            ) : (
              groupReports.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardUser}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(144,238,144,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#90ee90', fontWeight: 700, fontSize: '0.8rem' }}>
                        {item.group_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.username}>{item.group_name}</div>
                        <div className={styles.meta}>
                          <span style={{ color: '#90ee90' }}>Group Report</span>
                          <span className={styles.dot}>•</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.flagInfo}>
                      <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.reportInfo}>
                      <AlertTriangle size={14} className={styles.warningIcon} />
                      <span className={styles.reason}>{item.reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      {item.description && (
                        <span className={styles.description}>- {item.description}</span>
                      )}
                    </div>
                    <div className={styles.reportedBy}>
                      Reported by <strong>{item.reported_by_username}</strong>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className={styles.actions}>
                      <button
                        className={`${styles.actionButton} ${styles.actionDismiss}`}
                        onClick={async () => {
                          setActionInProgress(item.id)
                          const { data, error } = await (supabase as any).rpc('moderate_group_report', { p_report_id: item.id, p_action: 'dismiss' })
                          if (error || (data && !data.success)) {
                            alert(`Failed to dismiss: ${error?.message || data?.error || 'Unknown error'}`)
                          } else {
                            alert('Report dismissed.')
                          }
                          await loadData()
                          setActionInProgress(null)
                        }}
                        disabled={actionInProgress === item.id}
                      >
                        <X size={16} />
                        {actionInProgress === item.id ? 'Processing...' : 'Dismiss'}
                      </button>
                      {hasPermission('moderation.action') && (
                        <button
                          className={`${styles.actionButton} ${styles.actionReview}`}
                          onClick={async () => {
                            setActionInProgress(item.id)
                            const { data, error } = await (supabase as any).rpc('moderate_group_report', { p_report_id: item.id, p_action: 'review' })
                            if (error || (data && !data.success)) {
                              alert(`Failed to review: ${error?.message || data?.error || 'Unknown error'}`)
                            } else {
                              alert('Report marked as reviewed.')
                            }
                            await loadData()
                            setActionInProgress(null)
                          }}
                          disabled={actionInProgress === item.id}
                        >
                          <Eye size={16} />
                          Mark Reviewed
                        </button>
                      )}
                      {hasPermission('moderation.action') && (
                        <>
                          <button
                            className={`${styles.actionButton} ${styles.actionWarn}`}
                            onClick={async () => {
                              setActionInProgress(item.id)
                              const { data, error } = await (supabase as any).rpc('moderate_group_report', { p_report_id: item.id, p_action: 'warn_owner' })
                              if (error || (data && !data.success)) {
                                alert(`Failed to warn owner: ${error?.message || data?.error || 'Unknown error'}`)
                              } else {
                                alert('Group owner warned via notification.')
                              }
                              await loadData()
                              setActionInProgress(null)
                            }}
                            disabled={actionInProgress === item.id}
                          >
                            <AlertTriangle size={16} />
                            Warn Owner
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.actionRemove}`}
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to permanently delete the group "${item.group_name}"? This cannot be undone.`)) return
                              setActionInProgress(item.id)
                              const { data, error } = await (supabase as any).rpc('moderate_group_report', { p_report_id: item.id, p_action: 'remove_group' })
                              if (error || (data && !data.success)) {
                                alert(`Failed to remove group: ${error?.message || data?.error || 'Unknown error'}`)
                              } else {
                                alert('Group has been removed.')
                              }
                              await loadData()
                              setActionInProgress(null)
                            }}
                            disabled={actionInProgress === item.id}
                          >
                            <Ban size={16} />
                            {actionInProgress === item.id ? 'Removing...' : 'Remove Group'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
