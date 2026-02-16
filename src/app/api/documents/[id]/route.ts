import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { isVaultDocType } from "@/lib/vault";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const filename = typeof body?.filename === "string" ? body.filename.trim() : "";
  const docType = typeof body?.doc_type === "string" ? body.doc_type : null;
  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }
  if (docType !== null && !isVaultDocType(docType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const { error } = await supabase
    .from("documents")
    .update({ filename, ...(docType ? { doc_type: docType } : {}) })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage.from("vault").remove([doc.storage_path]);
  if (storageError) {
    return NextResponse.json({ error: "Could not remove file from storage" }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "Could not delete document record" }, { status: 400 });
  }
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}
