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
    </div>
  );
}
