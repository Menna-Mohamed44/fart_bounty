/**
 * Check posts table schema
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

console.log('🔍 Checking posts table schema...\n');

(async () => {
  try {
    // Get a sample post to see the schema
    const { data: samplePost, error } = await supabase
      .from('posts')
      .select('*')
      .limit(1)
      .single();

    if (error && !error.message.includes('0 rows')) {
      throw error;
    }

    if (samplePost) {
      console.log('Posts table columns:');
      console.log(Object.keys(samplePost).join(', '));
      console.log('\nSample post:');
      console.log(JSON.stringify(samplePost, null, 2));
    } else {
      console.log('No posts exist yet. Creating a test insert to see required fields...\n');
      
      // Try inserting with minimal fields
      const { data: testPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Fake ID for testing
          content: 'Test post'
        })
        .select()
        .single();
      
      if (insertError) {
        console.log('Insert error (expected):');
        console.log(insertError.message);
        
        if (insertError.message.includes('violates foreign key')) {
          console.log('\n✅ Posts table accepts: user_id, content');
          console.log('   No visibility column needed!');
        }
      } else {
        console.log('Test post created:', testPost);
        
        // Delete it
        await supabase.from('posts').delete().eq('id', testPost.id);
        console.log('Test post deleted');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
