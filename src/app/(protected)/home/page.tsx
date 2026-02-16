import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { CRS_OFFICIAL_SOURCES } from "@/lib/crs";
import { fetchLatestExpressEntryDraw } from "@/lib/expressEntry";
import { getWeekStartDate } from "@/lib/weeklyReview";
import { getPgwpSnapshot } from "@/lib/pgwpSnapshot";

function getCrsAttention(score: number | null) {
  if (score === null) return { level: "UNKNOWN", message: "Save your CRS score from the calculator." };
  if (score < 450) return { level: "HIGH", message: "Needs attention: improve score factors and monitor draws." };
  if (score < 500) return { level: "MEDIUM", message: "Moderate attention: keep improving score components." };
  return { level: "LOW", message: "Good position: continue tracking rounds and keep profile updated." };
}

function ProgressDonut({ done, total }: { done: number; total: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="task-progress-donut-wrap">
      <svg className="task-progress-donut" viewBox="0 0 100 100" aria-label={`Task progress ${progress}%`}>
        <circle className="task-progress-track" cx="50" cy="50" r={radius} />
        <circle
          className="task-progress-value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="task-progress-center">
        <strong>{progress}%</strong>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { user } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();
  const snapshot = await getPgwpSnapshot(user.id);

  type WeeklyReviewRow = { viewed_at: string };
  let weeklyReview: WeeklyReviewRow | null = null;
  try {
    const { data } = await supabase
      .from("weekly_review_log")
      .select("viewed_at")
      .eq("user_id", user.id)
      .eq("week_start_date", getWeekStartDate(new Date()))
      .maybeSingle();
    weeklyReview = (data as WeeklyReviewRow | null) ?? null;
  } catch {
    weeklyReview = null;
  }
  type CrsSnapshot = { crs_score: number | null; crs_score_updated_at: string | null };
  let crsSnapshot: CrsSnapshot | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("crs_score,crs_score_updated_at")
      .eq("id", user.id)
      .maybeSingle();
    crsSnapshot = (data as CrsSnapshot | null) ?? null;
  } catch {
    crsSnapshot = null;
  }
  const crsScore = crsSnapshot?.crs_score ?? null;
  const crsAttention = getCrsAttention(crsScore);
  const lastDraw = await fetchLatestExpressEntryDraw();
  const topReasons = snapshot.derived.connected_reasons.slice(0, 2);
  const firstAction = snapshot.derived.connected_next_actions[0] ?? null;
  const missingItems = snapshot.derived.missing_items;
  const totalTasks = snapshot.tasks_summary.total;
  const doneTasks = snapshot.tasks_summary.done;
  const remainingTasks = Math.max(totalTasks - doneTasks, 0);
  const missingFieldsLabel = snapshot.profile.missing_fields.length
    ? snapshot.profile.missing_fields.map((item) => item.replaceAll("_", " ")).join(", ")
    : "None";

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Home</p>
        <h1>Welcome back</h1>
      </header>

      <article className="card hero-card stack-8">
        <div className="inline-head">
          <h3>Profile Completeness</h3>
          <span className="badge">{snapshot.profile.completeness_score}%</span>
        </div>
        <p className="muted">Missing fields: {missingFieldsLabel}</p>
        <Link href="/profile" className="btn btn-secondary">
          Complete profile
        </Link>
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>Task Progress</h3>
          <span className="badge">{doneTasks}/{totalTasks}</span>
        </div>
        {totalTasks > 0 ? (
          <div className="task-progress-grid">
            <ProgressDonut done={doneTasks} total={totalTasks} />
            <div className="stack-8">
              <p><strong>Done:</strong> {doneTasks}</p>
              <p><strong>Remaining:</strong> {remainingTasks}</p>
            </div>
          </div>
        ) : (
          <div className="task-progress-grid">
            <ProgressDonut done={0} total={0} />
            <p className="muted">No tasks yet.</p>
          </div>
        )}
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>What&apos;s Missing?</h3>
          <span className="badge">{missingItems.length}</span>
        </div>
        {missingItems.length ? (
          <div className="stack-8">
            {missingItems.map((item) => (
              <Link key={item.code} href={item.cta_route} className="weekly-item-row">
                <p className="weekly-item-title">{item.title}</p>
                <p className="small muted">{item.evidence}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">All core profile, reminder, and vault items are set.</p>
        )}
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>PGWP Risk</h3>
          <span className="badge">{snapshot.risk.level}</span>
        </div>
        <p>
          <strong>{snapshot.risk.score}</strong> / 100
        </p>
        {topReasons.length ? (
          <ul className="tips-list">
            {topReasons.map((reason) => (
              <li key={reason.code}>
                <strong>{reason.title}:</strong> {reason.evidence}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No connected reasons right now.</p>
        )}
        <p className="small muted">This is an organizational tool, not immigration advice.</p>
        <Link href="/risk" className="btn btn-secondary">
          View Risk
        </Link>
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>Next Action</h3>
          <span className="badge">{firstAction?.urgency ?? "soon"}</span>
        </div>
        <p>
          <strong>{firstAction?.title ?? "Add a new PGWP task"}</strong>
        </p>
        <p className="muted">{firstAction?.description ?? "Start with one concrete task for this week."}</p>
        <Link href={firstAction?.cta_route ?? "/tasks/new?category=pgwp"} className="btn btn-primary">
          {firstAction?.cta_label ?? "Create task"}
        </Link>
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>Weekly Review</h3>
          <span className="badge">7 days</span>
        </div>
        <p className="muted">Plan your week in 60 seconds with one best next action.</p>
        {weeklyReview?.viewed_at ? (
          <p className="small muted">Last reviewed: {formatDate(weeklyReview.viewed_at)}</p>
        ) : (
          <p className="small muted">Not reviewed yet this week.</p>
        )}
        <Link href="/weekly-review" className="btn btn-primary">
          Plan my week
        </Link>
      </article>

      <article className="card stack-8">
        <div className="inline-head">
          <h3>CRS Snapshot</h3>
          <span className="badge">{crsAttention.level}</span>
        </div>
        <p><strong>Saved score:</strong> {crsScore ?? "Not saved yet"}</p>
        <p className="muted">{crsAttention.message}</p>
        {crsSnapshot?.crs_score_updated_at ? (
          <p className="small muted">Updated {formatDate(crsSnapshot.crs_score_updated_at)}</p>
        ) : null}
        <Link href="/crs" className="btn btn-secondary">
          Open CRS calculator
        </Link>
      </article>

      <article className="card stack-8">
        <h3>Express Entry - Last draw</h3>
        {lastDraw ? (
          <>
            <p>{lastDraw.round ? `Round #${lastDraw.round}` : "Latest draw snapshot"}</p>
            {lastDraw.dateText ? <p className="muted">{lastDraw.dateText}</p> : null}
            {lastDraw.crsCutoff !== null ? <p><strong>CRS cut-off:</strong> {lastDraw.crsCutoff}</p> : null}
            {lastDraw.invitations !== null ? <p><strong>Invitations:</strong> {lastDraw.invitations}</p> : null}
          </>
        ) : (
          <p className="muted">Check the latest draw details on the official Canada.ca page.</p>
        )}
        <a href={CRS_OFFICIAL_SOURCES.rounds} target="_blank" rel="noreferrer" className="btn btn-secondary">
          Official Canada.ca draw page
        </a>
      </article>
    </div>
  );
}
