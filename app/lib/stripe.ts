import Stripe from 'stripe'

// Lazy-initialized server-side Stripe instance
let _stripe: Stripe | null = null

export function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2025-03-31.basil' as any,
    })
  }
  return _stripe
}

// Price IDs for each tier (set these in your Stripe Dashboard)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
  premium_pro: process.env.STRIPE_PRICE_PREMIUM_PRO || '',
  unlimited: process.env.STRIPE_PRICE_UNLIMITED || '',
}
