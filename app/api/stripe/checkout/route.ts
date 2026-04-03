import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, STRIPE_PRICE_IDS } from '@/app/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { tier, userId } = await req.json()
    const supabaseAdmin = getSupabaseAdmin()

    if (!tier || !userId) {
      return NextResponse.json({ error: 'Missing tier or userId' }, { status: 400 })
    }

    // Free tier doesn't need payment
    if (tier === 'free') {
      // Downgrade to free directly
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          premium_tier: 'free',
          is_premium: false,
          premium_since: null,
        })
        .eq('id', userId)

      if (error) {
        return NextResponse.json({ error: 'Failed to downgrade' }, { status: 500 })
      }

      return NextResponse.json({ success: true, free: true })
    }

    const priceId = STRIPE_PRICE_IDS[tier]

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier or price not configured' }, { status: 400 })
    }

    // Get user email from Supabase
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create Stripe checkout session
    const stripe = getStripeServer()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=premium&success=true&tier=${tier}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings?tab=premium&canceled=true`,
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
