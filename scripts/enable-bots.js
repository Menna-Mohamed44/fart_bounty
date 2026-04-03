/**
 * Enable Bots in Config
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

console.log('🔧 Enabling bots in configuration...\n');

(async () => {
  try {
    // Update bot_enabled config
    const { data, error } = await supabase
      .from('bot_config')
      .update({ 
        config_value: { enabled: true },
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'bot_enabled')
      .select();

    if (error) throw error;

    console.log('✅ Bots enabled!');
    console.log('\nUpdated config:', JSON.stringify(data, null, 2));

    // Verify
    const { data: check } = await supabase
      .from('bot_config')
      .select('*')
      .eq('config_key', 'bot_enabled')
      .single();

    console.log('\nVerification:', JSON.stringify(check, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
