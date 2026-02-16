import Link from "next/link";
import { requireCompletedProfile } from "@/lib/auth";
import { getPlanLimits } from "@/lib/plan.server";

export default async function PricingPage() {
  const { profile } = await requireCompletedProfile();
  const free = getPlanLimits("free");
  const pro = getPlanLimits("pro");

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Pricing</p>
        <h1>Free vs Pro</h1>
        <p className="muted">Students + PGWP organization only. Not legal advice.</p>
      </header>

      <section className="landing-pricing-grid">
        <article className="card stack-8">
          <div className="inline-head">
            <h3>Free</h3>
            <span className="badge">$0</span>
          </div>
          <p>PGWP Risk + Weekly Review included</p>
          <p>Risk History: {free.riskHistoryDays} days</p>
          <p>Active PGWP tasks: {free.maxActiveTasks}</p>
          <p>Active reminders: {free.maxActiveReminders}</p>
          <p>Vault documents: {free.maxDocuments}</p>
        </article>

        <article className="card stack-8">
          <div className="inline-head">
            <h3>Pro</h3>
            <span className="badge">CAD 6.99/mo</span>
          </div>
          <p>Everything in Free, plus:</p>
          <p>Risk History: up to {pro.riskHistoryDays} days</p>
          <p>Unlimited PGWP tasks</p>
          <p>Unlimited reminders</p>
          <p>Unlimited vault documents</p>
          {profile.pro ? (
            <p className="success">Your effective plan is Pro.</p>
          ) : (
            <Link href="/subscription" className="btn btn-primary">
              Upgrade (Placeholder)
            </Link>
          )}
        </article>
      </section>
    </div>
  );
}
