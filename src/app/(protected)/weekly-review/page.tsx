import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPgwpSnapshot, recalculatePgwp } from "@/lib/pgwpSnapshot";
import { getWeekStartDate } from "@/lib/weeklyReview";

type WeeklyReviewItem = {
  id: string;
  type: "task" | "deadline";
  title: string;
  daysDelta: number;
  editRoute: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysDiffFromToday(dateIso: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(dateIso));
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueChip(daysDelta: number) {
  if (daysDelta < 0) return `Overdue ${Math.abs(daysDelta)} day${Math.abs(daysDelta) === 1 ? "" : "s"}`;
  if (daysDelta === 0) return "Due today";
  return `Due in ${daysDelta} day${daysDelta === 1 ? "" : "s"}`;
}

async function markTaskDone(taskId: string) {
  "use server";
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("tasks").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", taskId).eq("user_id", user.id);
  if (error) redirect("/weekly-review?error=task_update_failed");

  await recalculatePgwp(user.id).catch(() => null);
  redirect("/weekly-review?updated=1");
}

async function markDeadlineDone(reminderId: string) {
  "use server";
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("reminders")
    .update({ is_done: true, updated_at: new Date().toISOString() })
    .eq("id", reminderId)
    .eq("user_id", user.id);
  if (error) redirect("/weekly-review?error=deadline_update_failed");

  await recalculatePgwp(user.id).catch(() => null);

  redirect("/weekly-review?updated=1");
}

function ReviewItemRow({ item }: { item: WeeklyReviewItem }) {
  return (
    <article className="weekly-item-row">
      <div className="stack-8">
        <p className="weekly-item-title">{item.title}</p>
        <span className={item.daysDelta < 0 ? "weekly-chip overdue" : "weekly-chip"}>{formatDueChip(item.daysDelta)}</span>
      </div>
      <div className="weekly-item-actions">
        {item.type === "task" ? (
          <>
            <form action={markTaskDone.bind(null, item.id)}>
              <button type="submit" className="btn btn-secondary small">Mark done</button>
            </form>
            <Link href={item.editRoute} className="btn btn-secondary small">Edit</Link>
          </>
        ) : (
          <>
            <form action={markDeadlineDone.bind(null, item.id)}>
              <button type="submit" className="btn btn-secondary small">Mark done</button>
            </form>
            <Link href={item.editRoute} className="btn btn-secondary small">View details</Link>
          </>
        )}
      </div>
    </article>
  );
}

export default async function WeeklyReviewPage({
  searchParams,
}: {
  searchParams?: { error?: string; updated?: string };
}) {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();
  const snapshot = await getPgwpSnapshot(user.id);

  const weekStartDate = getWeekStartDate(new Date());
  try {
    await supabase
      .from("weekly_review_log")
      .upsert(
        { user_id: user.id, week_start_date: weekStartDate, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,week_start_date" },
      );
  } catch {
    // Log table is optional. Weekly review should still load even if migration is pending.
  }

  const upcomingTasks: WeeklyReviewItem[] = snapshot.feeds.upcoming_tasks_next_7_days.map((item) => ({
    id: item.id,
    type: "task",
    title: item.title,
    daysDelta: item.due_date ? daysDiffFromToday(item.due_date) : 0,
    editRoute: "/tasks?category=pgwp",
  }));
  const overdueTasks: WeeklyReviewItem[] = snapshot.feeds.overdue_tasks.map((item) => ({
    id: item.id,
    type: "task",
    title: item.title,
    daysDelta: item.due_date ? daysDiffFromToday(item.due_date) : -1,
    editRoute: "/tasks?category=pgwp&filter=overdue",
  }));
  const upcomingDeadlines: WeeklyReviewItem[] = snapshot.feeds.upcoming_deadlines_next_7_days.map((item) => ({
    id: item.id,
    type: "deadline",
    title: item.title,
    daysDelta: daysDiffFromToday(item.due_at),
    editRoute: `/reminders/${item.id}/edit`,
  }));
  const overdueDeadlines: WeeklyReviewItem[] = snapshot.feeds.overdue_deadlines.map((item) => ({
    id: item.id,
    type: "deadline",
    title: item.title,
    daysDelta: daysDiffFromToday(item.due_at),
    editRoute: `/reminders/${item.id}/edit`,
  }));

  const best = snapshot.derived.connected_next_actions[0] ?? null;
  const enabledReminders = snapshot.reminders_summary.enabled_count;
  const showEmpty =
    upcomingTasks.length === 0 &&
    upcomingDeadlines.length === 0 &&
    overdueTasks.length === 0 &&
    overdueDeadlines.length === 0;
  const errorText =
    searchParams?.error === "task_update_failed"
      ? "Could not update task."
      : searchParams?.error === "deadline_update_failed"
        ? "Could not update deadline."
        : null;

  return (
    <div className="stack-16">
      <header className="card weekly-header stack-8">
        <p className="eyebrow">Weekly Review</p>
        <h1>Plan your next 7 days</h1>
        <p className="muted">60-second planning: upcoming, overdue, and one best next action.</p>
      </header>

      {errorText ? <p className="error">{errorText}</p> : null}
      {searchParams?.updated ? <p className="success">Updated.</p> : null}

      <article className="card stack-12">
        <h3>Upcoming (7 days)</h3>
        {upcomingDeadlines.length === 0 && upcomingTasks.length === 0 ? (
          <p className="muted">No items due in the next 7 days.</p>
        ) : (
          <div className="stack-8">
            {upcomingDeadlines.map((item) => (
              <ReviewItemRow key={`upcoming-deadline-${item.id}`} item={item} />
            ))}
            {upcomingTasks.map((item) => (
              <ReviewItemRow key={`upcoming-task-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </article>

      <article className="card stack-12">
        <h3>Overdue</h3>
        {overdueDeadlines.length === 0 && overdueTasks.length === 0 ? (
          <p className="muted">No overdue items. Good momentum.</p>
        ) : (
          <div className="stack-8">
            {overdueDeadlines.map((item) => (
              <ReviewItemRow key={`overdue-deadline-${item.id}`} item={item} />
            ))}
            {overdueTasks.map((item) => (
              <ReviewItemRow key={`overdue-task-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </article>

      <article className="card stack-12">
        <h3>One Best Next Action</h3>
        <p><strong>{best?.title ?? "Add a new PGWP task"}</strong></p>
        <p className="muted">{best?.description ?? "Start with one concrete task for this week."}</p>
      </article>

      {profile.pro ? (
        <article className="card stack-8">
          <h3>Weekly Insights</h3>
          <p className="muted">
            {overdueTasks.length + overdueDeadlines.length > 0
              ? `You have ${overdueTasks.length + overdueDeadlines.length} overdue item(s). Clear these first.`
              : "No overdue items. Focus on upcoming tasks early for a calmer week."}
          </p>
        </article>
      ) : null}

      <article className="card stack-12">
        {showEmpty ? (
          <>
            <p><strong>You’re clear this week.</strong></p>
            <p className="muted">Keep momentum by adding one PGWP task.</p>
            <Link href="/tasks/new?category=pgwp" className="btn btn-secondary">Add PGWP task</Link>
          </>
        ) : null}
        <Link href={best?.cta_route ?? "/tasks/new?category=pgwp"} className="btn btn-primary">
          Do next action
        </Link>
        {enabledReminders === 0 ? (
          <Link href="/reminders/create" className="btn btn-secondary">
            Enable reminders
          </Link>
        ) : null}
        <p className="small muted">Organizational planning only. Not immigration advice.</p>
      </article>
    </div>
  );
}
