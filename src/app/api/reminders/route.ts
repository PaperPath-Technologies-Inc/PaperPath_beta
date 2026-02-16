import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlanLimitError, getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";

function buildDueDateFromProfile(expiryDate: string, offsetDays: number) {
  const base = new Date(`${expiryDate}T09:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() - offsetDays);
  return base;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const category = typeof body?.category === "string" ? body.category.trim() : "";
  const dueAtInput = typeof body?.due_at === "string" ? body.due_at : "";
  const notes = typeof body?.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const syncOffsetRaw = typeof body?.sync_offset_days === "string" ? body.sync_offset_days : "";

  if (!title || !category) return NextResponse.json({ error: "Title and category are required." }, { status: 400 });

  const plan = await getEffectivePlan(user.id);
  const limits = getPlanLimits(plan);
  if (Number.isFinite(limits.maxActiveReminders)) {
    const { count } = await supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_done", false);
    if ((count ?? 0) >= limits.maxActiveReminders) {
      return NextResponse.json(
        buildPlanLimitError("Free plan allows up to 3 active reminders. Upgrade to Pro for unlimited reminders."),
        { status: 403 },
      );
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("expiry_date")
    .eq("id", user.id)
    .maybeSingle();

  let dueAt: Date | null = null;
  if (syncOffsetRaw && profile?.expiry_date) {
    const offset = Number(syncOffsetRaw);
    if (![7, 14, 30, 60, 90].includes(offset)) {
      return NextResponse.json({ error: "Invalid sync offset." }, { status: 400 });
    }
    dueAt = buildDueDateFromProfile(profile.expiry_date, offset);
  } else if (dueAtInput) {
    const parsed = new Date(dueAtInput);
    if (!Number.isNaN(parsed.getTime())) dueAt = parsed;
  }
  if (!dueAt) return NextResponse.json({ error: "Due date is required." }, { status: 400 });

  const { error } = await supabase.from("reminders").insert({
    user_id: user.id,
    title,
    category,
    due_at: dueAt.toISOString(),
    run_at: dueAt.toISOString(),
    notes,
  });
  if (error) return NextResponse.json({ error: "Could not save reminder." }, { status: 400 });

  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "reminder",
    title: "Reminder created",
    body: `${title} is now on your timeline.`,
  });
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}
