import { ChecklistClient } from "@/components/ChecklistClient";
import { requireCompletedProfile } from "@/lib/auth";

const items = [
  { id: "pgwp-1", title: "Confirm graduation documents", description: "Secure transcript and completion letter." },
  { id: "pgwp-2", title: "Check application window", description: "Apply within the PGWP time window after completion." },
  { id: "pgwp-3", title: "Review official PGWP rules", description: "Verify program and institution eligibility.", href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/about.html" },
  { id: "pgwp-4", title: "Prepare digital copy package", description: "Passport, photos, forms, and fees ready." },
  { id: "pgwp-5", title: "Submit and monitor account", description: "Track updates and provide extra documents quickly." },
];

export default async function PgwpPage() {
  const { profile } = await requireCompletedProfile();

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Checklist</p>
        <h1>PGWP</h1>
      </header>
      <ChecklistClient storageKey="paperpath-pgwp" items={items} unlockedCount={2} isPro={profile.pro} />
    </div>
  );
}
