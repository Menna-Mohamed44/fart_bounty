import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabaseServer'

/**
 * GET /api/engagement?action=recommended|trending|recompute&limit=10
 * Self-contained engagement predictor — no paid APIs.
 */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'recommended'
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'))

  try {
    if (action === 'recompute') {
      // Recompute scores for posts from last 7 days
      const { data, error } = await supabase.rpc('recompute_engagement_scores', { p_hours_back: 168 })
      if (error) throw error
      return NextResponse.json({ recomputed: data })
    }

    if (action === 'trending') {
      // Fetch posts ordered by trending_score
      const { data, error } = await supabase
        .from('engagement_scores')
        .select(`
          post_id,
          trending_score,
          likes_count,
          comments_count,
          views_count,
          engagement_rate,
          overall_score
        `)
        .order('trending_score', { ascending: false })
        .limit(limit)

      if (error) throw error
      return NextResponse.json({ posts: data || [] })
    }

    // Default: recommended — overall_score DESC
    const { data, error } = await supabase
      .from('engagement_scores')
      .select(`
        post_id,
        overall_score,
        trending_score,
        engagement_rate,
        likes_count,
        comments_count,
        views_count,
        has_sound,
        word_count
      `)
      .order('overall_score', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ posts: data || [] })

  } catch (err: any) {
    console.error('Engagement API error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/engagement
 * Record a content impression (view).
 * Body: { post_id: string, user_id?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  try {
    const { post_id, user_id } = await req.json()

    if (!post_id) {
      return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('content_impressions')
      .insert({ post_id, user_id: user_id || null })

    if (error) throw error
    return NextResponse.json({ recorded: true })

  } catch (err: any) {
    console.error('Impression recording error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
