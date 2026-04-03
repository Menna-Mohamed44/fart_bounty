// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Content Moderation — normalisation, fuzzy matching & toxicity scoring
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Word lists by category ────────────────────────────────────────────────

const HATE_SPEECH: string[] = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'kike', 'chink',
  'spic', 'wetback', 'gook', 'towelhead', 'raghead', 'tranny',
]

const THREATS: string[] = [
  'kill yourself', 'kys', 'go die', 'i will kill you', 'death threat',
  'shoot up', 'bomb threat', 'hang yourself',
]

const SEXUAL: string[] = [
  'porn', 'hentai', 'cum', 'jizz', 'blowjob', 'handjob', 'dildo',
  'orgasm', 'masturbat', 'anal', 'threesome', 'gangbang', 'deepthroat',
  'creampie', 'bondage', 'fetish', 'erotic',
]

const PROFANITY: string[] = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'cunt', 'dick', 'cock',
  'pussy', 'bastard', 'slut', 'whore', 'piss', 'asshole', 'motherfucker',
  'stfu', 'gtfo', 'lmfao',
]

const TOXIC_PHRASES: string[] = [
  'kys', 'nobody likes you', 'you are worthless', 'go away and die',
  'kill yourself', 'i hope you die', 'you deserve to die', 'end yourself',
  'drink bleach', 'jump off a bridge', 'neck yourself',
]

// Severity tiers (higher = more severe)
type Category = 'hate_speech' | 'threat' | 'sexual' | 'profanity' | 'toxic_phrase'

const WORD_MAP: { word: string; category: Category; severity: number }[] = [
  ...HATE_SPEECH.map(w => ({ word: w, category: 'hate_speech' as Category, severity: 10 })),
  ...THREATS.map(w => ({ word: w, category: 'threat' as Category, severity: 10 })),
  ...SEXUAL.map(w => ({ word: w, category: 'sexual' as Category, severity: 7 })),
  ...TOXIC_PHRASES.map(w => ({ word: w, category: 'toxic_phrase' as Category, severity: 9 })),
  ...PROFANITY.map(w => ({ word: w, category: 'profanity' as Category, severity: 4 })),
]

// ── 2. Text normalisation ────────────────────────────────────────────────────

/** Leet-speak / homoglyph mapping */
const CHAR_MAP: Record<string, string> = {
  '@': 'a', '4': 'a', '^': 'a',
  '8': 'b',
  '(': 'c', '<': 'c',
  '3': 'e',
  '6': 'g', '9': 'g',
  '#': 'h',
  '1': 'i', '!': 'i', '|': 'i',
  '0': 'o',
  '5': 's', '$': 's',
  '7': 't', '+': 't',
  'ü': 'u', 'µ': 'u',
  '2': 'z',
  // Unicode homoglyphs
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x',
  'ʏ': 'y', 'ı': 'i',
}

/** Strip zero-width / invisible unicode chars */
function stripInvisible(text: string): string {
  return text.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '')
}

/** Collapse repeated characters: "fuuuuck" → "fuck" */
function collapseRepeats(text: string): string {
  return text.replace(/(.)\1{2,}/g, '$1$1')
}

/** Apply character substitution map */
function deSubstitute(text: string): string {
  let out = ''
  for (const ch of text) {
    out += CHAR_MAP[ch] ?? ch
  }
  return out
}

/** Strip non-alphanumeric separator tricks: "f.u.c.k" → "fuck" */
function stripSeparators(text: string): string {
  // Only strip separators between single alpha chars (catches f.u.c.k but not "Dr. Smith")
  return text.replace(/\b([a-z])[\s.\-_*]{1,2}(?=[a-z]\b)/gi, '$1')
}

/** Full normalisation pipeline */
export function normaliseText(raw: string): string {
  let t = raw.toLowerCase()
  t = stripInvisible(t)
  t = deSubstitute(t)
  t = collapseRepeats(t)
  t = stripSeparators(t)
  return t
}

// ── 3. Fuzzy matching (Levenshtein) ──────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/** Check if a token is a fuzzy match for a target word */
function isFuzzyMatch(token: string, target: string, maxDist: number): boolean {
  if (token.length < 3 || target.length < 3) return token === target
  return levenshtein(token, target) <= maxDist
}

// ── 4. Detection engine ──────────────────────────────────────────────────────

interface Detection {
  matched: string
  original: string
  category: Category
  severity: number
  method: 'exact' | 'prefix' | 'fuzzy' | 'phrase'
}

function detectInText(rawText: string): Detection[] {
  const normalised = normaliseText(rawText)
  const detections: Detection[] = []
  const seen = new Set<string>()

  // 4a. Multi-word phrase matching (exact on normalised text)
  for (const entry of WORD_MAP) {
    if (!entry.word.includes(' ')) continue
    if (normalised.includes(entry.word)) {
      const key = `${entry.word}:${entry.category}`
      if (!seen.has(key)) {
        seen.add(key)
        detections.push({
          matched: entry.word,
          original: entry.word,
          category: entry.category,
          severity: entry.severity,
          method: 'phrase',
        })
      }
    }
  }

  // 4b. Token-level matching
  const tokens = normalised.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

  for (const token of tokens) {
    for (const entry of WORD_MAP) {
      if (entry.word.includes(' ')) continue // already handled above
      const key = `${entry.word}:${entry.category}`
      if (seen.has(key)) continue

      // Exact match
      if (token === entry.word) {
        seen.add(key)
        detections.push({ matched: entry.word, original: token, category: entry.category, severity: entry.severity, method: 'exact' })
        continue
      }

      // Prefix / stem match (e.g. "fucking" starts with "fuck")
      if (token.length > entry.word.length && token.startsWith(entry.word)) {
        seen.add(key)
        detections.push({ matched: entry.word, original: token, category: entry.category, severity: entry.severity, method: 'prefix' })
        continue
      }

      // Fuzzy match (allow 1 edit for words 4-6 chars, 2 edits for 7+ chars)
      const maxDist = entry.word.length >= 7 ? 2 : entry.word.length >= 4 ? 1 : 0
      if (maxDist > 0 && Math.abs(token.length - entry.word.length) <= maxDist) {
        if (isFuzzyMatch(token, entry.word, maxDist)) {
          seen.add(key)
          detections.push({ matched: entry.word, original: token, category: entry.category, severity: entry.severity, method: 'fuzzy' })
        }
      }
    }
  }

  return detections
}

// ── 5. Toxicity scoring ──────────────────────────────────────────────────────

export interface ToxicityScore {
  overall: number      // 0-100
  hate: number         // 0-100
  threat: number       // 0-100
  sexual: number       // 0-100
  profanity: number    // 0-100
  toxic: number        // 0-100
}

function computeToxicityScores(detections: Detection[], textLength: number): ToxicityScore {
  const buckets: Record<Category, number> = {
    hate_speech: 0,
    threat: 0,
    sexual: 0,
    profanity: 0,
    toxic_phrase: 0,
  }

  for (const d of detections) {
    // Exact and phrase matches score full severity, fuzzy slightly less
    const weight = d.method === 'fuzzy' ? 0.7 : 1.0
    buckets[d.category] += d.severity * weight
  }

  // Density bonus: short text with many detections is worse
  const density = textLength > 0 ? Math.min(2, (detections.length * 20) / textLength + 1) : 1

  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)))

  const hate = clamp(buckets.hate_speech * 10 * density)
  const threat = clamp(buckets.threat * 10 * density)
  const sexual = clamp(buckets.sexual * 8 * density)
  const profanityScore = clamp(buckets.profanity * 6 * density)
  const toxic = clamp(buckets.toxic_phrase * 10 * density)

  const overall = clamp(
    hate * 0.3 + threat * 0.3 + sexual * 0.15 + profanityScore * 0.1 + toxic * 0.15
  )

  return { overall, hate, threat, sexual, profanity: profanityScore, toxic }
}

// ── 6. Public API (backwards-compatible) ─────────────────────────────────────

export interface ProfanityCheckResult {
  hasProfanity: boolean
  isSevere: boolean
  detectedWords: string[]
  severity: 'none' | 'mild' | 'moderate' | 'severe'
  categories: Category[]
  toxicity: ToxicityScore
  detections: Detection[]
  cleanedText?: string
}

/** Severity thresholds */
const SEVERE_THRESHOLD = 60
const MODERATE_THRESHOLD = 30
const MILD_THRESHOLD = 1

/**
 * Check text for profanity, hate speech, threats, sexual content, and toxicity.
 * Uses normalisation + fuzzy matching + phrase detection + toxicity scoring.
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || !text.trim()) {
    return {
      hasProfanity: false,
      isSevere: false,
      detectedWords: [],
      severity: 'none',
      categories: [],
      toxicity: { overall: 0, hate: 0, threat: 0, sexual: 0, profanity: 0, toxic: 0 },
      detections: [],
    }
  }

  const detections = detectInText(text)
  const toxicity = computeToxicityScores(detections, text.length)

  const detectedWords = [...new Set(detections.map(d => d.matched))]
  const categories = [...new Set(detections.map(d => d.category))]

  let severity: ProfanityCheckResult['severity'] = 'none'
  if (toxicity.overall >= SEVERE_THRESHOLD) severity = 'severe'
  else if (toxicity.overall >= MODERATE_THRESHOLD) severity = 'moderate'
  else if (detections.length > 0) severity = 'mild'

  return {
    hasProfanity: detections.length > 0,
    isSevere: severity === 'severe',
    detectedWords,
    severity,
    categories,
    toxicity,
    detections,
  }
}

/**
 * Filter profanity from text by replacing matched words with asterisks.
 */
export function filterProfanity(text: string, replacement: string = '***'): string {
  if (!text) return text
  const detections = detectInText(text)
  let out = text
  // Replace longest matches first to avoid partial overlaps
  const sorted = [...detections].sort((a, b) => b.original.length - a.original.length)
  for (const d of sorted) {
    const re = new RegExp(d.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    out = out.replace(re, replacement)
  }
  return out
}

/**
 * Get auto-flag reason based on detected categories.
 */
export function getProfanityFlagReason(result: ProfanityCheckResult): string {
  if (result.categories.includes('hate_speech')) return 'hate_speech'
  if (result.categories.includes('threat')) return 'harassment'
  if (result.categories.includes('sexual')) return 'inappropriate_content'
  if (result.categories.includes('toxic_phrase')) return 'harassment'
  if (result.hasProfanity) return 'inappropriate_content'
  return 'other'
}

/**
 * Convenience: get flag reason from raw text.
 */
export function getFlagReason(text: string): string {
  return getProfanityFlagReason(checkProfanity(text))
}

/**
 * Should the content be auto-blocked? (severe toxicity or hate/threats)
 */
export function shouldAutoBlock(text: string): boolean {
  const r = checkProfanity(text)
  return r.isSevere || r.toxicity.hate >= 70 || r.toxicity.threat >= 70
}

/**
 * Should the content be auto-flagged for moderator review?
 */
export function shouldAutoFlag(text: string): boolean {
  const r = checkProfanity(text)
  return r.hasProfanity || r.toxicity.overall >= 20
}

/**
 * Quick check for displaying a warning before posting (client-side).
 * Returns null if clean, otherwise a user-friendly warning message.
 */
export function getContentWarning(text: string): string | null {
  const r = checkProfanity(text)

  if (r.toxicity.hate >= 70 || r.toxicity.threat >= 70) {
    return 'This content contains hate speech or threats and cannot be posted.'
  }
  if (r.severity === 'severe') {
    return 'This content contains severely inappropriate language and cannot be posted.'
  }
  if (r.severity === 'moderate') {
    return 'This content may contain inappropriate language and will be flagged for review. Continue?'
  }
  if (r.toxicity.sexual >= 50) {
    return 'This content appears to contain sexual references and will be flagged for review. Continue?'
  }
  if (r.severity === 'mild') {
    return 'This content may contain mild profanity and will be flagged for review. Continue?'
  }
  return null
}
