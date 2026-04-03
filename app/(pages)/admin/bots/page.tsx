'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/app/lib/supabaseClient';
import { Bot, Play, Pause, RefreshCw, Plus, Send, Trash2, Edit3, User } from 'lucide-react';
import RoleGate from '@/app/components/RoleGate/RoleGate';
import styles from './BotsAdmin.module.css';

interface BotUser {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  is_private: boolean;
  is_premium: boolean;
  premium_tier: string;
  is_admin: boolean;
  is_bot: boolean;
  bot_personality: any;
  fb_coins: number;
  fb_gold: number;
  premium_since: string | null;
  last_username_change_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BotPost {
  id: string;
  bot_user_id: string;
  generated_content: string;
  scheduled_for: string;
  posted_at: string | null;
  status: string;
  users: any;
}

export default function BotsAdminPage() {
  return (
    <RoleGate minLevel={3} permission="bots.view" fallbackMessage="You need at least Senior Moderator (Level 3) access to manage bots.">
      <BotsAdminContent />
    </RoleGate>
  );
}

function BotsAdminContent() {
  const { user } = useAuth();
  const supabase = createClient();
  
  const [bots, setBots] = useState<BotUser[]>([]);
  const [recentPosts, setRecentPosts] = useState<BotPost[]>([]);
  const [pendingPosts, setPendingPosts] = useState<BotPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [dbReady, setDbReady] = useState(true);

  // Manual bot creation state
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [newBot, setNewBot] = useState({ username: '', display_name: '', bio: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Manual post state
  const [showManualPost, setShowManualPost] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  // Edit bot state
  const [editingBot, setEditingBot] = useState<BotUser | null>(null);
  const [editForm, setEditForm] = useState({ username: '', display_name: '', bio: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load bots (this uses the users table which always exists)
      const { data: botsData, error: botsError } = await supabase
        .from('users')
        .select('*')
        .eq('is_bot', true)
        .order('created_at', { ascending: false });

      if (botsError) {
        console.error('Error loading bots:', botsError);
        // is_bot column might not exist yet
        if (botsError.message?.includes('is_bot')) {
          setDbReady(false);
        }
      } else {
        setBots(botsData || []);
      }

      // Try loading bot_posts and bot_config (might not exist yet)
      try {
        const { data: recentData } = await supabase
          .from('bot_posts')
          .select('*, users!bot_posts_bot_user_id_fkey(username, display_name)')
          .eq('status', 'posted')
          .order('posted_at', { ascending: false })
          .limit(10);

        if (recentData) setRecentPosts(recentData as any);

        const { data: pendingData } = await supabase
          .from('bot_posts')
          .select('*, users!bot_posts_bot_user_id_fkey(username, display_name)')
          .eq('status', 'pending')
          .order('scheduled_for', { ascending: true })
          .limit(10);

        if (pendingData) setPendingPosts(pendingData as any);

        const { data: configData } = await supabase
          .from('bot_config')
          .select('config_key, config_value');

        if (configData) {
          const configObj: any = {};
          configData.forEach((item: any) => {
            configObj[item.config_key] = item.config_value;
          });
          setIsEnabled(configObj.bot_enabled?.enabled || false);
        }
      } catch {
        console.warn('bot_posts/bot_config tables may not exist yet');
        setDbReady(false);
      }
    } catch (error) {
      console.error('Error loading bot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBots = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('bot_config')
        .update({ config_value: { enabled: !isEnabled } } as any)
        .eq('config_key', 'bot_enabled');

      if (!error) {
        setIsEnabled(!isEnabled);
      }
    } catch (error) {
      console.error('Error toggling bots:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const schedulePosts = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/bots/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || 'admin'}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        await loadData();
        alert(`Posts scheduled! ${data.posts_scheduled || 0} posts created.`);
      } else {
        alert(`Scheduling failed: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error scheduling posts:', error);
      alert('Failed to schedule posts');
    } finally {
      setActionLoading(false);
    }
  };

  const publishPendingPosts = async () => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/bots/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || 'admin'}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        await loadData();
        alert(`Published ${data.successful || 0} posts! (${data.failed || 0} failed)`);
      } else {
        alert(`Publishing failed: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error publishing posts:', error);
      alert('Failed to publish posts');
    } finally {
      setActionLoading(false);
    }
  };

  const createManualBot = async () => {
    if (!newBot.username.trim() || !newBot.display_name.trim()) {
      alert('Username and display name are required');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch('/api/admin/bot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-bot',
          username: newBot.username,
          display_name: newBot.display_name,
          bio: newBot.bio,
          controlled_by: user?.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(`Failed to create bot: ${data.error}`);
      } else {
        setNewBot({ username: '', display_name: '', bio: '' });
        setShowCreateBot(false);
        await loadData();
        alert(`Bot @${data.bot.username} created successfully!`);
      }
    } catch (error: any) {
      console.error('Error creating bot:', error);
      alert('Failed to create bot');
    } finally {
      setCreateLoading(false);
    }
  };

  const postAsBot = async () => {
    if (!selectedBotId || !manualContent.trim()) {
      alert('Select a bot and enter content');
      return;
    }

    setPostLoading(true);
    try {
      const response = await fetch('/api/admin/bot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post-as-bot',
          bot_id: selectedBotId,
          content: manualContent.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(`Failed to post: ${data.error}`);
      } else {
        setManualContent('');
        setShowManualPost(false);
        alert(`Post published as @${data.bot_username}!`);
        await loadData();
      }
    } catch (error: any) {
      console.error('Error posting:', error);
      alert('Failed to post');
    } finally {
      setPostLoading(false);
    }
  };

  const startEditBot = (bot: BotUser) => {
    setEditingBot(bot);
    setEditForm({
      username: bot.username,
      display_name: bot.display_name || '',
      bio: bot.bio || ''
    });
  };

  const saveEditBot = async () => {
    if (!editingBot) return;
    setEditLoading(true);
    try {
      const response = await fetch('/api/admin/bot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit-bot',
          bot_id: editingBot.id,
          username: editForm.username,
          display_name: editForm.display_name,
          bio: editForm.bio
        })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(`Failed to update bot: ${data.error}`);
      } else {
        setEditingBot(null);
        await loadData();
        alert(`Bot updated successfully!`);
      }
    } catch (error: any) {
      console.error('Error editing bot:', error);
      alert('Failed to update bot');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteBot = async (botId: string, username: string) => {
    if (!confirm(`Delete bot @${username}? This cannot be undone.`)) return;

    try {
      const response = await fetch('/api/admin/bot-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-bot',
          bot_id: botId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(`Failed to delete: ${data.error}`);
      } else {
        await loadData();
        alert(`Bot @${username} deleted.`);
      }
    } catch (error) {
      console.error('Error deleting bot:', error);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading bot management...</div>
      </div>
    );
  }

  const manualBots = bots.filter(b => b.bot_personality?.type === 'manual');
  const automatedBots = bots.filter(b => b.bot_personality?.type !== 'manual');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Bot size={40} />
          <div>
            <h1>Bot Management</h1>
            <p>Manage automated and manual bot accounts</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            onClick={() => setShowCreateBot(!showCreateBot)} 
            className={styles.actionBtn}
          >
            <Plus size={20} />
            Create Bot
          </button>
          <button 
            onClick={() => setShowManualPost(!showManualPost)} 
            className={styles.actionBtn}
            disabled={bots.length === 0}
          >
            <Send size={20} />
            Post as Bot
          </button>
          {dbReady && (
            <>
              <button 
                onClick={toggleBots} 
                className={`${styles.toggleBtn} ${isEnabled ? styles.active : ''}`}
                disabled={actionLoading}
              >
                {isEnabled ? <Pause size={20} /> : <Play size={20} />}
                {isEnabled ? 'Disable Auto' : 'Enable Auto'}
              </button>
              <button 
                onClick={schedulePosts} 
                className={styles.actionBtn}
                disabled={actionLoading}
              >
                <RefreshCw size={20} />
                Schedule
              </button>
              <button 
                onClick={publishPendingPosts} 
                className={styles.actionBtn}
                disabled={actionLoading}
              >
                <Play size={20} />
                Publish Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create Bot Form */}
      {showCreateBot && (
        <div className={styles.formCard}>
          <h2><Plus size={20} /> Create Manual Bot</h2>
          <div className={styles.formGroup}>
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. cool_bot_123"
              value={newBot.username}
              onChange={(e) => setNewBot({ ...newBot, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Display Name</label>
            <input
              type="text"
              placeholder="e.g. Cool Bot"
              value={newBot.display_name}
              onChange={(e) => setNewBot({ ...newBot, display_name: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Bio (optional)</label>
            <textarea
              placeholder="A short bio for this bot..."
              value={newBot.bio}
              onChange={(e) => setNewBot({ ...newBot, bio: e.target.value })}
              className={styles.textarea}
              rows={2}
            />
          </div>
          <div className={styles.formActions}>
            <button onClick={() => setShowCreateBot(false)} className={styles.cancelBtn}>Cancel</button>
            <button onClick={createManualBot} className={styles.actionBtn} disabled={createLoading}>
              {createLoading ? 'Creating...' : 'Create Bot'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Bot Form */}
      {editingBot && (
        <div className={styles.formCard}>
          <h2><Edit3 size={20} /> Edit Bot: @{editingBot.username}</h2>
          <div className={styles.formGroup}>
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. cool_bot_123"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() })}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Display Name</label>
            <input
              type="text"
              placeholder="e.g. Cool Bot"
              value={editForm.display_name}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Bio</label>
            <textarea
              placeholder="A short bio for this bot..."
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className={styles.textarea}
              rows={3}
            />
          </div>
          <div className={styles.formActions}>
            <button onClick={() => setEditingBot(null)} className={styles.cancelBtn}>Cancel</button>
            <button onClick={saveEditBot} className={styles.actionBtn} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Manual Post Form */}
      {showManualPost && bots.length > 0 && (
        <div className={styles.formCard}>
          <h2><Send size={20} /> Post as Bot</h2>
          <div className={styles.formGroup}>
            <label>Select Bot</label>
            <select
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              className={styles.input}
            >
              <option value="">-- Choose a bot --</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  @{bot.username} ({bot.display_name})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Post Content</label>
            <textarea
              placeholder="Write a post as this bot..."
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              className={styles.textarea}
              rows={4}
            />
          </div>
          <div className={styles.formActions}>
            <button onClick={() => setShowManualPost(false)} className={styles.cancelBtn}>Cancel</button>
            <button onClick={postAsBot} className={styles.actionBtn} disabled={postLoading}>
              {postLoading ? 'Posting...' : 'Publish Post'}
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <div className={styles.statusCard}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Total Bots:</span>
          <span className={styles.statusValue}>{bots.length}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Manual Bots:</span>
          <span className={styles.statusValue}>{manualBots.length}</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Automated:</span>
          <span className={styles.statusValue}>{automatedBots.length}</span>
        </div>
        {dbReady && (
          <>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Auto Status:</span>
              <span className={`${styles.statusValue} ${isEnabled ? styles.enabled : styles.disabled}`}>
                {isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Pending:</span>
              <span className={styles.statusValue}>{pendingPosts.length}</span>
            </div>
          </>
        )}
      </div>

      {/* Manual Bots Section */}
      {manualBots.length > 0 && (
        <div className={styles.botsSection}>
          <h2><User size={20} /> Manual Bots ({manualBots.length})</h2>
          <div className={styles.botsGrid}>
            {manualBots.map((bot) => (
              <div key={bot.id} className={`${styles.botCard} ${styles.manualBotCard}`}>
                <div className={styles.botHeader}>
                  <Bot size={24} />
                  <div>
                    <h3>{bot.display_name}</h3>
                    <p className={styles.username}>@{bot.username}</p>
                  </div>
                </div>
                <p className={styles.bio}>{bot.bio}</p>
                <div className={styles.botCardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => startEditBot(bot)}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    className={styles.postBtn}
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setShowManualPost(true);
                    }}
                  >
                    <Send size={14} /> Post
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteBot(bot.id, bot.username)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automated Bots Section */}
      {automatedBots.length > 0 && (
        <div className={styles.botsSection}>
          <h2><Bot size={20} /> Automated Bots ({automatedBots.length})</h2>
          <div className={styles.botsGrid}>
            {automatedBots.map((bot) => (
              <div key={bot.id} className={styles.botCard}>
                <div className={styles.botHeader}>
                  <Bot size={24} />
                  <div>
                    <h3>{bot.display_name}</h3>
                    <p className={styles.username}>@{bot.username}</p>
                  </div>
                </div>
                <p className={styles.bio}>{bot.bio}</p>
                <div className={styles.botStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Age:</span>
                    <span className={styles.statValue}>{bot.bot_personality?.age || 'N/A'}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Traits:</span>
                    <span className={styles.statValue}>
                      {bot.bot_personality?.traits?.slice(0, 3).join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className={styles.botCardActions}>
                  <button
                    className={styles.editBtn}
                    onClick={() => startEditBot(bot)}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    className={styles.postBtn}
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setShowManualPost(true);
                    }}
                  >
                    <Send size={14} /> Post
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bots.length === 0 && (
        <div className={styles.emptyState}>
          <Bot size={48} />
          <h3>No Bots Yet</h3>
          <p>Create your first bot using the &quot;Create Bot&quot; button above.</p>
        </div>
      )}

      {/* Pending Posts */}
      {dbReady && pendingPosts.length > 0 && (
        <div className={styles.postsSection}>
          <h2>Pending Posts ({pendingPosts.length})</h2>
          <div className={styles.postsList}>
            {pendingPosts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.botInfo}>
                    <Bot size={16} />
                    <span>{post.users?.display_name || 'Unknown'}</span>
                  </div>
                  <span className={styles.scheduledTime}>
                    Scheduled: {new Date(post.scheduled_for).toLocaleString()}
                  </span>
                </div>
                <p className={styles.postContent}>{post.generated_content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      {dbReady && recentPosts.length > 0 && (
        <div className={styles.postsSection}>
          <h2>Recent Posts ({recentPosts.length})</h2>
          <div className={styles.postsList}>
            {recentPosts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <div className={styles.botInfo}>
                    <Bot size={16} />
                    <span>{post.users?.display_name || 'Unknown'}</span>
                  </div>
                  <span className={styles.postedTime}>
                    Posted: {post.posted_at ? new Date(post.posted_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <p className={styles.postContent}>{post.generated_content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
