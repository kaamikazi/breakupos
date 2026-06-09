import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase-server'
import type Stripe from 'stripe'
import { jsonError } from '@/lib/api'
import { logServerError, logServerInfo } from '@/lib/logging'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  const stripe = getStripe()
  if (!stripe || !sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return jsonError('Stripe webhook is not configured', 400)
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    logServerError('Invalid Stripe webhook signature', { route: 'stripe-webhook' })
    return jsonError('Invalid signature', 400)
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      const userId = session.metadata?.user_id

      if (userId && customerId && subscriptionId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'pro',
            situations_limit: 999999,
            ai_advice_limit: 999999,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId)
        if (error) logServerError('Failed to activate Pro subscription', { route: 'stripe-webhook', userId, customerId, subscriptionId })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { error } = await supabase
        .from('profiles')
        .update({
          plan: 'free',
          situations_limit: 5,
          ai_advice_limit: 3,
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', customerId)
      if (error) logServerError('Failed to downgrade canceled subscription', { route: 'stripe-webhook', customerId })
      break
    }

    case 'invoice.payment_failed': {
      // Do NOT downgrade here. Stripe automatically retries failed invoices
      // (dunning); an immediate downgrade would strip Pro from a paying user
      // whose retry later succeeds. The actual loss of access is handled by
      // `customer.subscription.deleted` once Stripe gives up on retries.
      const invoiceId = (event.data.object as Stripe.Invoice).id
      const customerId = (event.data.object as Stripe.Invoice).customer as string | null
      logServerInfo('Stripe invoice payment failed (awaiting retry, no downgrade)', {
        route: 'stripe-webhook',
        invoiceId,
        customerId,
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
