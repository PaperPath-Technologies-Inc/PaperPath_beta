# PaperPath Lite

Next.js 14 App Router app with Supabase Auth/Postgres/Storage and Stripe subscriptions.

## Features

- Auth: email/password signup + login
- First-login onboarding for `student` or `pgwp` + expiry date
- Auto-generated reminders after onboarding
- Home countdown + next reminder
- Deadlines list + create reminder page
- Vault uploads to Supabase Storage bucket `vault`
- Plan limits on free tier (1 reminder, 1 document, 1 visible notification)
- Pro pages and gates (`/risk`, full checklists, unlimited items)
- Stripe Checkout subscription + webhook updates `profiles.pro`
- Light/Dark theme toggle with CSS variables

## 1) Install and run

```bash
npm i
npm run dev
```

## 2) Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Backward-compatible fallback (either key works):
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Optional until you create Stripe:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
# Backward-compatible fallback:
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PROMOTION_CODE_PAPERBETA=promo_...
```

If you do not have Stripe yet, you can leave Stripe vars empty and test the rest of the app.
The Subscription page will show a Stripe-not-configured response when checkout is attempted.

## 3) Supabase setup

1. Open Supabase SQL editor.
2. Run `src/supabase/schema.sql`.
3. Confirm bucket `vault` exists and policies are created.
4. In Auth settings, enable email/password provider.

## 4) Stripe setup

1. Create a recurring price and set `STRIPE_PRICE_ID`.
2. Create a coupon/promotion code `paperbeta` for 100% off 1 month.
3. Configure webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`.

Local webhook forwarding:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

No Stripe account yet:
1. Skip this section for now.
2. Test auth, onboarding, reminders, vault, profile, notifications, and checklist gating.
3. When ready, add Stripe keys and restart `npm run dev`.

## 5) Vercel deployment

1. Import repo into Vercel.
2. Add all env vars from `.env.local`.
3. Deploy.
4. Update Stripe webhook URL to production domain.

## Routes

- Public: `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/contact`
- Protected: `/onboarding`, `/home`, `/deadlines`, `/reminders/create`, `/vault`, `/profile`, `/study-permit`, `/pgwp`, `/notifications`, `/subscription`, `/risk`
