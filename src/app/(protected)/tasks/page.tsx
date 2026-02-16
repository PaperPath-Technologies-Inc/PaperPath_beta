import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { formatDate } from "@/lib/dates";

async function setTaskStatus(id: string, nextStatus: "todo" | "done") {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("tasks")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect("/tasks?category=all&error=update_failed");
  }

  await recalculatePgwp(user.id).catch(() => null);
  redirect("/tasks?category=all");
}

async function deleteTask(id: string) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    redirect("/tasks?category=all&error=delete_failed");
  }

  await recalculatePgwp(user.id).catch(() => null);
  redirect("/tasks?category=all");
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: { category?: string; filter?: string; sort?: string; error?: string };
}) {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();

  const categoryOptions = new Set(["all", "pgwp", "docs", "school", "general"]);
  const category = categoryOptions.has(searchParams?.category ?? "") ? (searchParams?.category as string) : "all";
  const filter = searchParams?.filter === "overdue" ? "overdue" : "all";
  const sort = searchParams?.sort === "soonest" ? "soonest" : "default";

  let query = supabase
    .from("tasks")
    .select("id,title,due_date,status,category,created_at")
    .eq("user_id", user.id);
  if (category !== "all") {
    query = query.eq("category", category);
  }
  const { data: tasks } = await query;

  const today = new Date();
  const all = tasks ?? [];
  const activePgwpTodoCount = all.filter((task) => task.status === "todo" && task.category === "pgwp").length;
  const reachedFreeLimit = !profile.pro && activePgwpTodoCount >= 10;
  const filtered =
    filter === "overdue"
      ? all.filter((task) => task.status === "todo" && task.due_date && new Date(task.due_date) < today)
      : all;

  const display =
    sort === "soonest"
      ? [...filtered].sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        })
      : filtered;

  const errorText =
    searchParams?.error === "update_failed"
      ? "Could not update task."
      : searchParams?.error === "delete_failed"
        ? "Could not delete task."
        : null;

  return (
    <div className="stack-16">
      <header className="inline-head">
        <div>
          <p className="eyebrow">Tasks</p>
          <h1>My tasks</h1>
        </div>
        <Link href={reachedFreeLimit ? "/pricing" : "/tasks/create?category=general"} className="btn btn-primary small">
          {reachedFreeLimit ? "🔒 Upgrade to add" : "Add task"}
        </Link>
      </header>
      {reachedFreeLimit ? (
        <p className="hint">Free plan limit reached: 10 active tasks. Upgrade to Pro for unlimited tasks.</p>
      ) : null}

      <div className="button-row">
        <Link href="/tasks?category=all" className="btn btn-secondary">All</Link>
        <Link href="/tasks?category=pgwp" className="btn btn-secondary">PGWP</Link>
        <Link href="/tasks?category=docs" className="btn btn-secondary">Docs</Link>
        <Link href="/tasks?category=school" className="btn btn-secondary">School</Link>
        <Link href={`/tasks?category=${category}&filter=overdue`} className="btn btn-secondary">Overdue</Link>
        <Link href={`/tasks?category=${category}&sort=soonest`} className="btn btn-secondary">Soonest</Link>
      </div>

      {errorText && <p className="error">{errorText}</p>}

      <section className="stack-12">
        {display.length ? (
          display.map((task) => (
            <article key={task.id} className="card stack-8">
              <div className="inline-head">
                <h3>{task.title}</h3>
                <span className={task.status === "done" ? "tag done" : "tag"}>{task.status === "done" ? "Done" : "Todo"}</span>
              </div>
              <p className="muted">Due: {task.due_date ? formatDate(task.due_date) : "No due date"}</p>
              <div className="reminder-card-actions">
                <form action={setTaskStatus.bind(null, task.id, task.status === "done" ? "todo" : "done")}> 
                  <button type="submit" className="btn btn-secondary small">
                    {task.status === "done" ? "Mark todo" : "Mark done"}
                  </button>
                </form>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="btn btn-secondary small reminder-delete-btn">Delete</button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <article className="card">
            <p className="muted">No tasks yet.</p>
          </article>
        )}
      </section>
    </div>
  );
}
