/**
 * Bot Posting API Endpoint
 * Automatically generates and posts content for bot accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabaseServer';

interface BotPersonality {
  age: number;
  traits: string[];
  interests: string[];
  post_templates: string[];
  reply_templates: string[];
  tone: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient() as any;

    // Verify admin access (or allow cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader && (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bot configuration
    const { data: botConfig } = await supabase
      .from('bot_config')
      .select('config_value')
      .eq('config_key', 'bot_enabled')
      .single();

    if (!botConfig?.config_value?.enabled) {
      return NextResponse.json({ message: 'Bots are disabled' }, { status: 200 });
    }

    // Get all pending bot posts that are ready to be published
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('bot_posts')
      .select('*, users!bot_posts_bot_user_id_fkey(username, display_name, bot_personality)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending posts:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingPosts || pendingPosts.length === 0) {
      return NextResponse.json({ message: 'No pending posts to publish' }, { status: 200 });
    }

    const results = [];

    // Process each pending post
    for (const botPost of pendingPosts) {
      try {
        const bot = botPost.users;
        
        // Create the actual post in the posts table
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: botPost.bot_user_id,
            content: botPost.generated_content
          })
          .select()
          .single();

        if (postError) {
          // Mark as failed
          await supabase
            .from('bot_posts')
            .update({ status: 'failed' })
            .eq('id', botPost.id);
          
          results.push({ bot: bot.username, success: false, error: postError.message });
          continue;
        }

        // Update bot_posts record with success
        await supabase
          .from('bot_posts')
          .update({
            status: 'posted',
            post_id: newPost.id,
            posted_at: new Date().toISOString()
          })
          .eq('id', botPost.id);

        results.push({ bot: bot.username, success: true, post_id: newPost.id });

      } catch (error) {
        console.error(`Error posting for bot ${botPost.bot_user_id}:`, error);
        results.push({ bot: 'unknown', success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      message: 'Bot posting complete',
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Bot posting error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Schedule new posts for bots
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient() as any;

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!authHeader && (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bot configuration
    const { data: configData } = await supabase
      .from('bot_config')
      .select('config_value')
      .eq('config_key', 'posting_schedule')
      .single();

    const config = configData?.config_value || {
      min_interval_minutes: 30,
      max_interval_minutes: 180,
      active_hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
    };

    // Get all bots
    const { data: bots, error: botsError } = await supabase
      .from('users')
      .select('id, username, bot_personality')
      .eq('is_bot', true);

    if (botsError || !bots) {
      return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
    }

    const scheduled = [];

    for (const bot of bots) {
      // Check if bot already has pending posts
      const { data: existingPending } = await supabase
        .from('bot_posts')
        .select('id')
        .eq('bot_user_id', bot.id)
        .eq('status', 'pending')
        .gte('scheduled_for', new Date().toISOString());

      if (existingPending && existingPending.length > 0) {
        continue; // Skip, already has pending posts
      }

      // Generate random interval
      const minMinutes = config.min_interval_minutes;
      const maxMinutes = config.max_interval_minutes;
      const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes)) + minMinutes;
      
      const scheduledTime = new Date(Date.now() + randomMinutes * 60000);

      // Select random template
      const personality = bot.bot_personality as BotPersonality;
      const templates = personality?.post_templates || [];
      
      if (templates.length === 0) continue;

      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

      // Create scheduled post
      const { data: newScheduledPost, error: scheduleError } = await supabase
        .from('bot_posts')
        .insert({
          bot_user_id: bot.id,
          content_template: 'auto',
          generated_content: randomTemplate,
          post_type: 'original',
          scheduled_for: scheduledTime.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (!scheduleError && newScheduledPost) {
        scheduled.push({
          bot: bot.username,
          scheduled_for: scheduledTime,
          content_preview: randomTemplate.substring(0, 50) + '...'
        });
      }
    }

    return NextResponse.json({
      message: 'Posts scheduled successfully',
      count: scheduled.length,
      scheduled
    });

  } catch (error) {
    console.error('Scheduling error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
