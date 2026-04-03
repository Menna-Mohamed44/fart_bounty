/**
 * Bulk Insert Audio Library Metadata
 * 
 * This script fetches all audio files from the Supabase storage bucket
 * and inserts their metadata into the audio_library table.
 * 
 * Prerequisites:
 * 1. npm install @supabase/supabase-js music-metadata
 * 2. Set your Supabase credentials below
 * 3. Ensure all audio files are already uploaded to the 'audio-library' bucket
 */

const { createClient } = require('@supabase/supabase-js')
const mm = require('music-metadata')
const https = require('https')
const http = require('http')

// ============================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================================

const SUPABASE_URL = 'https://uucftfcfjvdvutfbwcwv.supabase.co' 
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Y2Z0ZmNmanZkdnV0ZmJ3Y3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU3ODQzMSwiZXhwIjoyMDgwMTU0NDMxfQ.cU5GochjAF2zFtrDXO5d0wKVh-Q0W455HtiwM05Ha0o' // Use service role key (not anon key)
const BUCKET_NAME = 'audio-library'

// ============================================================================
// Supabase Client
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Download audio file from URL to get metadata
 */
async function downloadFileBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
    client.get(url, (response) => {
      const chunks = []
      
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', (error) => reject(error))
    })
  })
}

/**
 * Get audio file duration in seconds
 */
async function getAudioDuration(url) {
  try {
    const buffer = await downloadFileBuffer(url)
    const metadata = await mm.parseBuffer(buffer)
    return Math.floor(metadata.format.duration || 0)
  } catch (error) {
    console.error('Error getting duration:', error.message)
    return 0 // Default to 0 if we can't get duration
  }
}

/**
 * Clean filename to create a display name
 */
function cleanFileName(fileName) {
  // Remove extension
  let name = fileName.replace(/\.[^/.]+$/, '')
  
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ')
  
  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, char => char.toUpperCase())
  
  return name
}

/**
 * Categorize audio file based on filename
 */
function categorizeFile(fileName) {
  const lower = fileName.toLowerCase()
  
  if (lower.includes('comedy') || lower.includes('funny') || lower.includes('laugh')) {
    return 'comedy'
  } else if (lower.includes('effect') || lower.includes('sfx')) {
    return 'effects'
  } else {
    return 'general'
  }
}

/**
 * Extract tags from filename
 */
function extractTags(fileName) {
  const lower = fileName.toLowerCase()
  const tags = []
  
  // Common sound tags
  if (lower.includes('short')) tags.push('short')
  if (lower.includes('long')) tags.push('long')
  if (lower.includes('loud')) tags.push('loud')
  if (lower.includes('soft')) tags.push('soft')
  if (lower.includes('wet')) tags.push('wet')
  if (lower.includes('dry')) tags.push('dry')
  if (lower.includes('bass')) tags.push('bass')
  if (lower.includes('high')) tags.push('high')
  if (lower.includes('reverb')) tags.push('reverb')
  
  // Add generic tag
  tags.push('sound-effect')
  
  return tags
}

// ============================================================================
// Main Function
// ============================================================================

async function bulkInsertAudioLibrary() {
  console.log('🚀 Starting bulk insert of audio library...\n')
  
  try {
    // Step 1: List all files in the bucket (with pagination)
    console.log('📂 Fetching files from bucket:', BUCKET_NAME)
    
    let allFiles = []
    let offset = 0
    const limit = 100 // Supabase default limit
    let hasMore = true
    
    // Fetch all files with pagination
    while (hasMore) {
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: limit,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' }
        })
      
      if (listError) {
        throw new Error(`Failed to list files: ${listError.message}`)
      }
      
      if (files && files.length > 0) {
        allFiles = allFiles.concat(files)
        console.log(`   Fetched ${files.length} files (offset: ${offset}, total so far: ${allFiles.length})`)
        offset += limit
        
        // If we got fewer files than the limit, we've reached the end
        if (files.length < limit) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }
    
    const files = allFiles
    console.log(`✅ Found ${files.length} files in bucket\n`)
    
    // Step 2: Check which files already exist in database
    console.log('🔍 Checking existing records in database...')
    const { data: existingRecords, error: dbError } = await supabase
      .from('audio_library')
      .select('storage_path')
    
    if (dbError) {
      throw new Error(`Failed to query database: ${dbError.message}`)
    }
    
    const existingPaths = new Set(existingRecords.map(r => r.storage_path))
    console.log(`📊 Found ${existingPaths.size} existing records\n`)
    
    // Step 3: Process each file
    let inserted = 0
    let skipped = 0
    let failed = 0
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileName = file.name
      
      // Skip if already in database
      if (existingPaths.has(fileName)) {
        console.log(`⏭️  [${i + 1}/${files.length}] Skipping (already exists): ${fileName}`)
        skipped++
        continue
      }
      
      console.log(`\n📝 [${i + 1}/${files.length}] Processing: ${fileName}`)
      
      try {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName)
        
        // Get audio duration (this might take time)
        console.log('   ⏱️  Getting audio duration...')
        const duration = await getAudioDuration(urlData.publicUrl)
        console.log(`   ✅ Duration: ${duration}s`)
        
        // Prepare metadata
        const metadata = {
          name: cleanFileName(fileName),
          description: `Audio file from library`,
          storage_path: fileName,
          duration_seconds: duration,
          category: categorizeFile(fileName),
          tags: extractTags(fileName),
          file_size_bytes: file.metadata?.size || null,
          deleted: false
        }
        
        // Insert into database
        const { error: insertError } = await supabase
          .from('audio_library')
          .insert(metadata)
        
        if (insertError) {
          throw insertError
        }
        
        console.log(`   ✅ Inserted successfully`)
        inserted++
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`)
        failed++
      }
    }
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total files:     ${files.length}`)
    console.log(`✅ Inserted:     ${inserted}`)
    console.log(`⏭️  Skipped:      ${skipped}`)
    console.log(`❌ Failed:       ${failed}`)
    console.log('='.repeat(60))
    
    if (inserted > 0) {
      console.log('\n🎉 Bulk insert completed successfully!')
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    process.exit(1)
  }
}

// ============================================================================
// Run Script
// ============================================================================

// Check if configuration is set
if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ Error: Please update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the script')
  process.exit(1)
}

bulkInsertAudioLibrary()
