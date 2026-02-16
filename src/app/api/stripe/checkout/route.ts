import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { promoCode?: string };
  const code = body.promoCode?.trim().toLowerCase();
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

  if (!stripeSecretKey || !stripePriceId) {
    return NextResponse.json(
      { error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const headerList = headers();
  const origin =
    headerList.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const sessionArgs: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    success_url: `${origin}/subscription?success=1`,
    cancel_url: `${origin}/subscription?canceled=1`,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    customer_email: user.email,
    metadata: { user_id: user.id },
    client_reference_id: user.id,
    allow_promotion_codes: true,
  };

  if (code) {
    if (code !== "paperbeta") {
      return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });
    }

    const explicitPromoId = process.env.STRIPE_PROMOTION_CODE_PAPERBETA;
    if (explicitPromoId) {
      sessionArgs.discounts = [{ promotion_code: explicitPromoId }];
    } else {
      const promos = await stripe.promotionCodes.list({ code: "paperbeta", active: true, limit: 1 });
      const promo = promos.data[0];
      if (!promo) {
        return NextResponse.json({ error: "Coupon configured incorrectly." }, { status: 400 });
      }
      sessionArgs.discounts = [{ promotion_code: promo.id }];
    }
  }

  const session = await stripe.checkout.sessions.create(sessionArgs);
  return NextResponse.json({ url: session.url });
}
