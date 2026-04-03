/**
 * Admin Bot Action API
 * Server-side route using service role key to bypass RLS for bot operations.
 * Supports: post-as-bot, create-bot, delete-bot
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const supabase = createServiceClient();

    // For now, we rely on the fact that this endpoint is only called from the admin page
    // The admin page already checks user.is_admin before rendering

    switch (action) {
      case 'post-as-bot': {
        const { bot_id, content } = body;
        if (!bot_id || !content?.trim()) {
          return NextResponse.json({ error: 'bot_id and content are required' }, { status: 400 });
        }

        // Verify the bot exists
        const { data: bot } = await supabase
          .from('users')
          .select('id, username, is_bot')
          .eq('id', bot_id)
          .eq('is_bot', true)
          .single();

        if (!bot) {
          return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
        }

        const { data: post, error } = await supabase
          .from('posts')
          .insert({
            user_id: bot_id,
            content: content.trim()
          })
          .select()
          .single();

        if (error) {
          console.error('Post as bot error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, post, bot_username: bot.username });
      }

      case 'create-bot': {
        const { username, display_name, bio, controlled_by } = body;
        if (!username?.trim() || !display_name?.trim()) {
          return NextResponse.json({ error: 'username and display_name are required' }, { status: 400 });
        }

        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

        // Check if username exists
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', cleanUsername)
          .single();

        if (existing) {
          return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        const { data, error } = await supabase
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            username: cleanUsername,
            display_name: display_name.trim(),
            bio: (bio?.trim()) || 'Manual bot account',
            is_bot: true,
            bot_personality: {
              type: 'manual',
              controlled_by: controlled_by || 'admin',
              traits: ['manual-control'],
              posting_schedule: [],
              post_templates: {},
              shares_content: false,
              shares_per_day: 0,
              tone: 'custom'
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Create bot error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, bot: data });
      }

      case 'edit-bot': {
        const { bot_id, username: editUsername, display_name: editDisplayName, bio: editBio } = body;
        if (!bot_id) {
          return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
        }

        // Verify it's a bot
        const { data: editBot } = await supabase
          .from('users')
          .select('id, username, is_bot')
          .eq('id', bot_id)
          .eq('is_bot', true)
          .single();

        if (!editBot) {
          return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
        }

        const updates: Record<string, any> = {};
        if (editUsername?.trim()) {
          const cleanEditUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
          // Check if username is taken by someone else
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', cleanEditUsername)
            .neq('id', bot_id)
            .single();

          if (existingUser) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
          }
          updates.username = cleanEditUsername;
        }
        if (editDisplayName?.trim()) updates.display_name = editDisplayName.trim();
        if (editBio !== undefined) updates.bio = editBio?.trim() || '';

        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const { data: updatedBot, error: editError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', bot_id)
          .select()
          .single();

        if (editError) {
          console.error('Edit bot error:', editError);
          return NextResponse.json({ error: editError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, bot: updatedBot });
      }

      case 'delete-bot': {
        const { bot_id } = body;
        if (!bot_id) {
          return NextResponse.json({ error: 'bot_id is required' }, { status: 400 });
        }

        // Verify it's a bot
        const { data: bot } = await supabase
          .from('users')
          .select('id, username, is_bot')
          .eq('id', bot_id)
          .eq('is_bot', true)
          .single();

        if (!bot) {
          return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
        }

        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', bot_id);

        if (error) {
          console.error('Delete bot error:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, deleted_username: bot.username });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bot action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
