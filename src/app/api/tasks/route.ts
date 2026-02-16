import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlanLimitError, getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { normalizeDateOnlyOptional, sanitizeErrorMessage } from "@/lib/dateOnly";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const dueDateParsed = normalizeDateOnlyOptional(typeof body?.due_date === "string" ? body.due_date : null);
  const categoryInput = typeof body?.category === "string" ? body.category.trim().toLowerCase() : "pgwp";
  const category = categoryInput || "pgwp";
  const status = "todo";

  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  if (dueDateParsed.error) return NextResponse.json({ error: dueDateParsed.error }, { status: 400 });

  const plan = await getEffectivePlan(user.id);
  const limits = getPlanLimits(plan);
  if (category === "pgwp" && Number.isFinite(limits.maxActiveTasks)) {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("category", "pgwp")
      .eq("status", "todo");
    if ((count ?? 0) >= limits.maxActiveTasks) {
      return NextResponse.json(
        buildPlanLimitError("Free plan allows up to 10 active PGWP tasks. Upgrade to Pro for unlimited tasks."),
        { status: 403 },
      );
    }
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    due_date: dueDateParsed.value,
    status,
    category,
  });
  if (error) {
    console.error("Task API insert failed", {
      userId: user.id,
      payload: {
        title,
        due_date: dueDateParsed.value,
        status,
        category,
      },
      error,
    });
    return NextResponse.json({ error: sanitizeErrorMessage(error.message, "Could not save task.") }, { status: 400 });
  }

  if (category === "pgwp") {
    await recalculatePgwp(user.id).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
