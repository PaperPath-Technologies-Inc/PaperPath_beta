"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const OFFICIAL_LINKS = {
  mainGuide:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit.html",
  howToApply:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit/how-to-apply.html",
  whenToApply:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit/when-to-apply.html",
  expired:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/extend-study-permit/permit-expired.html",
  processingTimes:
    "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html",
};

type PlanItem = {
  id: string;
  label: string;
};

type PlanGroup = {
  phase: string;
  items: PlanItem[];
};

type DbErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const PLAN_GROUPS: PlanGroup[] = [
  {
    phase: "90 days before expiry",
    items: [
      { id: "d90-expiry", label: "Confirm your exact permit expiry date in PaperPath profile." },
      { id: "d90-eligibility", label: "Review extension eligibility in the official guide." },
      { id: "d90-school", label: "Gather school documents (enrollment letter, transcript if available)." },
    ],
  },
  {
    phase: "60 days before expiry",
    items: [
      { id: "d60-draft", label: "Start your online application draft." },
      { id: "d60-prompts", label: "Watch for biometrics and fee prompts in your account." },
    ],
  },
  {
    phase: "30 days before expiry",
    items: [
      { id: "d30-submit", label: "Submit online before expiry." },
      { id: "d30-proof", label: "Save confirmation/proof of submission immediately." },
      { id: "d30-monitor", label: "Monitor your account and keep copies in your vault folder." },
    ],
  },
];

export default function StudyPermitPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [taskIdsByPlanId, setTaskIdsByPlanId] = useState<Record<string, string>>({});
  const [dueAtByPlanId, setDueAtByPlanId] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const formatDbError = (err: DbErrorLike | null | undefined, fallback: string) => {
    if (!err) return fallback;
    const parts = [err.message, err.details, err.hint, err.code].filter(Boolean);
    if (!parts.length) return fallback;
    return `${fallback} (${parts.join(" | ")})`;
  };

  const flatItems = useMemo(
    () => PLAN_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, phase: group.phase }))),
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      setLoading(true);
      setSaveError(null);

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? null;

      if (!uid) {
        if (mounted) {
          setSaveError("Could not load your account.");
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setUserId(uid);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("expiry_date,study_permit_expiry_date")
        .eq("id", uid)
        .maybeSingle();

      const permitExpiry = profileData?.study_permit_expiry_date ?? profileData?.expiry_date ?? null;
      const expiryDate = permitExpiry ? new Date(`${permitExpiry}T12:00:00`) : null;

      const dueDateByItemId: Record<string, string | null> = {};
      const dueAtMap: Record<string, string> = {};
      for (const item of flatItems) {
        const phaseDays = item.id.startsWith("d90-") ? 90 : item.id.startsWith("d60-") ? 60 : 30;
        if (!expiryDate) {
          dueDateByItemId[item.id] = null;
          const fallback = new Date();
          fallback.setDate(fallback.getDate() + 1);
          dueAtMap[item.id] = fallback.toISOString();
          continue;
        }
        const due = new Date(expiryDate);
        due.setDate(due.getDate() - phaseDays);
        dueDateByItemId[item.id] = due.toISOString().slice(0, 10);
        dueAtMap[item.id] = `${dueDateByItemId[item.id]}T12:00:00.000Z`;
      }
      if (mounted) setDueAtByPlanId(dueAtMap);

      const { data: existing, error: existingError } = await supabase
        .from("reminders")
        .select("id,title,is_done,notes")
        .eq("user_id", uid)
        .eq("category", "study_permit_extension_plan");

      if (existingError) {
        if (mounted) {
          setSaveError("Could not load your saved 90/60/30 plan.");
          setLoading(false);
        }
        return;
      }

      const rows = existing ?? [];
      if (rows.length === 0) {
        const seed = flatItems.map((item) => ({
          user_id: uid,
          title: item.label,
          category: "study_permit_extension_plan",
          is_done: false,
          due_at: dueAtMap[item.id] ?? new Date().toISOString(),
          notes: `plan_item:${item.id}`,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("reminders")
          .insert(seed)
          .select("id,title,is_done,notes");

        if (insertError) {
          if (mounted) {
            setSaveError(formatDbError(insertError, "Could not save your 90/60/30 plan"));
            setLoading(false);
          }
          return;
        }

        const nextChecked: Record<string, boolean> = {};
        const nextIds: Record<string, string> = {};
        for (const row of inserted ?? []) {
          const tagged = row.notes?.startsWith("plan_item:") ? row.notes.replace("plan_item:", "") : null;
          const itemId = tagged ?? flatItems.find((item) => item.label === row.title)?.id;
          if (!itemId) continue;
          nextChecked[itemId] = !!row.is_done;
          nextIds[itemId] = row.id;
        }
        if (mounted) {
          setChecked(nextChecked);
          setTaskIdsByPlanId(nextIds);
          setLoading(false);
        }
        return;
      }

      const nextChecked: Record<string, boolean> = {};
      const nextIds: Record<string, string> = {};

      for (const row of rows) {
        const tagged = row.notes?.startsWith("plan_item:") ? row.notes.replace("plan_item:", "") : null;
        const itemId = tagged ?? flatItems.find((item) => item.label === row.title)?.id;
        if (!itemId) continue;
        nextChecked[itemId] = !!row.is_done;
        nextIds[itemId] = row.id;
      }

      if (mounted) {
        setChecked(nextChecked);
        setTaskIdsByPlanId(nextIds);
        setLoading(false);
      }
    }

    void loadPlan();
    return () => {
      mounted = false;
    };
  }, [flatItems, supabase]);

  const toggleCheck = async (planId: string, label: string) => {
    if (!userId) return;
    setSaveError(null);
    setSaveNote(null);

    const nextDone = !checked[planId];
    setChecked((prev) => ({ ...prev, [planId]: nextDone }));

    const existingTaskId = taskIdsByPlanId[planId];
    if (existingTaskId) {
      const { error } = await supabase
        .from("reminders")
        .update({ is_done: nextDone, updated_at: new Date().toISOString() })
        .eq("id", existingTaskId)
        .eq("user_id", userId);

      if (error) {
        setChecked((prev) => ({ ...prev, [planId]: !nextDone }));
        setSaveError(formatDbError(error, "Could not save this checklist item"));
        return;
      }

      setSaveNote("Saved.");
      return;
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert({
        user_id: userId,
        title: label,
        category: "study_permit_extension_plan",
        is_done: nextDone,
        due_at: dueAtByPlanId[planId] ?? new Date().toISOString(),
        notes: `plan_item:${planId}`,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      setChecked((prev) => ({ ...prev, [planId]: !nextDone }));
      setSaveError(formatDbError(error, "Could not save this checklist item"));
      return;
    }

    setTaskIdsByPlanId((prev) => ({ ...prev, [planId]: data.id }));
    setSaveNote("Saved.");
  };

  return (
    <div className="pp-page stack-16">
      <header className="stack-8">
        <p className="eyebrow">Study Permit</p>
        <h1 className="pp-title">Study Permit Extension</h1>
        <p className="pp-subtitle muted">Organizational checklist + official links (not legal advice).</p>
        <div className="pp-warn card" role="note" aria-label="Disclaimer">
          <p>
            PaperPath Technologies provides organizational tools only, not legal or immigration advice. Always verify requirements
            directly on Canada.ca.
          </p>
        </div>
      </header>

      <section className="pp-card card stack-12" aria-labelledby="fast-actions-title">
        <h2 id="fast-actions-title">Fast actions</h2>
        <div className="stack-8">
          <Link href="/reminders/create" className="pp-btn pp-btn-primary btn btn-primary">
            Create 90/60/30 reminders
          </Link>
          <Link href="/profile" className="pp-btn pp-btn-ghost btn btn-secondary">
            Update profile (expiry date)
          </Link>
          <Link href="/vault" className="pp-btn pp-btn-ghost btn btn-secondary">
            Open Documents Vault
          </Link>
        </div>
      </section>

      <section className="pp-card pp-card-soft card stack-12" aria-labelledby="plan-title">
        <h2 id="plan-title">90/60/30 Day Plan</h2>
        {loading ? <p className="muted">Loading your saved plan...</p> : null}
        {saveError ? <p className="error">{saveError}</p> : null}
        {!saveError && saveNote ? <p className="success">{saveNote}</p> : null}
        {PLAN_GROUPS.map((group, groupIndex) => (
          <div key={group.phase} className="stack-8">
            <p className="pp-pill pp-pill-primary badge" style={{ width: "fit-content" }}>
              {group.phase}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
              {group.items.map((item) => {
                const inputId = `check-${item.id}`;
                return (
                  <li key={item.id}>
                    <label
                      htmlFor={inputId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.25rem 1fr",
                        gap: "0.6rem",
                        alignItems: "start",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => void toggleCheck(item.id, item.label)}
                        disabled={loading}
                        aria-label={item.label}
                        style={{ marginTop: "0.2rem", width: "1.1rem", height: "1.1rem" }}
                      />
                      <span style={{ textDecoration: checked[item.id] ? "line-through" : "none" }}>{item.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {groupIndex < PLAN_GROUPS.length - 1 ? <hr className="pp-divider" /> : null}
          </div>
        ))}
        <p className="hint">
          Apply before expiry whenever possible. Follow the official{" "}
          <a href={OFFICIAL_LINKS.howToApply} target="_blank" rel="noreferrer" className="text-link">
            How to apply
          </a>{" "}
          steps.
        </p>
      </section>

      <section className="pp-card card stack-12" aria-labelledby="docs-title">
        <h2 id="docs-title">Required docs (typical)</h2>
        <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "grid", gap: "0.45rem" }}>
          <li>Passport (photo page + stamps/expiry)</li>
          <li>Current study permit (copy)</li>
          <li>Proof of enrollment / letter of enrollment</li>
          <li>Transcripts (if available)</li>
          <li>Proof of funds (as applicable)</li>
          <li>Digital photo (if asked)</li>
          <li>Optional supporting letter (if needed)</li>
        </ul>
        <p className="hint">
          Always verify in the IRCC checklist for your case:{" "}
          <a href={OFFICIAL_LINKS.howToApply} target="_blank" rel="noreferrer" className="text-link">
            How to apply
          </a>
          .
        </p>
      </section>

      <section className="pp-card card pp-warn stack-12" aria-labelledby="expired-title">
        <h2 id="expired-title">If your permit expired</h2>
        <p>
          Expired situations are time-sensitive and rules vary by case. Check official guidance immediately and do not
          rely on assumptions.
        </p>
        <div className="stack-8">
          <a href={OFFICIAL_LINKS.expired} target="_blank" rel="noreferrer" className="pp-btn pp-btn-primary btn btn-primary">
            Official: If your permit expired
          </a>
          <Link href="/reminders/create" className="pp-btn pp-btn-ghost btn btn-secondary">
            Create urgent reminder
          </Link>
        </div>
      </section>

      <section className="pp-card card stack-12" aria-labelledby="official-title">
        <h2 id="official-title">Official links</h2>
        <div className="stack-8">
          <div className="inline-head" style={{ alignItems: "center" }}>
            <span className="pp-pill badge">Main guide</span>
            <a href={OFFICIAL_LINKS.mainGuide} target="_blank" rel="noreferrer" className="pp-pill pp-pill-primary text-link">
              Open ↗
            </a>
          </div>
          <div className="inline-head" style={{ alignItems: "center" }}>
            <span className="pp-pill badge">How to apply</span>
            <a href={OFFICIAL_LINKS.howToApply} target="_blank" rel="noreferrer" className="pp-pill pp-pill-primary text-link">
              Open ↗
            </a>
          </div>
          <div className="inline-head" style={{ alignItems: "center" }}>
            <span className="pp-pill badge">When to apply</span>
            <a href={OFFICIAL_LINKS.whenToApply} target="_blank" rel="noreferrer" className="pp-pill pp-pill-primary text-link">
              Open ↗
            </a>
          </div>
          <div className="inline-head" style={{ alignItems: "center" }}>
            <span className="pp-pill badge">Processing times</span>
            <a
              href={OFFICIAL_LINKS.processingTimes}
              target="_blank"
              rel="noreferrer"
              className="pp-pill pp-pill-primary text-link"
            >
              Open ↗
            </a>
          </div>
        </div>
      </section>

      <section className="pp-card card stack-12" aria-labelledby="mistakes-title">
        <h2 id="mistakes-title">Common mistakes to avoid</h2>
        <ul style={{ margin: 0, paddingLeft: "1.15rem", display: "grid", gap: "0.45rem" }}>
          <li>Forgetting to save confirmation after submission.</li>
          <li>Waiting until the last week to prepare documents.</li>
          <li>Not keeping copies organized in one folder (use Vault).</li>
          <li>Missing expiry date updates in profile and reminders.</li>
        </ul>
      </section>
    </div>
  );
}
