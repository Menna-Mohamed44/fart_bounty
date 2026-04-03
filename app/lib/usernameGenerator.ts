// Utility functions for generating random fart-themed usernames and display names

const adjectives = [
  'Tooty',
  'Stinky',
  'Breezy',
  'Windy',
  'Gassy',
  'Funky',
  'Smelly',
  'Pungent',
  'Booming',
  'Silent',
  'Deadly',
  'Rumbling',
  'Squeaky',
  'Foggy',
  'Cloudy',
  'Thunderous',
  'Whispering',
  'Mighty',
  'Atomic',
  'Toxic',
  'Fragrant',
  'Aromatic',
  'Potent',
  'Explosive',
  'Bubbly',
  'Fizzy',
  'Trumpet',
  'Roaring',
  'Subtle',
  'Mysterious'
]

const nouns = [
  'Tooter',
  'Blaster',
  'Puffer',
  'Breaker',
  'Master',
  'Wizard',
  'Ninja',
  'King',
  'Queen',
  'Champion',
  'Legend',
  'Hero',
  'Warrior',
  'Commander',
  'Captain',
  'Admiral',
  'General',
  'Sultan',
  'Baron',
  'Duke',
  'Prince',
  'Knight',
  'Samurai',
  'Maestro',
  'Virtuoso',
  'Artist',
  'Guru',
  'Sage',
  'Oracle',
  'Prophet'
]

const suffixes = [
  'The Great',
  'The Mighty',
  'The Brave',
  'The Bold',
  'The Fierce',
  'The Swift',
  'The Wise',
  'The Strong',
  'Supreme',
  'Ultimate',
  'Prime',
  'Elite',
  'Pro',
  'Max',
  'Ultra',
  'Mega',
  'Super',
  'Hyper',
  'Turbo',
  'Alpha'
]

/**
 * Generates a random fart-themed display name
 * Format: "Adjective Noun" or "Adjective Noun Suffix"
 */
export function generateDisplayName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  // 30% chance to add a suffix
  if (Math.random() < 0.3) {
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    return `${adjective} ${noun} ${suffix}`
  }
  
  return `${adjective} ${noun}`
}

/**
 * Generates a random fart-themed username
 * Format: "adjective_noun_randomnumber" (lowercase, no spaces)
 */
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const randomNum = Math.floor(Math.random() * 9999)
  
  return `${adjective}_${noun}_${randomNum}`.toLowerCase()
}

/**
 * Checks if a username is available in the database
 */
export async function isUsernameAvailable(
  username: string,
  supabaseClient: any
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  
  if (error) {
    console.error('Error checking username availability:', error)
    return false
  }
  
  return data === null
}

/**
 * Generates a unique username that doesn't exist in the database
 * Will try up to 10 times before falling back to a timestamped username
 */
export async function generateUniqueUsername(
  supabaseClient: any
): Promise<string> {
  try {
    console.log('🎯 Generating unique username...')
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const username = generateUsername()
      console.log(`🔍 Attempt ${attempts + 1}: Checking username "${username}"`)
      const isAvailable = await isUsernameAvailable(username, supabaseClient)
      
      if (isAvailable) {
        console.log(`✅ Username "${username}" is available!`)
        return username
      }
      
      console.log(`❌ Username "${username}" is taken, trying again...`)
      attempts++
    }
    
    // Fallback: use timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36)
    const fallbackUsername = `fart_fan_${timestamp}`.toLowerCase()
    console.log('⚠️ Max attempts reached, using fallback:', fallbackUsername)
    return fallbackUsername
  } catch (error) {
    console.error('❌ Error in generateUniqueUsername:', error)
    // Ultimate fallback
    const timestamp = Date.now().toString(36)
    const emergencyUsername = `fart_fan_${timestamp}`.toLowerCase()
    console.log('🆘 Emergency fallback username:', emergencyUsername)
    return emergencyUsername
  }
}
