'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/app/lib/supabaseClient';
import { useRole, ROLE_CONFIG } from '@/app/context/RoleContext';
import RoleGate from '@/app/components/RoleGate/RoleGate';
import Image from 'next/image';
import { Users, Search, Shield, ChevronDown, Trash2, Save, Plus, X } from 'lucide-react';
import styles from './RolesAdmin.module.css';

interface UserWithRole {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  role?: {
    id: string;
    role_level: number;
    role_title: string;
    assigned_at: string;
    notes: string | null;
  };
}

export default function RolesAdminPage() {
  return (
    <RoleGate minLevel={5} permission="roles.manage" fallbackMessage="You need Admin (Level 5) access to manage roles.">
      <RolesAdminContent />
    </RoleGate>
  );
}

function RolesAdminContent() {
  const { user } = useAuth();
  const { refreshRole } = useRole();
  const supabase = createClient();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<UserWithRole | null>(null);
  const [assignLevel, setAssignLevel] = useState(1);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserWithRole[]>([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  async function fetchUsersWithRoles() {
    setLoading(true);
    try {
      // Fetch all users who have roles
      const { data: roles, error: rolesError } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .order('role_level', { ascending: false });

      if (rolesError) {
        // 42P01 = table doesn't exist yet (migration not run)
        const tableNotFound = rolesError.code === '42P01' ||
          (rolesError.message && rolesError.message.includes('does not exist'));
        if (!tableNotFound) {
          console.error('Error fetching roles:', rolesError.code, rolesError.message);
        }
        setUsers([]);
        setLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user details for each role
      const userIds = roles.map((r: any) => r.user_id);
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('id, username, display_name, avatar_url, is_admin')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching users:', userError);
      }

      const userMap = new Map((userData || []).map((u: any) => [u.id, u]));
      const merged: UserWithRole[] = roles.map((role: any) => {
        const u = userMap.get(role.user_id) || {};
        return {
          id: role.user_id,
          username: (u as any).username || 'unknown',
          display_name: (u as any).display_name || null,
          avatar_url: (u as any).avatar_url || null,
          is_admin: (u as any).is_admin || false,
          role: {
            id: role.id,
            role_level: role.role_level,
            role_title: role.role_title,
            assigned_at: role.assigned_at,
            notes: role.notes,
          },
        };
      });

      setUsers(merged);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(query: string) {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await (supabase as any)
      .from('users')
      .select('id, username, display_name, avatar_url, is_admin')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return;
    }
    setSearchResults((data || []).map((u: any) => ({
      ...u,
      role: users.find(existing => existing.id === u.id)?.role,
    })));
  }

  async function assignRole() {
    if (!assignTarget || !user) return;
    setActionLoading(true);
    try {
      const title = assignTitle || ROLE_CONFIG[assignLevel]?.title || '';

      // Upsert the role
      const { error } = await (supabase as any)
        .from('user_roles')
        .upsert({
          user_id: assignTarget.id,
          role_level: assignLevel,
          role_title: title,
          assigned_by: user.id,
          notes: assignNotes || null,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      alert(`Role assigned: ${title} (Level ${assignLevel}) to @${assignTarget.username}`);
      setShowAssignModal(false);
      setAssignTarget(null);
      setAssignTitle('');
      setAssignNotes('');
      await fetchUsersWithRoles();
      await refreshRole();
    } catch (err: any) {
      console.error('Error assigning role:', err);
      alert(`Failed to assign role: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function removeRole(userId: string, username: string) {
    if (!confirm(`Remove role from @${username}?`)) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      alert(`Role removed from @${username}`);
      await fetchUsersWithRoles();
      await refreshRole();
    } catch (err: any) {
      console.error('Error removing role:', err);
      alert(`Failed to remove role: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function updateRoleLevel(userId: string, newLevel: number) {
    setActionLoading(true);
    try {
      const newTitle = ROLE_CONFIG[newLevel]?.title || '';
      const { error } = await (supabase as any)
        .from('user_roles')
        .update({ role_level: newLevel, role_title: newTitle })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUsersWithRoles();
      await refreshRole();
    } catch (err: any) {
      console.error('Error updating role:', err);
      alert(`Failed to update role: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || u.role?.role_level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Users size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Role Manager</h1>
            <p className={styles.subtitle}>Assign and manage staff roles & permissions</p>
          </div>
        </div>
        <button
          className={styles.assignButton}
          onClick={() => { setShowAssignModal(true); setAssignTarget(null); setUserSearch(''); setSearchResults([]); }}
        >
          <Plus size={18} />
          Assign Role
        </button>
      </div>

      {/* Admin Roles Bar */}
      <div className={styles.rolesBar}>
        <div className={styles.rolesBarHeader}>
          <Shield size={20} />
          <span>Admin Role Levels</span>
        </div>
        <div className={styles.rolesGrid}>
          {[1, 2, 3, 4, 5].map(level => {
            const config = ROLE_CONFIG[level];
            const count = users.filter(u => u.role?.role_level === level).length;
            const permLabels: Record<number, string[]> = {
              1: ['View flagged content', 'Dismiss flags'],
              2: ['Review content', 'Remove posts', 'Warn users'],
              3: ['Ban users', 'Manage bots'],
              4: ['Manage content', 'Manage store'],
              5: ['Manage roles', 'Full admin access'],
            };
            return (
              <div key={level} className={styles.roleCard} style={{ borderColor: config.color + '40' }}>
                <div className={styles.roleCardBadge}>
                  <Image
                    src={config.badge}
                    alt={config.title}
                    width={120}
                    height={120}
                    className={styles.roleBadgeLarge}
                  />
                </div>
                <div className={styles.roleCardBody}>
                  <span className={styles.roleCardLevel} style={{ color: config.color }}>Level {level}</span>
                  <span className={styles.roleCardTitle}>{config.title}</span>
                  <ul className={styles.roleCardPerms}>
                    {permLabels[level].map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                  <span className={styles.roleCardCount}>
                    {count} {count === 1 ? 'user' : 'users'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterLevel === 'all' ? 'all' : filterLevel}
          onChange={(e) => setFilterLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value="all">All Levels</option>
          <option value="1">Level 1 - Junior Moderator</option>
          <option value="2">Level 2 - Moderator</option>
          <option value="3">Level 3 - Senior Moderator</option>
          <option value="4">Level 4 - Content Manager</option>
          <option value="5">Level 5 - Admin</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading roles...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={styles.empty}>
          <Shield size={48} />
          <p>{users.length === 0 ? 'No roles assigned yet. Click "Assign Role" to get started.' : 'No users match your search.'}</p>
        </div>
      ) : (
        <div className={styles.usersList}>
          {filteredUsers.map(u => (
            <div key={u.id} className={styles.userCard}>
              <div className={styles.userCardLeft}>
                <div className={styles.userAvatar}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} />
                  ) : (
                    <span>{(u.display_name || u.username)[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>
                    {u.display_name || u.username}
                  </div>
                  <div className={styles.userHandle}>@{u.username}</div>
                </div>
              </div>
              <div className={styles.userCardCenter}>
                {u.role && (
                  <>
                    <Image
                      src={ROLE_CONFIG[u.role.role_level]?.badge || ''}
                      alt={u.role.role_title}
                      width={64}
                      height={64}
                      className={styles.userBadge}
                    />
                    <div className={styles.roleInfo}>
                      <span className={styles.roleTitle}>{u.role.role_title || ROLE_CONFIG[u.role.role_level]?.title}</span>
                      <span className={styles.roleLevel}>Level {u.role.role_level}</span>
                    </div>
                  </>
                )}
              </div>
              <div className={styles.userCardRight}>
                <select
                  className={styles.levelSelect}
                  value={u.role?.role_level || 0}
                  onChange={(e) => updateRoleLevel(u.id, Number(e.target.value))}
                  disabled={actionLoading}
                >
                  {[1, 2, 3, 4, 5].map(l => (
                    <option key={l} value={l}>Lvl {l}</option>
                  ))}
                </select>
                <button
                  className={styles.removeButton}
                  onClick={() => removeRole(u.id, u.username)}
                  disabled={actionLoading}
                  title="Remove role"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Assign Role</h2>
              <button className={styles.modalClose} onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* User Search */}
              <label className={styles.label}>Search User</label>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); searchUsers(e.target.value); }}
                  className={styles.searchInput}
                />
              </div>

              {searchResults.length > 0 && !assignTarget && (
                <div className={styles.searchResults}>
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      className={styles.searchResult}
                      onClick={() => { setAssignTarget(u); setSearchResults([]); }}
                    >
                      <div className={styles.searchResultAvatar}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} />
                        ) : (
                          <span>{(u.display_name || u.username)[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className={styles.searchResultName}>{u.display_name || u.username}</div>
                        <div className={styles.searchResultHandle}>@{u.username}</div>
                      </div>
                      {u.role && (
                        <span className={styles.existingRole}>Level {u.role.role_level}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {assignTarget && (
                <div className={styles.selectedUser}>
                  <div className={styles.selectedUserInfo}>
                    <strong>{assignTarget.display_name || assignTarget.username}</strong>
                    <span>@{assignTarget.username}</span>
                  </div>
                  <button className={styles.clearUser} onClick={() => setAssignTarget(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Role Level */}
              <label className={styles.label}>Role Level</label>
              <div className={styles.rolePicker}>
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    className={`${styles.roleOption} ${assignLevel === level ? styles.roleOptionActive : ''}`}
                    onClick={() => { setAssignLevel(level); setAssignTitle(ROLE_CONFIG[level].title); }}
                  >
                    <Image
                      src={ROLE_CONFIG[level].badge}
                      alt={ROLE_CONFIG[level].title}
                      width={64}
                      height={64}
                    />
                    <span className={styles.roleOptionLevel}>Lvl {level}</span>
                    <span className={styles.roleOptionTitle}>{ROLE_CONFIG[level].title}</span>
                  </button>
                ))}
              </div>

              {/* Custom Title */}
              <label className={styles.label}>Custom Title (optional)</label>
              <input
                type="text"
                className={styles.input}
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder={ROLE_CONFIG[assignLevel]?.title || 'Role title'}
              />

              {/* Notes */}
              <label className={styles.label}>Notes (optional)</label>
              <textarea
                className={styles.textarea}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Reason for role assignment..."
                rows={2}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={assignRole}
                disabled={!assignTarget || actionLoading}
              >
                <Save size={16} />
                {actionLoading ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
