import { CheckoutButton } from "@/components/CheckoutButton";
import { requireCompletedProfile } from "@/lib/auth";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const { profile } = await requireCompletedProfile();

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Subscription</p>
        <h1>PaperPath Pro</h1>
      </header>

      {searchParams.success ? <p className="success">Payment received. Pro will unlock in a moment.</p> : null}
      {searchParams.canceled ? <p className="hint">Checkout canceled.</p> : null}

      <article className="card stack-8">
        <h3>What Pro includes</h3>
        <p>AI Risk page, full checklists, unlimited reminders/documents/notifications.</p>
        <p>{profile.pro ? "Your effective plan is Pro." : "Your effective plan is Free."}</p>
        <p className="small muted">
          You can also see limits on the <a href="/pricing" className="text-link">pricing page</a>.
        </p>
      </article>

      {!profile.pro ? <CheckoutButton /> : null}
    </div>
  );
}
