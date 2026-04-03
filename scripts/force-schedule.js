/**
 * Force Schedule Posts - Debug Script
 * Creates posts immediately without duplicate checks
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

console.log('🚀 Force scheduling bot posts (debug mode)...\n');

(async () => {
  try {
    // Get all bots
    const { data: bots, error: botsError } = await supabase
      .from('users')
      .select('id, username, display_name, bot_personality')
      .eq('is_bot', true);

    if (botsError) throw botsError;

    console.log(`✅ Found ${bots.length} bots\n`);

    let totalScheduled = 0;

    for (const bot of bots) {
      console.log(`📋 Processing ${bot.display_name} (@${bot.username})...`);
      
      const personality = bot.bot_personality;
      
      if (!personality || !personality.posting_schedule) {
        console.log(`   ⚠️  No posting schedule found!\n`);
        continue;
      }

      console.log(`   Posts per day: ${personality.posting_schedule.length}`);

      // Schedule each post
      for (const schedule of personality.posting_schedule) {
        // Get templates
        const templates = personality.post_templates?.[schedule.template];
        
        if (!templates || templates.length === 0) {
          console.log(`   ⚠️  No templates for ${schedule.template}`);
          continue;
        }

        // Random template
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

        // Parse time
        const [hour, minute] = schedule.time.split(':').map(Number);
        
        // Schedule for today or tomorrow
        const scheduledTime = new Date();
        scheduledTime.setHours(hour, minute, 0, 0);
        
        // If time has passed, schedule for tomorrow
        if (scheduledTime <= new Date()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        // Add variance
        if (schedule.variance_minutes > 0) {
          const variance = Math.floor(Math.random() * (schedule.variance_minutes * 2 + 1)) - schedule.variance_minutes;
          scheduledTime.setMinutes(scheduledTime.getMinutes() + variance);
        }

        // Create metadata
        const metadata = {
          requires_image: schedule.requires_image || false,
          image_prompt: schedule.image_prompt || null,
          requires_video_share: schedule.requires_video_share || false,
          post_type: schedule.type
        };

        // Insert post
        const { data: newPost, error: insertError } = await supabase
          .from('bot_posts')
          .insert({
            bot_user_id: bot.id,
            content_template: `${schedule.type}:${schedule.template}`,
            generated_content: randomTemplate,
            post_type: 'original',
            scheduled_for: scheduledTime.toISOString(),
            status: 'pending',
            metadata
          })
          .select()
          .single();

        if (insertError) {
          console.log(`   ❌ Error: ${insertError.message}`);
        } else {
          console.log(`   ✅ Scheduled: ${schedule.type} at ${scheduledTime.toLocaleString()}`);
          totalScheduled++;
        }
      }

      console.log('');
    }

    console.log(`\n🎉 Total posts scheduled: ${totalScheduled}\n`);
    
    if (totalScheduled > 0) {
      console.log('💡 Next step: Run "node scripts/publish-now.js" to publish posts that are due!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
