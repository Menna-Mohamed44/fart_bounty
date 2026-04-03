import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/app/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function updateUserPremium(userId: string, tier: string) {
  const isPaid = tier !== 'free'
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({
      premium_tier: tier,
      is_premium: isPaid,
      premium_since: isPaid ? new Date().toISOString() : null,
    })
    .eq('id', userId)

  if (error) {
    console.error('Failed to update user premium:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  const stripe = getStripeServer()

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const tier = session.metadata?.tier

        if (userId && tier) {
          await updateUserPremium(userId, tier)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        const tier = subscription.metadata?.tier

        if (userId && tier) {
          // Only update if subscription is active
          if (subscription.status === 'active') {
            await updateUserPremium(userId, tier)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          // Downgrade to free when subscription is canceled
          await updateUserPremium(userId, 'free')
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscription = (invoice as any).subscription as string
        
        if (subscription) {
          const sub = await getStripeServer().subscriptions.retrieve(subscription)
          const userId = sub.metadata?.userId

          if (userId) {
            console.warn(`Payment failed for user ${userId}, subscription ${subscription}`)
            // Optionally downgrade or notify user
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
