/**
 * Advanced Bot Scheduler API
 * Handles time-specific scheduling with variance and content sharing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabaseServer';
import { generateTextWithGroq } from '@/app/lib/aiGenerators';

interface PostSchedule {
  time: string; // "HH:MM" format
  timezone: string;
  variance_minutes: number;
  type: string;
  template: string;
  requires_image?: boolean;
  image_prompt?: string;
  requires_video_share?: boolean;
  description: string;
}

interface BotPersonality {
  posting_schedule: PostSchedule[];
  post_templates: { [key: string]: string[] };
  shares_content: boolean;
  shares_per_day: number;
}

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

function addVariance(baseTime: Date, varianceMinutes: number): Date {
  if (varianceMinutes === 0) return baseTime;
  
  // Random variance: -variance to +variance
  const randomVariance = Math.floor(Math.random() * (varianceMinutes * 2 + 1)) - varianceMinutes;
  const result = new Date(baseTime);
  result.setMinutes(result.getMinutes() + randomVariance);
  return result;
}

function getNextScheduledTime(schedule: PostSchedule, currentDate: Date): Date {
  const { hour, minute } = parseTime(schedule.time);
  
  // Create base time for today
  const scheduledTime = new Date(currentDate);
  scheduledTime.setHours(hour, minute, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (scheduledTime <= currentDate) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  // Add random variance
  return addVariance(scheduledTime, schedule.variance_minutes);
}

async function scheduleContentShares(
  supabase: any,
  botUserId: string,
  sharesPerDay: number
): Promise<void> {
  // Get popular posts from the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { data: popularPosts } = await supabase
    .from('posts')
    .select('id, user_id, content')
    .gte('created_at', oneDayAgo.toISOString())
    .neq('user_id', botUserId)
    .order('like_count', { ascending: false })
    .limit(50);
  
  if (!popularPosts || popularPosts.length === 0) return;
  
  // Schedule random shares throughout the day
  for (let i = 0; i < sharesPerDay; i++) {
    const randomPost = popularPosts[Math.floor(Math.random() * popularPosts.length)];
    
    // Random time during waking hours (8am - 11pm)
    const randomHour = 8 + Math.floor(Math.random() * 15);
    const randomMinute = Math.floor(Math.random() * 60);
    
    const scheduledTime = new Date();
    scheduledTime.setHours(randomHour, randomMinute, 0, 0);
    
    if (scheduledTime <= new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    await supabase
      .from('bot_posts')
      .insert({
        bot_user_id: botUserId,
        content_template: 'share',
        generated_content: `Check this out! 💨`,
        post_type: 'share',
        target_post_id: randomPost.id,
        scheduled_for: scheduledTime.toISOString(),
        status: 'pending'
      });
  }
}

export async function GET(request: NextRequest) {
  return handleSchedule(request);
}

export async function POST(request: NextRequest) {
  return handleSchedule(request);
}

async function handleSchedule(request: NextRequest) {
  try {
    const supabase = createServiceClient() as any;

    // Verify authorization (supports Vercel cron Bearer token and x-cron-secret header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    const isCronHeader = request.headers.get('x-cron-secret') === cronSecret;
    
    if (!isVercelCron && !isCronHeader && !authHeader) {
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

    // Get all bots with their personalities
    const { data: bots } = await supabase
      .from('users')
      .select('id, username, display_name, bot_personality')
      .eq('is_bot', true);

    if (!bots || bots.length === 0) {
      return NextResponse.json({ error: 'No bots found' }, { status: 404 });
    }

    const scheduled: any[] = [];
    const currentTime = new Date();

    for (const bot of bots) {
      const personality = bot.bot_personality as BotPersonality;
      
      if (!personality?.posting_schedule) continue;

      // Schedule regular posts based on time schedule
      for (const schedule of personality.posting_schedule) {
        // Check if this post is already scheduled for today
        const { data: existingPost } = await supabase
          .from('bot_posts')
          .select('id')
          .eq('bot_user_id', bot.id)
          .eq('status', 'pending')
          .gte('scheduled_for', currentTime.toISOString())
          .like('content_template', `${schedule.type}%`)
          .single();

        if (existingPost) continue; // Already scheduled

        // Get next scheduled time with variance
        const scheduledTime = getNextScheduledTime(schedule, currentTime);

        // Select random template
        const templates = personality.post_templates[schedule.template] || [];
        if (templates.length === 0) continue;

        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

        // Use Groq to generate unique content from the template
        let generatedContent = randomTemplate;
        try {
          const personality = bot.bot_personality as BotPersonality;
          const tone = (personality as any).tone || 'fun and casual';
          const groqPrompt = `You are a social media bot with this personality: ${tone}.
Rewrite this post template into a unique, fresh post. Keep it short (under 280 chars), fun, and on-brand. Don't use quotation marks around the output.

Template: "${randomTemplate}"

Write just the post text, nothing else.`;
          
          const aiContent = await generateTextWithGroq(groqPrompt);
          if (aiContent) {
            generatedContent = aiContent.replace(/^"|"$/g, '').trim();
          }
        } catch (groqError) {
          console.warn(`Groq generation failed for ${bot.username}, using template:`, groqError);
        }

        // Create metadata for AI generation if needed
        const metadata: any = {
          requires_image: schedule.requires_image || false,
          image_prompt: schedule.image_prompt || null,
          requires_video_share: schedule.requires_video_share || false,
          post_type: schedule.type
        };

        const { data: newPost, error } = await supabase
          .from('bot_posts')
          .insert({
            bot_user_id: bot.id,
            content_template: `${schedule.type}:${schedule.template}`,
            generated_content: generatedContent,
            post_type: 'original',
            scheduled_for: scheduledTime.toISOString(),
            status: 'pending',
            metadata
          })
          .select()
          .single();

        if (!error && newPost) {
          scheduled.push({
            bot: bot.username,
            type: schedule.type,
            scheduled_for: scheduledTime.toISOString(),
            has_image: schedule.requires_image || false,
            has_video: schedule.requires_video_share || false
          });
        }
      }

      // Schedule content shares
      if (personality.shares_content && personality.shares_per_day > 0) {
        await scheduleContentShares(supabase, bot.id, personality.shares_per_day);
        
        scheduled.push({
          bot: bot.username,
          type: 'content_shares',
          count: personality.shares_per_day
        });
      }
    }

    return NextResponse.json({
      message: 'Advanced scheduling complete',
      bots_processed: bots.length,
      posts_scheduled: scheduled.length,
      scheduled
    });

  } catch (error) {
    console.error('Advanced scheduling error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
