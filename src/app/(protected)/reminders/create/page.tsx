import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_MAX_REMINDERS } from "@/lib/limits";
import { getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";

function buildDueDateFromProfile(expiryDate: string, offsetDays: number) {
  const base = new Date(`${expiryDate}T09:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() - offsetDays);
  return base;
}

async function createReminder(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const title = (formData.get("title") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const dueAtInput = (formData.get("due_at") as string | null) ?? "";
  const notesRaw = (formData.get("notes") as string | null) ?? "";
  const notes = notesRaw.trim() || null;
  const syncOffsetRaw = (formData.get("sync_offset_days") as string | null) ?? "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("status,expiry_date,pro")
    .eq("id", user.id)
    .maybeSingle();

  const plan = await getEffectivePlan(user.id);
  const limits = getPlanLimits(plan);
  const { count } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_done", false);

  if (Number.isFinite(limits.maxActiveReminders) && (count ?? 0) >= limits.maxActiveReminders) {
    redirect("/reminders/create?error=limit");
  }

  if (!title || !category) {
    redirect("/reminders/create?error=missing_fields");
  }

  let dueAt: Date | null = null;

  if (syncOffsetRaw && profile?.expiry_date) {
    const offset = Number(syncOffsetRaw);
    if (![7, 14, 30, 60, 90].includes(offset)) {
      redirect("/reminders/create?error=bad_sync");
    }
    dueAt = buildDueDateFromProfile(profile.expiry_date, offset);
  } else if (dueAtInput) {
    const parsed = new Date(dueAtInput);
    if (!Number.isNaN(parsed.getTime())) {
      dueAt = parsed;
    }
  }

  if (!dueAt) {
    redirect("/reminders/create?error=missing_due");
  }

  await supabase.from("reminders").insert({
    user_id: user.id,
    title,
    category,
    due_at: dueAt.toISOString(),
    run_at: dueAt.toISOString(),
    notes,
  });

  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "reminder",
    title: "Reminder created",
    body: `${title} is now on your timeline.`,
  });
  await recalculatePgwp(user.id).catch(() => null);

  redirect("/deadlines");
}

export default async function CreateReminderPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();

  const { count } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_done", false);

  const activeCount = count ?? 0;
  const reachedLimit = !profile.pro && activeCount >= FREE_MAX_REMINDERS;

  const error = searchParams?.error;
  const errorText =
    error === "limit"
      ? `Free plan allows ${FREE_MAX_REMINDERS} active reminders. Upgrade for unlimited reminders.`
      : error === "missing_due"
        ? "Pick a due date, or choose a profile sync option."
        : error === "missing_fields"
          ? "Title and category are required."
          : error === "bad_sync"
            ? "Sync option is invalid. Please choose again."
            : null;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Create</p>
        <h1>New reminder</h1>
        <p className="muted">Create reminders that match your {profile.status === "student" ? "student" : "PGWP"} profile.</p>
      </header>

      <article className="card reminders-create-profile">
        <div>
          <p className="eyebrow">Profile Sync</p>
          <h3>{profile.status === "student" ? "Student" : "PGWP"} status</h3>
          <p className="muted">Permit expiry: {profile.expiry_date}</p>
          <p className="muted">City: {profile.city ?? "Not set"}</p>
        </div>
        <div className="reminders-create-plan">
          <p className="badge">{profile.pro ? "Pro" : "Free"}</p>
          <p className="hint">
            Active reminders: {activeCount}/{profile.pro ? "Unlimited" : FREE_MAX_REMINDERS}
          </p>
        </div>
      </article>

      <article className="card">
        <form className="stack-12" action={createReminder}>
          <label htmlFor="title">Title</label>
          <input id="title" type="text" name="title" required placeholder="Tuition payment deadline" />

          <label htmlFor="category">Category</label>
          <input id="category" type="text" name="category" required placeholder="payment / document / status / task" list="reminder-categories" />
          <datalist id="reminder-categories">
            <option value="payment" />
            <option value="document" />
            <option value="status" />
            <option value="biometrics" />
            <option value="application" />
            <option value="task" />
          </datalist>

          <label htmlFor="due_at">Due date and time</label>
          <input id="due_at" type="datetime-local" name="due_at" />

          <label htmlFor="sync_offset_days">Or sync from profile expiry date</label>
          <select id="sync_offset_days" name="sync_offset_days" defaultValue="">
            <option value="">No sync</option>
            <option value="90">90 days before expiry</option>
            <option value="60">60 days before expiry</option>
            <option value="30">30 days before expiry</option>
            <option value="14">14 days before expiry</option>
            <option value="7">7 days before expiry</option>
          </select>

          <p className="hint">If sync is selected, reminder date is calculated from your profile expiry date.</p>

          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={4} placeholder="Optional details" />

          {errorText && <p className="error">{errorText}</p>}

          <button type="submit" className="btn btn-primary" disabled={reachedLimit}>
            Save reminder
          </button>

          {reachedLimit && (
            <Link href="/pricing" className="btn btn-secondary" style={{ textAlign: "center" }}>
              Upgrade to Pro (Unlimited reminders)
            </Link>
          )}
        </form>
      </article>

      <article className="card stack-8">
        <h3>How sync works</h3>
        <p className="muted">Your reminder can be linked to your profile expiry date (for example: 30 days before).</p>
        <p className="muted">When your profile changes later, you can create new synced reminders with updated timing.</p>
        <p className="small muted">Signed in as: {user.email}</p>
      </article>
    </div>
  );
}
