import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RemindersDashboard } from "@/components/RemindersDashboard";
import { getPgwpSnapshot } from "@/lib/pgwpSnapshot";

export default async function DeadlinesPage() {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();
  const snapshot = await getPgwpSnapshot(user.id);

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id,title,category,due_at,is_done")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true });

  return (
    <div className="stack-16">
      <RemindersDashboard
        reminders={reminders ?? []}
        status={profile.status}
        pro={profile.pro}
        suggestedReminders={snapshot.suggested_reminders}
        remindersCoverage={snapshot.reminders_coverage}
      />
    </div>
  );
}
