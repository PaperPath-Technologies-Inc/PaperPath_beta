"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VAULT_DOC_TYPE_LABELS, normalizeVaultDocType } from "@/lib/vault";

type VaultDoc = {
  id: string;
  filename: string;
  storage_path: string;
  doc_type: string | null;
  created_at: string;
  url: string | null;
};

export function VaultDocumentsList({ docs }: { docs: VaultDoc[] }) {
  const router = useRouter();
  const [items, setItems] = useState(docs);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeDoc(doc: VaultDoc) {
    const ok = window.confirm(`Delete document: "${doc.filename}"?`);
    if (!ok) return;

    setBusyId(doc.id);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError("Could not delete document.");
        return;
      }
      setItems((prev) => prev.filter((entry) => entry.id !== doc.id));
      router.refresh();
    } catch {
      setError("Could not delete document.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="stack-12">
      {error && <p className="error">{error}</p>}
      {items.length ? (
        items.map((doc) => (
          <article className="card" key={doc.id}>
            <h3>{doc.filename}</h3>
            <p className="small muted">Type: {VAULT_DOC_TYPE_LABELS[normalizeVaultDocType(doc.doc_type)]}</p>
            <p className="mono">{doc.storage_path}</p>
            <div className="vault-card-actions">
              {doc.url ? (
                <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-secondary small">
                  Open file
                </a>
              ) : (
                <span className="muted small">Open link unavailable</span>
              )}
              <Link href={`/vault/${doc.id}/edit`} className="btn btn-secondary small">
                Edit
              </Link>
              <button
                type="button"
                className="btn btn-secondary small vault-delete-btn"
                onClick={() => removeDoc(doc)}
                disabled={busyId === doc.id}
              >
                Delete
              </button>
            </div>
          </article>
        ))
      ) : (
        <article className="card">
          <p className="muted">No documents uploaded yet.</p>
        </article>
      )}
    </section>
  );
}
