/**
 * Debug Publisher - Shows full API response
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

console.log('🔍 Debug: Calling publish API...\n');

(async () => {
  try {
    const response = await fetch(`${baseUrl}/api/bots/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    console.log('\nFull API Response:');
    console.log(JSON.stringify(data, null, 2));

    // Also check pending posts in database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = new Date().toISOString();
    
    const { data: pending, error } = await supabase
      .from('bot_posts')
      .select('id, bot_user_id, scheduled_for, status, generated_content')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(5);

    console.log('\n\nPending posts ready to publish:');
    console.log(JSON.stringify(pending, null, 2));

    if (error) {
      console.log('Error checking pending:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
})();
