import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";

function toDateTimeLocal(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

async function updateReminder(id: string, formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const dueAtRaw = (formData.get("due_at") as string | null) ?? "";
  const notesRaw = (formData.get("notes") as string | null) ?? "";
  const isDone = formData.get("is_done") === "on";

  if (!title || !category || !dueAtRaw) {
    redirect(`/reminders/${id}/edit?error=missing_fields`);
  }

  const dueAt = new Date(dueAtRaw);
  if (Number.isNaN(dueAt.getTime())) {
    redirect(`/reminders/${id}/edit?error=bad_due`);
  }

  const { error } = await supabase
    .from("reminders")
    .update({
      title,
      category,
      due_at: dueAt.toISOString(),
      run_at: dueAt.toISOString(),
      notes: notesRaw.trim() || null,
      is_done: isDone,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/reminders/${id}/edit?error=save_failed`);
  }
  await recalculatePgwp(user.id).catch(() => null);

  redirect("/deadlines");
}

async function deleteReminder(id: string) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.from("reminders").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    redirect(`/reminders/${id}/edit?error=delete_failed`);
  }
  await recalculatePgwp(user.id).catch(() => null);

  redirect("/deadlines");
}

export default async function EditReminderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: reminder } = await supabase
    .from("reminders")
    .select("id,title,category,due_at,notes,is_done")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!reminder) notFound();

  const error = searchParams?.error;
  const errorText =
    error === "missing_fields"
      ? "Title, category, and due date are required."
      : error === "bad_due"
        ? "Invalid due date."
        : error === "save_failed"
          ? "Could not save reminder."
          : error === "delete_failed"
            ? "Could not delete reminder."
            : null;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Reminders</p>
        <h1>Edit reminder</h1>
        <p className="muted">Update, complete, or delete this reminder.</p>
      </header>

      <article className="card">
        <form className="stack-12" action={updateReminder.bind(null, reminder.id)}>
          <label htmlFor="title">Title</label>
          <input id="title" type="text" name="title" required defaultValue={reminder.title} />

          <label htmlFor="category">Category</label>
          <input id="category" type="text" name="category" required defaultValue={reminder.category} />

          <label htmlFor="due_at">Due date</label>
          <input id="due_at" type="datetime-local" name="due_at" required defaultValue={toDateTimeLocal(reminder.due_at)} />

          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={4} defaultValue={reminder.notes ?? ""} />

          <label htmlFor="is_done" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <input id="is_done" type="checkbox" name="is_done" defaultChecked={reminder.is_done} style={{ width: "auto" }} />
            Mark as done
          </label>

          {errorText && <p className="error">{errorText}</p>}

          <button type="submit" className="btn btn-primary">
            Save changes
          </button>
        </form>
      </article>

      <article className="card stack-12">
        <h3>Danger zone</h3>
        <p className="muted">Deleting a reminder is permanent.</p>
        <form action={deleteReminder.bind(null, reminder.id)}>
          <button
            type="submit"
            className="btn"
            style={{
              color: "var(--danger)",
              borderColor: "color-mix(in srgb, var(--danger) 45%, var(--border))",
              background: "var(--surface-strong)",
            }}
          >
            Delete reminder
          </button>
        </form>
      </article>

      <Link href="/deadlines" className="btn btn-secondary" style={{ justifySelf: "start" }}>
        Back to reminders
      </Link>
    </div>
  );
}
