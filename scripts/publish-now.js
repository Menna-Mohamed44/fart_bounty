/**
 * Quick Script to Publish Pending Bot Posts
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

console.log('📤 Publishing pending bot posts...\n');

(async () => {
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
      console.error('❌ Failed:', data);
      process.exit(1);
    }

    console.log('✅ Success!');
    console.log(`\n📊 Stats:`);
    console.log(`   Posts processed: ${data.processed}`);
    console.log(`   Successfully published: ${data.successful || 0}`);
    console.log(`   Failed: ${data.failed || 0}`);
    
    if (data.results && data.results.length > 0) {
      console.log(`\n📋 Published posts:\n`);
      data.results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.bot} - ${result.type || 'post'}`);
        if (result.has_image) console.log(`      🎨 With AI image`);
        if (result.has_video) console.log(`      🎵 With library video`);
        if (result.post_id) console.log(`      ID: ${result.post_id}`);
        if (!result.success && result.error) console.log(`      Error: ${result.error}`);
        console.log('');
      });
      
      console.log(`\n🎉 Check your feed to see the bot posts!`);
      console.log(`💡 View admin panel at: http://localhost:3000/admin/bots\n`);
    } else {
      console.log('\n⚠️  No posts were published. This might mean:');
      console.log('   - No posts are scheduled yet (run schedule-now.js first)');
      console.log('   - All scheduled posts are in the future');
      console.log('   - Bots are disabled in config\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
