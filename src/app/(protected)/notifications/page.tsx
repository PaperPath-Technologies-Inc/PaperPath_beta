import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_MAX_NOTIFICATIONS } from "@/lib/limits";
import { formatDate } from "@/lib/dates";

export default async function NotificationsPage() {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,title,body,type,created_at")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: false });

  const visible = profile.pro ? notifications ?? [] : (notifications ?? []).slice(0, FREE_MAX_NOTIFICATIONS);

  return (
    <div className="stack-16">
      <header className="inline-head">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Inbox</h1>
        </div>
        <Link href={profile.pro ? "/risk" : "/pricing"} className="btn btn-secondary small">
          {profile.pro ? "Go to Risk" : "Upgrade"}
        </Link>
      </header>

      <section className="stack-12">
        {visible.length ? (
          visible.map((item) => (
            <article key={item.id} className="card stack-8">
              <p className="muted">{item.type}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="muted">{formatDate(item.created_at)}</p>
            </article>
          ))
        ) : (
          <article className="card">
            <p>No notifications yet.</p>
          </article>
        )}
      </section>
    </div>
  );
}
