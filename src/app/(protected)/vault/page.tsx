import { requireCompletedProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_MAX_DOCUMENTS } from "@/lib/limits";
import { VaultUploader } from "@/components/VaultUploader";
import { VaultDocumentsList } from "@/components/VaultDocumentsList";
import { getPgwpSnapshot } from "@/lib/pgwpSnapshot";

export default async function VaultPage() {
  const { user, profile } = await requireCompletedProfile();
  const supabase = createSupabaseServerClient();
  const snapshot = await getPgwpSnapshot(user.id);

  const { data: docs } = await supabase
    .from("documents")
    .select("id,filename,storage_path,doc_type,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const existingCount = docs?.length ?? 0;
  const requiredChecklist = snapshot.vault_checklist.filter((item) => item.required);
  const completedRequired = requiredChecklist.filter((item) => item.uploaded).length;
  const completionPercent = requiredChecklist.length
    ? Math.round((completedRequired / requiredChecklist.length) * 100)
    : 0;
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (doc) => {
      const { data } = await supabase.storage.from("vault").createSignedUrl(doc.storage_path, 60 * 60);
      return { ...doc, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Vault</p>
        <h1>Document Vault</h1>
      </header>

      <article className="card">
        <VaultUploader isPro={profile.pro} existingCount={existingCount} />
      </article>

      <article className="card stack-12">
        <div className="inline-head">
          <h3>Vault checklist</h3>
          {profile.pro ? <span className="badge">{completionPercent}% complete</span> : null}
        </div>
        <p className="muted">Keep your most important records organized in one place.</p>
        <div className="stack-8">
          {snapshot.vault_checklist.map((item) => (
            <div className="vault-checklist-row" key={item.doc_type}>
              <div>
                <p className="vault-checklist-title">
                  {item.uploaded ? "✓ " : ""}{item.label}
                </p>
                <p className="small muted">{item.hint}</p>
              </div>
              {!item.uploaded ? (
                <a href="#vault-upload" className="btn btn-secondary small">
                  Upload
                </a>
              ) : (
                <span className="badge">Added</span>
              )}
            </div>
          ))}
        </div>
        {profile.pro ? (
          <div className="card stack-8">
            <h4>Pro insight</h4>
            <p className="small muted">
              Completing the checklist early makes weekly reviews easier and keeps risk evidence cleaner.
            </p>
          </div>
        ) : null}
      </article>

      <VaultDocumentsList docs={docsWithUrls} />

      {!profile.pro && (
        <p className="hint">
          Free plan: {existingCount}/{FREE_MAX_DOCUMENTS} vault documents used. Pro plan includes unlimited documents.
        </p>
      )}
    </div>
  );
}
