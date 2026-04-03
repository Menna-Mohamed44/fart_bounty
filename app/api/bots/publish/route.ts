/**
 * Enhanced Bot Publishing API
 * Handles image generation, video sharing, and content reposting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/app/lib/supabaseServer';
import { 
  generateFartImage, 
  uploadGeneratedImage, 
  getRandomLibraryVideo 
} from '@/app/lib/aiGenerators';

export async function GET(request: NextRequest) {
  return handlePublish(request);
}

export async function POST(request: NextRequest) {
  return handlePublish(request);
}

async function handlePublish(request: NextRequest) {
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

    // Get pending posts ready to publish
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('bot_posts')
      .select('*, users!bot_posts_bot_user_id_fkey(username, display_name)')
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

    for (const botPost of pendingPosts) {
      try {
        const bot = botPost.users;
        const metadata = botPost.metadata || {};
        let finalContent = botPost.generated_content;
        let imageUrl = botPost.image_url;
        let videoId = null;

        // Handle image generation if required
        if (metadata.requires_image && metadata.image_prompt && !imageUrl) {
          console.log(`Generating image for ${bot.username}: ${metadata.image_prompt}`);
          
          const generatedImageUrl = await generateFartImage(metadata.image_prompt);
          
          if (generatedImageUrl) {
            // Upload to Supabase storage
            imageUrl = await uploadGeneratedImage(
              generatedImageUrl,
              bot.username,
              metadata.post_type || 'general'
            );
            
            if (imageUrl) {
              // Update bot_posts with image URL
              await supabase
                .from('bot_posts')
                .update({ image_url: imageUrl })
                .eq('id', botPost.id);
            }
          }
        }

        // Handle video sharing from library
        if (metadata.requires_video_share) {
          const video = await getRandomLibraryVideo();
          
          if (video) {
            videoId = video.id;
            finalContent += `\n\n🎵 ${video.name}`;
          }
        }

        // Handle content sharing (repost)
        if (botPost.post_type === 'share' && botPost.target_post_id) {
          // Create a repost/share
          const { data: sharedPost, error: shareError } = await supabase
            .from('posts')
            .insert({
              user_id: botPost.bot_user_id,
              content: finalContent
            })
            .select()
            .single();

          if (shareError) {
            await supabase
              .from('bot_posts')
              .update({ status: 'failed' })
              .eq('id', botPost.id);
            
            results.push({ bot: bot.username, success: false, error: shareError.message });
            continue;
          }

          // Update bot_posts record
          await supabase
            .from('bot_posts')
            .update({
              status: 'posted',
              post_id: sharedPost.id,
              posted_at: new Date().toISOString()
            })
            .eq('id', botPost.id);

          results.push({ 
            bot: bot.username, 
            success: true, 
            post_id: sharedPost.id,
            type: 'share'
          });
          continue;
        }

        // Create regular post
        const postData: any = {
          user_id: botPost.bot_user_id,
          content: finalContent
        };

        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (postError) {
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

        results.push({ 
          bot: bot.username, 
          success: true, 
          post_id: newPost.id,
          has_image: !!imageUrl,
          has_video: !!videoId
        });

      } catch (error) {
        console.error(`Error publishing for bot ${botPost.bot_user_id}:`, error);
        results.push({ bot: 'unknown', success: false, error: String(error) });
      }
    }

    return NextResponse.json({
      message: 'Bot publishing complete',
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });

  } catch (error) {
    console.error('Bot publishing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
