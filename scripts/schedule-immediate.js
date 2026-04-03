/**
 * Schedule Immediate Test Posts
 * Creates posts scheduled for RIGHT NOW to test publishing
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

console.log('⚡ Creating immediate test posts...\n');

(async () => {
  try {
    // Get 3 bots for testing
    const { data: bots, error: botsError } = await supabase
      .from('users')
      .select('id, username, display_name, bot_personality')
      .eq('is_bot', true)
      .limit(3);

    if (botsError) throw botsError;

    console.log(`Creating test posts for ${bots.length} bots...\n`);

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute ago

    for (const bot of bots) {
      const personality = bot.bot_personality;
      
      if (!personality || !personality.post_templates) continue;

      // Get first template category
      const templateKey = Object.keys(personality.post_templates)[0];
      const templates = personality.post_templates[templateKey];
      
      if (!templates || templates.length === 0) continue;

      const randomTemplate = templates[0];

      // Create post scheduled for 1 minute ago (so it's ready to publish NOW)
      const { data: newPost, error: insertError } = await supabase
        .from('bot_posts')
        .insert({
          bot_user_id: bot.id,
          content_template: `test:${templateKey}`,
          generated_content: randomTemplate,
          post_type: 'original',
          scheduled_for: oneMinuteAgo.toISOString(),
          status: 'pending',
          metadata: { post_type: 'test' }
        })
        .select()
        .single();

      if (insertError) {
        console.log(`❌ ${bot.username}: ${insertError.message}`);
      } else {
        console.log(`✅ ${bot.display_name}: Ready to publish NOW`);
        console.log(`   Content: "${randomTemplate.substring(0, 50)}..."`);
      }
    }

    console.log('\n🎉 Test posts created!\n');
    console.log('💡 Run "node scripts/publish-now.js" to publish them immediately!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
