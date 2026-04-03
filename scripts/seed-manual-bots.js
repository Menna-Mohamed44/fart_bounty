/**
 * Seed 2 Manual Bots
 * Run: cd scripts && node seed-manual-bots.js
 * 
 * These bots are manually controlled through the admin dashboard.
 * You can post as them, edit their profiles, and manage them from /admin/bots.
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const manualBots = [
  {
    username: 'fart_master_official',
    display_name: 'Fart Master',
    bio: 'Official Fart Bounty mascot. Spreading joy one toot at a time. 💨👑',
    avatar_url: null,
    is_bot: true,
    is_private: false,
    is_premium: false,
    is_admin: false,
    bot_personality: {
      type: 'manual',
      controlled_by: 'admin',
      traits: ['manual-control', 'mascot', 'funny'],
      posting_schedule: [],
      post_templates: {},
      shares_content: false,
      shares_per_day: 0,
      tone: 'humorous, playful, community-focused'
    }
  },
  {
    username: 'bounty_news_bot',
    display_name: 'Bounty News',
    bio: 'Your source for Fart Bounty updates, announcements & community highlights. 📢💨',
    avatar_url: null,
    is_bot: true,
    is_private: false,
    is_premium: false,
    is_admin: false,
    bot_personality: {
      type: 'manual',
      controlled_by: 'admin',
      traits: ['manual-control', 'news', 'announcements'],
      posting_schedule: [],
      post_templates: {},
      shares_content: false,
      shares_per_day: 0,
      tone: 'informative, friendly, professional'
    }
  }
];

async function seedManualBots() {
  console.log('🤖 Seeding 2 manual bots...\n');

  for (const bot of manualBots) {
    // Check if bot already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', bot.username)
      .single();

    if (existing) {
      console.log(`✅ @${bot.username} already exists (id: ${existing.id})`);
      
      // Update to ensure it's marked as manual bot
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_bot: true,
          bot_personality: bot.bot_personality,
          display_name: bot.display_name,
          bio: bot.bio
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`  📝 Updated profile for @${bot.username}`);
      }
      continue;
    }

    // Create new bot
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        ...bot
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create @${bot.username}: ${error.message}`);
    } else {
      console.log(`✅ Created @${bot.username} (id: ${data.id})`);
      console.log(`   Display: ${bot.display_name}`);
      console.log(`   Bio: ${bot.bio}`);
    }
  }

  console.log('\n🎉 Done! Go to /admin/bots to manage your manual bots.');
  console.log('   You can post as them using the "Post as Bot" button.');
}

seedManualBots().catch(console.error);
