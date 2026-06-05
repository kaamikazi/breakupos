import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { jsonError } from '@/lib/api'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return jsonError('Unauthorized', 401)
  const stripe = getStripe()
  if (!stripe || !process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || !process.env.NEXT_PUBLIC_APP_URL) {
    return jsonError('Stripe checkout is not configured.', 503)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : (profile?.email ?? user.email),
    line_items: [
      { price: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!, quantity: 1 },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: { user_id: user.id },
  })

  if (!session.url) return jsonError('Stripe did not return a checkout URL.', 502)
  return NextResponse.json({ url: session.url })
}
