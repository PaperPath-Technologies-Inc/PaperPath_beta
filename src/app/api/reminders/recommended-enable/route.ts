import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { enableRecommendedReminders } from "@/lib/suggestedReminders";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await enableRecommendedReminders(user.id);
    await recalculatePgwp(user.id).catch(() => null);
    return NextResponse.json({ ok: true, created: result.created });
  } catch (error) {
    const payload = error as { code?: string; message?: string; upgrade?: boolean };
    if (payload?.code === "PLAN_LIMIT") {
      return NextResponse.json(payload, { status: 403 });
    }
    return NextResponse.json({ error: "Could not enable recommended reminders." }, { status: 400 });
  }
}

