/**
 * Test Script for Bot Scheduler
 * Tests scheduling and publishing endpoints
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
let envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const cronSecret = process.env.CRON_SECRET;

console.log('🧪 Bot Scheduler Test Script\n');
console.log(`📍 Testing against: ${baseUrl}`);
console.log(`🔑 CRON_SECRET configured: ${cronSecret ? 'YES ✅' : 'NO ❌'}\n`);

if (!cronSecret) {
  console.error('❌ ERROR: CRON_SECRET not found in .env file!');
  console.log('\nAdd this to your .env file:');
  console.log('CRON_SECRET=test-secret-123\n');
  process.exit(1);
}

async function testScheduler() {
  console.log('📅 Testing Bot Scheduler Endpoint...\n');
  
  try {
    const response = await fetch(`${baseUrl}/api/bots/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Scheduler failed with status ${response.status}`);
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    console.log('✅ Scheduler Success!');
    console.log(`   Bots processed: ${data.bots_processed}`);
    console.log(`   Posts scheduled: ${data.posts_scheduled || 0}`);
    
    if (data.scheduled && data.scheduled.length > 0) {
      console.log('\n📋 Sample scheduled posts:');
      data.scheduled.slice(0, 5).forEach(post => {
        console.log(`   - ${post.bot}: ${post.type} ${post.scheduled_for ? `at ${new Date(post.scheduled_for).toLocaleString()}` : ''}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing scheduler:', error.message);
    return false;
  }
}

async function testPublisher() {
  console.log('\n\n📤 Testing Bot Publisher Endpoint...\n');
  
  try {
    const response = await fetch(`${baseUrl}/api/bots/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Publisher failed with status ${response.status}`);
      console.error('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    console.log('✅ Publisher Success!');
    console.log(`   Posts processed: ${data.processed}`);
    console.log(`   Successfully published: ${data.successful || 0}`);
    console.log(`   Failed: ${data.failed || 0}`);
    
    if (data.results && data.results.length > 0) {
      console.log('\n📋 Results:');
      data.results.slice(0, 5).forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.bot}: ${result.type || 'post'}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing publisher:', error.message);
    return false;
  }
}

async function checkBotStatus() {
  console.log('\n\n🤖 Checking Bot Status...\n');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check bots
    const { data: bots, error: botsError } = await supabase
      .from('users')
      .select('username, display_name')
      .eq('is_bot', true);

    if (botsError) throw botsError;

    console.log(`✅ Found ${bots.length} bots:`);
    bots.forEach(bot => {
      console.log(`   - ${bot.display_name} (@${bot.username})`);
    });

    // Check pending posts
    const { data: pending, error: pendingError } = await supabase
      .from('bot_posts')
      .select('id')
      .eq('status', 'pending');

    if (!pendingError) {
      console.log(`\n📅 Pending posts: ${pending.length}`);
    }

    // Check posted today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: posted, error: postedError } = await supabase
      .from('bot_posts')
      .select('id')
      .eq('status', 'posted')
      .gte('posted_at', today.toISOString());

    if (!postedError) {
      console.log(`📤 Posted today: ${posted.length}`);
    }

  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Run all tests
(async () => {
  try {
    await checkBotStatus();
    
    const schedulerOk = await testScheduler();
    const publisherOk = await testPublisher();

    console.log('\n\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`   Scheduler: ${schedulerOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Publisher: ${publisherOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log('='.repeat(50) + '\n');

    if (schedulerOk && publisherOk) {
      console.log('🎉 All tests passed! Your bot system is ready!\n');
      console.log('💡 Next steps:');
      console.log('   1. Set up cron jobs to run these endpoints automatically');
      console.log('   2. Add API keys for image generation (GROQ_API_KEY, FAL_API_KEY)');
      console.log('   3. Monitor bot activity in admin panel at /admin/bots\n');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.\n');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
