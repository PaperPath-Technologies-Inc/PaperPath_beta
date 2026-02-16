"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { FREE_MAX_REMINDERS } from "@/lib/limits";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { SuggestedReminder } from "@/lib/suggestedReminders";

type ReminderItem = {
  id: string;
  title: string;
  category: string;
  due_at: string;
  is_done: boolean;
};

type ReminderTab = "upcoming" | "overdue" | "done";

export function RemindersDashboard({
  reminders,
  status,
  pro,
  suggestedReminders,
  remindersCoverage,
}: {
  reminders: ReminderItem[];
  status: "student" | "pgwp" | null;
  pro: boolean;
  suggestedReminders: SuggestedReminder[];
  remindersCoverage: { has_permit_series: boolean; has_program_series: boolean };
}) {
  const router = useRouter();
  const [items, setItems] = useState(reminders);
  const [activeTab, setActiveTab] = useState<ReminderTab>("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [suggestedBusy, setSuggestedBusy] = useState(false);
  const [suggestedMessage, setSuggestedMessage] = useState<string | null>(null);

  const { overdue, upcoming, done, activeCount } = useMemo(() => {
    const now = new Date();
    const overdueItems = items.filter((item) => !item.is_done && new Date(item.due_at) < now);
    const upcomingItems = items.filter((item) => !item.is_done && new Date(item.due_at) >= now);
    const doneItems = items.filter((item) => item.is_done);
    const count = items.filter((item) => !item.is_done).length;

    return {
      overdue: overdueItems,
      upcoming: upcomingItems,
      done: doneItems,
      activeCount: count,
    };
  }, [items]);

  const visibleReminders = activeTab === "overdue" ? overdue : activeTab === "done" ? done : upcoming;

  const canCreate = pro || activeCount < FREE_MAX_REMINDERS;
  const createHref = canCreate ? "/reminders/create" : "#";
  const createText = canCreate ? "Add Reminder" : "Upgrade for unlimited reminders";
  const statusLabel = status === "student" ? "Student profile" : status === "pgwp" ? "PGWP profile" : "Profile";

  async function toggleDone(item: ReminderItem) {
    setBusyId(item.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/reminders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: !item.is_done }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
          upgrade?: boolean;
        };
        if (payload.code === "PLAN_LIMIT" || payload.upgrade) {
          setActionError(payload.message ?? "Upgrade to Pro to continue.");
          setShowUpgrade(true);
        } else {
          setActionError("Could not update reminder.");
        }
        return;
      }

      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_done: !entry.is_done } : entry)),
      );
      router.refresh();
    } catch {
      setActionError("Could not update reminder.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReminder(item: ReminderItem) {
    const ok = window.confirm(`Delete reminder: "${item.title}"?`);
    if (!ok) return;

    setBusyId(item.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/reminders/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setActionError("Could not delete reminder.");
        return;
      }

      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      router.refresh();
    } catch {
      setActionError("Could not delete reminder.");
    } finally {
      setBusyId(null);
    }
  }

  async function enableAllRecommended() {
    if (!pro) {
      setShowUpgrade(true);
      return;
    }

    setSuggestedBusy(true);
    setSuggestedMessage(null);
    try {
      const response = await fetch("/api/reminders/recommended-enable", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        created?: number;
        code?: string;
        message?: string;
        upgrade?: boolean;
      };
      if (!response.ok) {
        if (payload.code === "PLAN_LIMIT" || payload.upgrade) {
          setSuggestedMessage(payload.message ?? "Upgrade to Pro to enable all recommended reminders.");
          setShowUpgrade(true);
        } else {
          setSuggestedMessage("Could not enable recommended reminders.");
        }
        return;
      }
      setSuggestedMessage(`Enabled ${payload.created ?? 0} recommended reminder(s).`);
      router.refresh();
    } catch {
      setSuggestedMessage("Could not enable recommended reminders.");
    } finally {
      setSuggestedBusy(false);
    }
  }

  return (
    <>
      <header className="stack-8">
        <div>
          <p className="eyebrow">Deadlines</p>
          <h1>Reminders</h1>
          <p className="muted">{statusLabel}</p>
        </div>
      </header>

      <Link
        href={createHref}
        className="reminders-add-card"
        onClick={(event) => {
          if (!canCreate) {
            event.preventDefault();
            setShowUpgrade(true);
          }
        }}
      >
        <div className="reminders-add-icon" aria-hidden>
          +
        </div>
        <div>
          <h3>{canCreate ? createText : `🔒 ${createText}`}</h3>
          <p>{pro ? "Pro plan: unlimited reminders." : `Free plan: ${FREE_MAX_REMINDERS} active reminders.`}</p>
        </div>
        <span className="reminders-add-arrow" aria-hidden>
          ›
        </span>
      </Link>

      <section className="reminders-stats-grid">
        <article className="reminders-stat-card overdue">
          <p className="reminders-stat-value">{overdue.length}</p>
          <p className="reminders-stat-label">Overdue</p>
        </article>
        <article className="reminders-stat-card upcoming">
          <p className="reminders-stat-value">{upcoming.length}</p>
          <p className="reminders-stat-label">Upcoming</p>
        </article>
        <article className="reminders-stat-card done">
          <p className="reminders-stat-value">{done.length}</p>
          <p className="reminders-stat-label">Done</p>
        </article>
      </section>

      <article className="card stack-12">
        <div className="inline-head">
          <h3>Suggested Reminders</h3>
          <span className="badge">
            {remindersCoverage.has_permit_series && remindersCoverage.has_program_series ? "Covered" : "Needs setup"}
          </span>
        </div>
        <p className="muted">Most people forget to set reminders early — this keeps you on track.</p>
        {suggestedReminders.length ? (
          <div className="stack-8">
            {suggestedReminders.slice(0, 8).map((item) => (
              <div key={item.reminder_type} className="inline-head" style={{ alignItems: "center" }}>
                <div>
                  <p className="weekly-item-title">{item.title}</p>
                  <p className="small muted">{new Date(item.run_at).toLocaleDateString()}</p>
                </div>
                <span className="tag">{item.related_date_type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">All recommended reminders are already enabled.</p>
        )}
        {suggestedMessage ? <p className={suggestedMessage.startsWith("Enabled") ? "success" : "error"}>{suggestedMessage}</p> : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={enableAllRecommended}
          disabled={suggestedBusy || suggestedReminders.length === 0}
        >
          {pro ? "Enable all recommended" : "🔒 Enable all recommended (Pro)"}
        </button>
      </article>

      <nav className="reminders-tabs" aria-label="Reminder sections">
        <button
          type="button"
          className={activeTab === "upcoming" ? "reminders-tab active" : "reminders-tab"}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming
        </button>
        <button
          type="button"
          className={activeTab === "overdue" ? "reminders-tab active" : "reminders-tab"}
          onClick={() => setActiveTab("overdue")}
        >
          Overdue
          {overdue.length > 0 && <span className="reminders-badge">{overdue.length}</span>}
        </button>
        <button
          type="button"
          className={activeTab === "done" ? "reminders-tab active" : "reminders-tab"}
          onClick={() => setActiveTab("done")}
        >
          Done
        </button>
      </nav>

      <div className="stack-12">
        {actionError && <p className="error">{actionError}</p>}
        {visibleReminders.length ? (
          visibleReminders.map((item) => (
            <article className="card" key={item.id}>
              <div className="inline-head">
                <h3>{item.title}</h3>
                <span className={item.is_done ? "tag done" : "tag"}>{item.is_done ? "Done" : "Open"}</span>
              </div>
              <p className="muted">{item.category}</p>
              <p>Due: {formatDate(item.due_at)}</p>
              <div className="reminder-card-actions">
                <button
                  type="button"
                  className="btn btn-secondary small"
                  onClick={() => toggleDone(item)}
                  disabled={busyId === item.id}
                >
                  {item.is_done ? "Mark open" : "Mark done"}
                </button>
                <Link href={`/reminders/${item.id}/edit`} className="btn btn-secondary small">
                  Edit reminder
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary small reminder-delete-btn"
                  onClick={() => deleteReminder(item)}
                  disabled={busyId === item.id}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="card stack-8" style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <p className="muted" style={{ fontSize: "2rem", lineHeight: 1 }} aria-hidden>
              🔔
            </p>
            <h3>No {activeTab} reminders</h3>
            <p className="muted">
              {activeTab === "done"
                ? "Completed reminders will appear here."
                : "Add your next reminder to stay organized."}
            </p>
          </article>
        )}
      </div>

      {!pro && (
        <p className="hint">
          Free plan: {activeCount}/{FREE_MAX_REMINDERS} active reminders used. Pro plan includes unlimited reminders.
        </p>
      )}
      <UpgradeModal open={showUpgrade} feature="reminders" onClose={() => setShowUpgrade(false)} />
    </>
  );
}
