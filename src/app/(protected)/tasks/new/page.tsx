import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { normalizeDateOnlyOptional, sanitizeErrorMessage } from "@/lib/dateOnly";

async function createTask(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const dueDateRaw = formData.get("due_date") as string | null;
  const dueDateParsed = normalizeDateOnlyOptional(dueDateRaw);
  const categoryInput = ((formData.get("category") as string | null) ?? "general").trim().toLowerCase();
  const category = categoryInput || "general";
  const status = "todo";

  if (!title) {
    redirect("/tasks/create?error=missing_title&error_message=Task%20title%20is%20required.");
  }

  if (dueDateParsed.error) {
    redirect(`/tasks/create?error=invalid_due_date&error_message=${encodeURIComponent(dueDateParsed.error)}`);
  }

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
      redirect("/tasks/create?error=plan_limit");
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
    console.error("Task insert failed", {
      userId: user.id,
      payload: {
        title,
        due_date: dueDateParsed.value,
        status,
        category,
      },
      error,
    });
    const errorMessage = sanitizeErrorMessage(error.message, "Could not save task.");
    redirect(`/tasks/create?error=save_failed&error_message=${encodeURIComponent(errorMessage)}`);
  }

  if (category === "pgwp") {
    await recalculatePgwp(user.id).catch(() => null);
  }

  redirect("/tasks?category=all");
}

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams?: { category?: string; error?: string; error_message?: string };
}) {
  await requireUser();
  const allowedCategories = new Set(["general", "pgwp", "docs", "school"]);
  const category = allowedCategories.has(searchParams?.category ?? "") ? (searchParams?.category as string) : "general";
  const errorText =
    searchParams?.error === "missing_title"
      ? "Task title is required."
      : searchParams?.error === "invalid_due_date"
        ? searchParams?.error_message ?? "Use YYYY-MM-DD format."
      : searchParams?.error === "plan_limit"
        ? "Free plan limit reached: max 10 active PGWP tasks. Upgrade to Pro for unlimited tasks."
      : searchParams?.error === "save_failed"
        ? searchParams?.error_message ?? "Could not save task."
        : null;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Tasks</p>
        <h1>Create task</h1>
      </header>

      <article className="card">
        <form action={createTask} className="stack-12">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" defaultValue={category}>
            <option value="general">General</option>
            <option value="pgwp">PGWP</option>
            <option value="docs">Docs</option>
            <option value="school">School</option>
          </select>

          <label htmlFor="title">Task title</label>
          <input id="title" name="title" type="text" required placeholder="Collect transcript" />

          <label htmlFor="due_date">Due date (optional)</label>
          <input id="due_date" name="due_date" type="date" />

          {errorText && <p className="error">{errorText}</p>}

          <button type="submit" className="btn btn-primary">
            Save task
          </button>
          {searchParams?.error === "plan_limit" ? (
            <a href="/pricing" className="btn btn-secondary">
              Upgrade to Pro
            </a>
          ) : null}
        </form>
      </article>
    </div>
  );
}
