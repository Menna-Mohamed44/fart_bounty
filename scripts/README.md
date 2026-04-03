# Audio Library Bulk Insert Script

This script automatically inserts metadata for all audio files in your Supabase storage bucket into the `audio_library` database table.

## Quick Start

### Step 1: Install Dependencies

Open terminal in the `scripts` folder and run:

```bash
npm install
```

This will install:
- `@supabase/supabase-js` - Supabase client
- `music-metadata` - For extracting audio duration

### Step 2: Configure Script

Open `bulk-insert-audio-library.js` and update these values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL' // e.g., https://xxxxx.supabase.co
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'
```

**Where to find these:**
1. **SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
2. **SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → Service Role Key (secret)

⚠️ **Important**: Use the **service_role** key, NOT the anon key. The service role key bypasses RLS policies.

### Step 3: Run Script

```bash
npm run insert-audio
```

Or directly:

```bash
node bulk-insert-audio-library.js
```

## What the Script Does

1. ✅ Lists all files in the `audio-library` storage bucket
2. ✅ Checks which files already have database records (prevents duplicates)
3. ✅ For each new file:
   - Downloads the file temporarily to extract audio duration
   - Creates a clean display name from the filename
   - Auto-categorizes based on filename keywords
   - Extracts relevant tags
   - Inserts metadata into `audio_library` table
4. ✅ Provides detailed progress and summary

## Auto-Categorization

The script automatically categorizes files based on filename:
- **comedy**: Files containing "comedy", "funny", "laugh"
- **effects**: Files containing "effect", "sfx"
- **general**: All other files

## Auto-Tagging

Extracts tags from filename:
- short, long, loud, soft, wet, dry
- bass, high, reverb
- And more...

## Example Output

```
🚀 Starting bulk insert of audio library...

📂 Fetching files from bucket: audio-library
✅ Found 281 files in bucket

🔍 Checking existing records in database...
📊 Found 0 existing records

📝 [1/281] Processing: funny-fart-01.mp3
   ⏱️  Getting audio duration...
   ✅ Duration: 3s
   ✅ Inserted successfully

📝 [2/281] Processing: long-bass-02.wav
   ⏱️  Getting audio duration...
   ✅ Duration: 5s
   ✅ Inserted successfully

...

============================================================
📊 SUMMARY
============================================================
Total files:     281
✅ Inserted:     281
⏭️  Skipped:      0
❌ Failed:       0
============================================================

🎉 Bulk insert completed successfully!
```

## Resume Support

If the script fails or stops partway through, just run it again. It will:
- Skip files that are already in the database
- Only process new files
- Show how many were skipped vs inserted

## Troubleshooting

### "Error: Please update SUPABASE_URL..."
You haven't configured the script yet. Update the configuration values at the top of `bulk-insert-audio-library.js`.

### "Failed to list files"
- Check that the bucket name is correct (`audio-library`)
- Verify your service role key is correct
- Make sure the bucket exists in Supabase Storage

### "Failed to query database"
- Ensure you've run the database migration (`create_audio_library.sql`)
- Verify the `audio_library` table exists
- Check that your service role key has database access

### Duration shows as 0 seconds
- The audio file might be corrupted
- The file format might not be supported
- Network issue downloading the file

### Script is slow
This is normal! The script needs to:
1. Download each audio file
2. Parse the audio to get duration
3. Insert into database

For 281 files, expect 10-30 minutes depending on your internet speed.

## Advanced: Customize Categorization

Edit the `categorizeFile()` function in the script to change how files are categorized:

```javascript
function categorizeFile(fileName) {
  const lower = fileName.toLowerCase()
  
  if (lower.includes('your-keyword')) {
    return 'your-category'
  }
  // ... more conditions
  
  return 'general'
}
```

## Need Help?

1. Check the console output for specific error messages
2. Verify your Supabase credentials
3. Ensure the database migration was run successfully
4. Make sure all 281 files are actually in the bucket
