import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { VAULT_DOC_TYPE_LABELS, VAULT_DOC_TYPES, isVaultDocType, normalizeVaultDocType } from "@/lib/vault";

async function updateDocument(id: string, formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();
  const filename = (formData.get("filename") as string | null)?.trim() ?? "";
  const docTypeRaw = (formData.get("doc_type") as string | null) ?? null;

  if (!filename) {
    redirect(`/vault/${id}/edit?error=missing_filename`);
  }
  if (!isVaultDocType(docTypeRaw)) {
    redirect(`/vault/${id}/edit?error=invalid_doc_type`);
  }

  const { error } = await supabase
    .from("documents")
    .update({ filename, doc_type: docTypeRaw })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/vault/${id}/edit?error=save_failed`);
  }
  await recalculatePgwp(user.id).catch(() => null);

  redirect("/vault");
}

async function deleteDocument(id: string) {
  "use server";

  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doc?.storage_path) {
    redirect(`/vault/${id}/edit?error=delete_failed`);
  }

  const { error: storageError } = await supabase.storage.from("vault").remove([doc.storage_path]);
  if (storageError) {
    redirect(`/vault/${id}/edit?error=delete_failed`);
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    redirect(`/vault/${id}/edit?error=delete_failed`);
  }
  await recalculatePgwp(user.id).catch(() => null);

  redirect("/vault");
}

export default async function EditVaultDocumentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const user = await requireUser();
  const supabase = createSupabaseServerClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id,filename,storage_path,doc_type,created_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doc) notFound();

  const { data: signed } = await supabase.storage.from("vault").createSignedUrl(doc.storage_path, 60 * 60);

  const error = searchParams?.error;
  const errorText =
    error === "missing_filename"
      ? "Filename is required."
      : error === "save_failed"
        ? "Could not save document."
        : error === "delete_failed"
          ? "Could not delete document."
          : error === "invalid_doc_type"
            ? "Choose a valid document type."
          : null;

  return (
    <div className="stack-16">
      <header className="stack-8">
        <p className="eyebrow">Vault</p>
        <h1>Edit document</h1>
      </header>

      <article className="card stack-8">
        <p className="muted">Path</p>
        <p className="mono">{doc.storage_path}</p>
        {signed?.signedUrl ? (
          <a href={signed.signedUrl} target="_blank" rel="noreferrer" className="btn btn-secondary small" style={{ width: "fit-content" }}>
            Open current file
          </a>
        ) : null}
      </article>

      <article className="card">
        <form action={updateDocument.bind(null, doc.id)} className="stack-12">
          <label htmlFor="filename">Filename</label>
          <input id="filename" name="filename" type="text" required defaultValue={doc.filename} />
          <label htmlFor="doc_type">Document type</label>
          <select id="doc_type" name="doc_type" required defaultValue={normalizeVaultDocType(doc.doc_type)}>
            {VAULT_DOC_TYPES.map((docType) => (
              <option key={docType} value={docType}>
                {VAULT_DOC_TYPE_LABELS[docType]}
              </option>
            ))}
          </select>
          {errorText && <p className="error">{errorText}</p>}
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </article>

      <article className="card stack-12">
        <h3>Danger zone</h3>
        <p className="muted">Deleting removes the file from your vault and storage.</p>
        <form action={deleteDocument.bind(null, doc.id)}>
          <button type="submit" className="btn btn-secondary vault-delete-btn">Delete document</button>
        </form>
      </article>

      <Link href="/vault" className="btn btn-secondary" style={{ width: "fit-content" }}>
        Back to vault
      </Link>
    </div>
  );
}
