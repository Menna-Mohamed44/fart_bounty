/**
 * Quick Script to Schedule Bot Posts
 */

const path = require('path');
const fs = require('fs');

let envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const cronSecret = process.env.CRON_SECRET;

console.log('📅 Scheduling bot posts...\n');

(async () => {
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
      console.error('❌ Failed:', data);
      process.exit(1);
    }

    console.log('✅ Success!');
    console.log(`\n📊 Stats:`);
    console.log(`   Bots processed: ${data.bots_processed}`);
    console.log(`   Posts scheduled: ${data.posts_scheduled || data.scheduled?.length || 0}`);
    
    if (data.scheduled && data.scheduled.length > 0) {
      console.log(`\n📋 Scheduled posts (showing first 10):\n`);
      data.scheduled.slice(0, 10).forEach(post => {
        if (post.scheduled_for) {
          const time = new Date(post.scheduled_for).toLocaleString();
          console.log(`   🤖 ${post.bot}`);
          console.log(`      Type: ${post.type}`);
          console.log(`      Time: ${time}`);
          console.log(`      Image: ${post.has_image ? '✅' : '❌'}`);
          console.log('');
        } else if (post.type === 'content_shares') {
          console.log(`   🤖 ${post.bot}: ${post.count} content shares scheduled\n`);
        }
      });
      
      console.log(`\n💡 Next: Run "node scripts/publish-now.js" to publish posts that are due!`);
    } else {
      console.log('\n⚠️  No posts were scheduled. This might mean:');
      console.log('   - Posts are already scheduled for today');
      console.log('   - Database migration needs to be run');
      console.log('   - Bot configuration is disabled\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
