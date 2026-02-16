"use client";

type FeatureType = "tasks" | "reminders" | "vault" | "history";

const FEATURE_BULLETS: Record<FeatureType, string[]> = {
  tasks: ["Unlimited active PGWP tasks", "Keep full long-term task plans", "No task cap interruptions"],
  reminders: ["Unlimited active reminders", "Never block new reminder creation", "Better weekly planning flow"],
  vault: ["Unlimited vault documents", "Upload without free-tier caps", "Keep all files in one place"],
  history: ["View up to 90 days risk history", "Use 7/14/30/90 day filters", "See stronger trend visibility"],
};

const FEATURE_TITLE: Record<FeatureType, string> = {
  tasks: "Unlock Pro for Tasks",
  reminders: "Unlock Pro for Reminders",
  vault: "Unlock Pro for Vault",
  history: "Unlock Pro for Risk History",
};

export function UpgradeModal({
  open,
  feature,
  onClose,
}: {
  open: boolean;
  feature: FeatureType;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="upgrade-modal-root" role="dialog" aria-modal="true" aria-label="Unlock Pro">
      <button type="button" className="upgrade-modal-overlay" onClick={onClose} aria-label="Close upgrade modal" />
      <article className="upgrade-modal-card card stack-12">
        <h3>{FEATURE_TITLE[feature]}</h3>
        <p className="muted">Unlock Pro</p>
        <ul className="tips-list">
          {FEATURE_BULLETS[feature].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="button-row">
          <a href="/pricing" className="btn btn-primary">
            Upgrade
          </a>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Not now
          </button>
        </div>
      </article>
    </div>
  );
}

