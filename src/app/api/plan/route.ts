import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/plan.server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getEffectivePlan(user.id).catch(() => "free");
  return NextResponse.json({ plan, isPro: plan === "pro" });
}
