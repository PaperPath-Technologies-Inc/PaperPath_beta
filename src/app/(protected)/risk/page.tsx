import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCompletedProfile, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/plan.server";
import { getPgwpSnapshot, recalculatePgwp } from "@/lib/pgwpSnapshot";

async function recalculateNow() {
  "use server";
  const user = await requireUser();
  await recalculatePgwp(user.id).catch(() => null);
  redirect("/risk?recalculated=1");
}

export default async function RiskPage({
  searchParams,
}: {
  searchParams?: { days?: string };
}) {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();
  const snapshot = await getPgwpSnapshot(user.id);
  const limits = getPlanLimits(snapshot.plan);
  const maxHistoryDays = limits.riskHistoryDays;
  const rawDays = Number(searchParams?.days ?? "14");
  const requestedDays = [7, 14, 30, 90].includes(rawDays) ? rawDays : 14;
  const effectiveDays = Math.min(requestedDays, maxHistoryDays);
  const { data: historyRows } = await supabase
    .from("pgwp_risk_history")
    .select("day,risk_score,created_at")
    .eq("user_id", user.id)
    .order("day", { ascending: false })
    .limit(effectiveDays);

  const trendData = (historyRows ?? []).slice().reverse();
  const hasEnoughTrend = trendData.length >= 2;
  const firstScore = hasEnoughTrend ? trendData[0]?.risk_score ?? null : null;
  const lastScore = hasEnoughTrend ? trendData[trendData.length - 1]?.risk_score ?? null : null;
  const trendDelta = firstScore !== null && lastScore !== null ? lastScore - firstScore : null;
  const trendText =
    trendDelta === null
      ? "Not enough history yet"
      : trendDelta === 0
        ? `${effectiveDays}-day trend: 0`
        : `${effectiveDays}-day trend: ${trendDelta > 0 ? "+" : ""}${trendDelta}`;
  const lastTrendDate = trendData[trendData.length - 1]?.day ?? null;
  const sparkValues = trendData.map((row) => row.risk_score);
  const sparkWidth = 220;
  const sparkHeight = 58;
  const sparkPath =
    sparkValues.length >= 2
      ? sparkValues
          .map((value, idx) => {
            const x = (idx / (sparkValues.length - 1)) * sparkWidth;
            const y = sparkHeight - (Math.max(0, Math.min(100, value)) / 100) * sparkHeight;
            return `${idx === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
          })
          .join(" ")
      : "";
  const riskLevel = snapshot.risk.level;
  const riskScore = snapshot.risk.score;
  const reasons = snapshot.derived.connected_reasons;
  const nextActions = snapshot.derived.connected_next_actions;
  const missingItems = snapshot.derived.missing_items;
  const permitText =
    snapshot.countdowns.permit_days_left === null
      ? "Not set"
      : snapshot.countdowns.permit_days_left >= 0
        ? `${snapshot.countdowns.permit_days_left} days left`
        : `expired ${Math.abs(snapshot.countdowns.permit_days_left)} days ago`;
  const programText =
    snapshot.countdowns.program_days_to_end === null
      ? "Not set"
      : snapshot.countdowns.program_days_to_end >= 0
        ? `ends in ${snapshot.countdowns.program_days_to_end} days`
        : `ended ${Math.abs(snapshot.countdowns.program_days_to_end)} days ago`;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">PGWP Risk</p>
        <h1>Risk overview</h1>
      </header>

      <article className="card stack-12">
        <div className="inline-head">
          <h3>Score</h3>
          <span className="badge">{riskLevel}</span>
        </div>
        <form action={recalculateNow}>
          <button type="submit" className="btn btn-secondary small">
            Recalculate now
          </button>
        </form>
        <div style={{ width: "100%", height: 12, borderRadius: 999, background: "var(--surface-strong)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.max(0, Math.min(100, riskScore))}%`,
              height: "100%",
              background: "linear-gradient(140deg, var(--accent), var(--accent-2))",
            }}
          />
        </div>
        <p><strong>{riskScore}</strong> / 100</p>
      </article>

      <article className="card stack-8">
        <h3>Key countdowns</h3>
        <p><strong>Permit:</strong> {permitText}</p>
        <p><strong>Program:</strong> {programText}</p>
      </article>

      <article className="card stack-8">
        <h3>Trend</h3>
        <div className="button-row">
          <Link href="/risk?days=7" className="btn btn-secondary small">7d</Link>
          <Link href="/risk?days=14" className="btn btn-secondary small">14d</Link>
          <Link href="/risk?days=30" className="btn btn-secondary small">30d</Link>
          <Link href="/risk?days=90" className="btn btn-secondary small">90d</Link>
        </div>
        {!profile.pro && requestedDays > maxHistoryDays ? (
          <div className="card stack-8">
            <p className="muted">Free plan includes 7-day risk history.</p>
            <Link href="/pricing" className="btn btn-primary small">
              Upgrade to Pro
            </Link>
          </div>
        ) : null}
        {hasEnoughTrend ? (
          <>
            <svg viewBox={`0 0 ${sparkWidth} ${sparkHeight}`} width="100%" height="58" role="img" aria-label="Risk score trend">
              <rect x="0" y="0" width={sparkWidth} height={sparkHeight} rx="10" fill="var(--surface-strong)" />
              <path d={sparkPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <p>
              <strong>{trendText}</strong>
            </p>
            <p className="small muted">Last updated: {lastTrendDate ?? "N/A"}</p>
          </>
        ) : (
          <p className="muted">Not enough history yet.</p>
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
          <p className="muted">No missing profile, reminder, or vault items right now.</p>
        )}
      </article>

      <article className="card stack-8">
        <h3>Reasons</h3>
        {reasons.length ? (
          <ul className="tips-list">
            {reasons.map((reason) => (
              <li key={`${reason.code}-${reason.cta_route}`}>
                <strong>{reason.title}:</strong> {reason.explanation} ({reason.evidence})
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No reasons available yet.</p>
        )}
      </article>

      <article className="card stack-8">
        <h3>Next actions</h3>
        {nextActions.length ? (
          <div className="stack-8">
            {nextActions.map((action) => (
              <Link key={`${action.title}-${action.cta_route}`} href={action.cta_route} className="btn btn-secondary">
                {action.title} ({action.urgency})
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">No actions available yet.</p>
        )}
        <p className="small muted">This is an organizational tool, not immigration advice.</p>
      </article>
    </div>
  );
}
