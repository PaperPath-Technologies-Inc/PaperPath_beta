import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlanLimitError, getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.is_done !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.is_done === false) {
    const plan = await getEffectivePlan(user.id);
    const limits = getPlanLimits(plan);
    if (Number.isFinite(limits.maxActiveReminders)) {
      const { count } = await supabase
        .from("reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_done", false)
        .neq("id", params.id);
      if ((count ?? 0) >= limits.maxActiveReminders) {
        return NextResponse.json(
          buildPlanLimitError("Free plan allows up to 3 active reminders. Upgrade to Pro for unlimited reminders."),
          { status: 403 },
        );
      }
    }
  }

  const { error } = await supabase
    .from("reminders")
    .update({
      is_done: body.is_done,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}
