/**
 * Direct Database Publisher
 * Publishes pending posts directly without API
 */

const path = require('path');
const fs = require('fs');

let envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📤 Direct publishing pending bot posts...\n');

(async () => {
  try {
    // Get pending posts that are due
    const now = new Date().toISOString();
    
    const { data: pendingPosts, error: fetchError } = await supabase
      .from('bot_posts')
      .select('*, users!bot_posts_bot_user_id_fkey(username, display_name)')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!pendingPosts || pendingPosts.length === 0) {
      console.log('⚠️  No pending posts ready to publish\n');
      
      // Show next upcoming
      const { data: upcoming } = await supabase
        .from('bot_posts')
        .select('scheduled_for, users!bot_posts_bot_user_id_fkey(username)')
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(5);
      
      if (upcoming && upcoming.length > 0) {
        console.log('Next upcoming posts:');
        upcoming.forEach(p => {
          console.log(`  - ${p.users?.username}: ${new Date(p.scheduled_for).toLocaleString()}`);
        });
      }
      
      return;
    }

    console.log(`Found ${pendingPosts.length} posts ready to publish!\n`);

    let published = 0;
    let failed = 0;

    for (const botPost of pendingPosts) {
      try {
        const bot = botPost.users;
        console.log(`Publishing for ${bot.display_name}...`);

        // Create the post
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: botPost.bot_user_id,
            content: botPost.generated_content
          })
          .select()
          .single();

        if (postError) {
          console.log(`  ❌ Failed: ${postError.message}`);
          
          // Mark as failed
          await supabase
            .from('bot_posts')
            .update({ status: 'failed' })
            .eq('id', botPost.id);
          
          failed++;
          continue;
        }

        // Update bot_posts record
        await supabase
          .from('bot_posts')
          .update({
            status: 'posted',
            post_id: newPost.id,
            posted_at: new Date().toISOString()
          })
          .eq('id', botPost.id);

        console.log(`  ✅ Published! Post ID: ${newPost.id}`);
        console.log(`     Content: "${botPost.generated_content.substring(0, 60)}..."\n`);
        
        published++;

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Published: ${published}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    if (published > 0) {
      console.log(`\n🎉 Success! Check your feed to see the bot posts!`);
      console.log(`💡 View at: http://localhost:3000\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
