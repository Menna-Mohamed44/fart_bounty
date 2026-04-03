'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/app/lib/supabaseClient';
import { useRole } from '@/app/context/RoleContext';
import RoleGate from '@/app/components/RoleGate/RoleGate';
import {
  Library,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Music,
  FileText,
  Video,
  RefreshCw,
} from 'lucide-react';
import styles from './ContentAdmin.module.css';

interface ContentItem {
  id: string;
  type: 'post' | 'confessional' | 'sound';
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  deleted: boolean;
}

export default function ContentAdminPage() {
  return (
    <RoleGate minLevel={4} permission="content.manage" fallbackMessage="You need at least Content Manager (Level 4) access to manage site content.">
      <ContentAdminContent />
    </RoleGate>
  );
}

function ContentAdminContent() {
  const { user } = useAuth();
  const { hasPermission } = useRole();
  const supabase = createClient();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<'posts' | 'confessionals' | 'sounds'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchContent();
  }, [contentType, showDeleted]);

  async function fetchContent() {
    setLoading(true);
    try {
      if (contentType === 'posts') {
        let query = (supabase as any)
          .from('posts')
          .select('id, content, user_id, created_at, deleted, users!posts_user_id_fkey(username)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!showDeleted) {
          query = query.eq('deleted', false);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching posts:', error);
          setItems([]);
        } else {
          setItems((data || []).map((p: any) => ({
            id: p.id,
            type: 'post' as const,
            content: p.content || '',
            user_id: p.user_id,
            username: p.users?.username || 'unknown',
            created_at: p.created_at,
            deleted: p.deleted || false,
          })));
        }
      } else if (contentType === 'confessionals') {
        // Confessionals are videos — no content/deleted columns
        const { data, error } = await (supabase as any)
          .from('confessionals')
          .select('id, video_path, thumbnail_path, duration_seconds, blur_level, user_id, created_at, users!confessionals_user_id_fkey(username)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching confessionals:', error);
          setItems([]);
        } else {
          setItems((data || []).map((c: any) => ({
            id: c.id,
            type: 'confessional' as const,
            content: `Video (${c.duration_seconds || 0}s, blur: ${c.blur_level || 0})`,
            user_id: c.user_id,
            username: c.users?.username || 'unknown',
            created_at: c.created_at,
            deleted: false,
          })));
        }
      } else if (contentType === 'sounds') {
        // Sounds don't have name or deleted columns
        const { data, error } = await (supabase as any)
          .from('sounds')
          .select('id, storage_path, duration_seconds, user_id, created_at, users!sounds_user_id_fkey(username)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching sounds:', error);
          setItems([]);
        } else {
          setItems((data || []).map((s: any) => {
            const filename = s.storage_path?.split('/').pop() || 'Sound';
            return {
              id: s.id,
              type: 'sound' as const,
              content: `${filename} (${s.duration_seconds || 0}s)`,
              user_id: s.user_id,
              username: s.users?.username || 'unknown',
              created_at: s.created_at,
              deleted: false,
            };
          }));
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleDelete(item: ContentItem) {
    if (item.type !== 'post') return;
    setActionLoading(item.id);
    try {
      const newDeleted = !item.deleted;
      const { error } = await (supabase as any)
        .from('posts')
        .update({ deleted: newDeleted })
        .eq('id', item.id);

      if (error) throw error;
      await fetchContent();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteItem(item: ContentItem) {
    if (!confirm(`Permanently delete this ${item.type}?`)) return;
    setActionLoading(item.id);
    try {
      const table = contentType;
      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      await fetchContent();
    } catch (err: any) {
      alert(`Failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.content.toLowerCase().includes(q) || item.username.toLowerCase().includes(q);
  });

  const typeIcons = {
    posts: <FileText size={18} />,
    confessionals: <Video size={18} />,
    sounds: <Music size={18} />,
  };

  const canSoftDelete = contentType === 'posts';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Library size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Content Manager</h1>
            <p className={styles.subtitle}>Browse, hide, or remove site content</p>
          </div>
        </div>
        <button className={styles.refreshButton} onClick={fetchContent} disabled={loading}>
          <RefreshCw size={18} className={loading ? styles.spinning : ''} />
        </button>
      </div>

      {/* Content Type Tabs */}
      <div className={styles.tabs}>
        {(['posts', 'confessionals', 'sounds'] as const).map(type => (
          <button
            key={type}
            className={`${styles.tab} ${contentType === type ? styles.tabActive : ''}`}
            onClick={() => setContentType(type)}
          >
            {typeIcons[type]}
            <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </button>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search content or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        {canSoftDelete && (
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            <span>Show deleted</span>
          </label>
        )}
      </div>

      {/* Content List */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading content...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Library size={48} />
          <p>No content found.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(item => (
            <div key={item.id} className={`${styles.card} ${item.deleted ? styles.cardDeleted : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.cardUser}>@{item.username}</span>
                <span className={styles.cardDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                {item.deleted && <span className={styles.deletedBadge}>Hidden</span>}
              </div>
              <div className={styles.cardContent}>
                {item.content.length > 200 ? item.content.slice(0, 200) + '...' : item.content}
              </div>
              <div className={styles.cardActions}>
                {canSoftDelete && (
                  <button
                    className={`${styles.actionBtn} ${item.deleted ? styles.restoreBtn : styles.deleteBtn}`}
                    onClick={() => toggleDelete(item)}
                    disabled={actionLoading === item.id}
                    title={item.deleted ? 'Restore' : 'Soft delete'}
                  >
                    {item.deleted ? <Eye size={14} /> : <EyeOff size={14} />}
                    {item.deleted ? 'Restore' : 'Hide'}
                  </button>
                )}
                <button
                  className={`${styles.actionBtn} ${styles.banBtn}`}
                  onClick={() => deleteItem(item)}
                  disabled={actionLoading === item.id}
                  title="Permanently delete"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
