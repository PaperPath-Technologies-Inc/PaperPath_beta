import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getPgwpSnapshot } from "@/lib/pgwpSnapshot";

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
  const snapshot = await getPgwpSnapshot(user.id);
  const totalTasks = snapshot.tasks_summary.total;
  const doneTasks = snapshot.tasks_summary.done;
  const remainingTasks = Math.max(totalTasks - doneTasks, 0);
  const overdueTasks = snapshot.tasks_summary.overdue_count;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
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
        <div
          className="stack-12"
          style={{
            border: "1px solid rgba(130, 160, 220, 0.22)",
            borderRadius: "16px",
            padding: "16px",
            background:
              "radial-gradient(circle at 30% 20%, rgba(84, 123, 197, 0.18), transparent 58%), linear-gradient(145deg, rgba(9, 21, 47, 0.78), rgba(8, 15, 33, 0.72))",
          }}
        >
          <div className="task-progress-grid" style={{ alignItems: "center", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ProgressDonut done={doneTasks} total={totalTasks} />
            </div>
            <div className="stack-8" style={{ minWidth: 0 }}>
              <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }}>
                <strong>{progressPercent}%</strong> complete
              </p>
              <div className="stack-8">
                <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span aria-hidden style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#78d6ba" }} />
                    Done
                  </span>
                  <strong>{doneTasks}</strong>
                </p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span aria-hidden style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#7cc6ef" }} />
                    Remaining
                  </span>
                  <strong>{remainingTasks}</strong>
                </p>
                <p style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span aria-hidden style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#d09a72" }} />
                    Overdue
                  </span>
                  <strong>{overdueTasks}</strong>
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    borderTop: "1px solid rgba(130, 160, 220, 0.2)",
                    paddingTop: "8px",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span aria-hidden style={{ width: "10px", height: "10px", borderRadius: "999px", background: "#6f82ac" }} />
                    Total
                  </span>
                  <strong>{totalTasks}</strong>
                </p>
              </div>
            </div>
          </div>
          <div className="stack-8">
            <p className="small"><strong>By category</strong></p>
            <p className="small muted">Category breakdown coming soon.</p>
          </div>
        </div>
      </article>
    </div>
  );
}
