/**
 * Create and publish 3 test posts immediately
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

console.log('⚡ Creating and publishing 3 test posts NOW...\n');

(async () => {
  try {
    // Get 3 bots
    const { data: bots } = await supabase
      .from('users')
      .select('id, username, display_name, bot_personality')
      .eq('is_bot', true)
      .limit(3);

    for (const bot of bots) {
      const personality = bot.bot_personality;
      const templateKey = Object.keys(personality.post_templates)[0];
      const templates = personality.post_templates[templateKey];
      const content = templates[Math.floor(Math.random() * templates.length)];

      // Post directly
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: bot.id,
          content: content
        })
        .select()
        .single();

      if (error) {
        console.log(`❌ ${bot.username}: ${error.message}`);
      } else {
        console.log(`✅ ${bot.display_name} posted!`);
        console.log(`   "${content.substring(0, 60)}..."`);
        console.log(`   Post ID: ${newPost.id}\n`);
      }
    }

    console.log('🎉 Test posts published!\n');
    console.log('💡 Check your feed at: http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
