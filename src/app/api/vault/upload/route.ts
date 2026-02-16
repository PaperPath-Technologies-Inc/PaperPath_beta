import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlanLimitError, getEffectivePlan, getPlanLimits } from "@/lib/plan.server";
import { recalculatePgwp } from "@/lib/pgwpSnapshot";
import { isVaultDocType } from "@/lib/vault";

function sanitizeName(name: string) {
  return name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("document");
  const docTypeRaw = formData?.get("doc_type");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (typeof docTypeRaw !== "string" || !isVaultDocType(docTypeRaw)) {
    return NextResponse.json({ error: "Choose a valid document type." }, { status: 400 });
  }

  const plan = await getEffectivePlan(user.id);
  const limits = getPlanLimits(plan);
  if (Number.isFinite(limits.maxDocuments)) {
    const { count } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= limits.maxDocuments) {
      return NextResponse.json(
        buildPlanLimitError("Free plan allows up to 3 vault documents. Upgrade to Pro for unlimited uploads."),
        { status: 403 },
      );
    }
  }

  const safeName = `${Date.now()}-${sanitizeName(file.name || "document")}`;
  const path = `${user.id}/${safeName}`;
  const { error: uploadError } = await supabase.storage.from("vault").upload(path, file, { upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    filename: file.name,
    storage_path: path,
    doc_type: docTypeRaw,
  });
  if (insertError) {
    await supabase.storage.from("vault").remove([path]).catch(() => null);
    return NextResponse.json({ error: "Could not save document record." }, { status: 400 });
  }
  await recalculatePgwp(user.id).catch(() => null);

  return NextResponse.json({ ok: true });
}
