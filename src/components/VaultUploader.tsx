"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FREE_MAX_DOCUMENTS } from "@/lib/limits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { VAULT_DOC_TYPES, VAULT_DOC_TYPE_LABELS, type VaultDocType } from "@/lib/vault";

type Props = {
  isPro: boolean;
  existingCount: number;
};

export function VaultUploader({ isPro, existingCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [docType, setDocType] = useState<VaultDocType>("passport");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!isPro && existingCount >= FREE_MAX_DOCUMENTS) {
      setError(`Free plan allows up to ${FREE_MAX_DOCUMENTS} documents. Upgrade for more.`);
      setShowUpgrade(true);
      return;
    }

    const form = event.currentTarget;
    const input = form.elements.namedItem("document") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    setLoading(true);
    const payload = new FormData();
    payload.append("document", file);
    payload.append("doc_type", docType);

    const response = await fetch("/api/vault/upload", {
      method: "POST",
      body: payload,
    });
    const result = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      upgrade?: boolean;
      error?: string;
    };

    if (!response.ok) {
      setLoading(false);
      if (result.code === "PLAN_LIMIT" || result.upgrade) {
        setError(result.message ?? "Upgrade to Pro to continue.");
        setShowUpgrade(true);
      } else {
        setError(result.error ?? result.message ?? "Upload failed.");
      }
      return;
    }

    setLoading(false);
    form.reset();
    router.refresh();
  };

  return (
    <>
      <form id="vault-upload" className="stack-12" onSubmit={onSubmit}>
        <label>Upload document</label>
        <input type="file" name="document" required />
        <label htmlFor="doc-type">Document type</label>
        <select
          id="doc-type"
          name="doc_type"
          value={docType}
          onChange={(event) => setDocType(event.target.value as VaultDocType)}
          required
        >
          {VAULT_DOC_TYPES.map((type) => (
            <option key={type} value={type}>
              {VAULT_DOC_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {!isPro && existingCount >= FREE_MAX_DOCUMENTS ? (
          <p className="hint">
            You reached the free vault limit ({existingCount}/{FREE_MAX_DOCUMENTS}). Upgrade to Pro for unlimited uploads.
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-secondary" disabled={loading || (!isPro && existingCount >= FREE_MAX_DOCUMENTS)}>
          {loading ? "Uploading..." : "Upload"}
        </button>
        {!isPro && existingCount >= FREE_MAX_DOCUMENTS ? (
          <button type="button" className="btn btn-primary" onClick={() => setShowUpgrade(true)}>
            Upgrade to Pro
          </button>
        ) : null}
      </form>
      <UpgradeModal open={showUpgrade} feature="vault" onClose={() => setShowUpgrade(false)} />
    </>
  );
}
