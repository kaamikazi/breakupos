# BreakupOS Setup Guide

## Prerequisites
- Node.js 20+
- Supabase account
- Anthropic API key
- Stripe account
- Vercel account (for deploy)

---

## 1. Supabase Setup

1. Create a new project at https://supabase.com
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Under **Authentication → Providers**, enable:
   - GitHub OAuth (create a GitHub OAuth App)
   - Google OAuth (create Google OAuth credentials)
4. Copy your project credentials from **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Anthropic Setup

1. Get your API key from https://console.anthropic.com
2. Set `ANTHROPIC_API_KEY` in `.env.local`

---

## 3. Stripe Setup

1. Create account at https://stripe.com
2. Create a product "BreakupOS Pro" with a $7/month recurring price
3. Copy:
   - Secret key → `STRIPE_SECRET_KEY`
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Price ID → `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`
4. Set up webhook (after deploy) pointing to `https://your-domain.com/api/webhooks/stripe`
   with events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

For local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 4. Local Development

```bash
cp .env.local.example .env.local  # fill in your values
npm install
npm run dev
```

---

## 5. Vercel Deployment

```bash
npx vercel
```

Set all environment variables in Vercel project settings.
Set `NEXT_PUBLIC_APP_URL` to your production URL.

Update Supabase Auth Redirect URLs to include:
- `https://your-domain.com/auth/callback`

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Stripe Pro plan price ID |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL |
