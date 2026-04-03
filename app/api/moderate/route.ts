import { NextRequest, NextResponse } from 'next/server'
import { checkProfanity, shouldAutoBlock, getContentWarning } from '@/app/lib/profanityFilter'

/**
 * POST /api/moderate
 * Server-side content screening endpoint.
 * Body: { text: string }
 * Returns toxicity analysis + action recommendation.
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 })
    }

    const result = checkProfanity(text)
    const blocked = shouldAutoBlock(text)
    const warning = getContentWarning(text)

    return NextResponse.json({
      blocked,
      warning,
      severity: result.severity,
      toxicity: result.toxicity,
      categories: result.categories,
      detectedWords: result.detectedWords,
      action: blocked ? 'block' : result.hasProfanity ? 'flag' : 'allow',
    })
  } catch (err: any) {
    console.error('Moderation API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
