import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { recalculatePgwpRiskForUser, seedPgwpTasksIfEmpty } from "@/lib/pgwpRisk";
import { getEffectivePlan } from "@/lib/plan.server";

export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const profile = await getProfile(data.user.id);
  if (profile) {
    await seedPgwpTasksIfEmpty(data.user.id, {
      status: profile.status,
      program_end_date: profile.program_end_date ?? null,
    }).catch(() => null);
  }
  await recalculatePgwpRiskForUser(data.user.id).catch(() => null);
  return data.user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  type ExtraProfileFields = {
    study_permit_expiry_date?: string | null;
    knows_expiry?: boolean;
    program_end_date?: string | null;
    plan_updated_at?: string | null;
  };

  const { data: baseData } = await supabase
    .from("profiles")
    .select("id,status,expiry_date,city,pro,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (!baseData) return null;

  // Optional PGWP-risk fields may not exist yet in older DB schemas.
  let extraData: ExtraProfileFields | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("study_permit_expiry_date,knows_expiry,program_end_date")
      .eq("id", userId)
      .maybeSingle();
    extraData = (data as ExtraProfileFields | null) ?? null;
  } catch {
    extraData = null;
  }
  try {
    const { data } = await supabase
      .from("profiles")
      .select("plan_updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (data && typeof data === "object" && "plan_updated_at" in data) {
      extraData = {
        ...(extraData ?? {}),
        plan_updated_at: (data as { plan_updated_at?: string | null }).plan_updated_at ?? null,
      };
    }
  } catch {
    // Ignore optional column absence.
  }

  const effectivePlan = await getEffectivePlan(userId).catch(() => ((baseData as { pro?: boolean })?.pro ? "pro" : "free"));
  const isPro = effectivePlan === "pro";

  return {
    ...(baseData as Omit<Profile, "study_permit_expiry_date" | "knows_expiry" | "program_end_date">),
    study_permit_expiry_date: extraData?.study_permit_expiry_date ?? null,
    knows_expiry: extraData?.knows_expiry ?? false,
    program_end_date: extraData?.program_end_date ?? null,
    plan: effectivePlan,
    plan_updated_at: extraData?.plan_updated_at ?? null,
    pro: isPro,
  };
}

export async function requireCompletedProfile() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.status || !profile?.expiry_date) redirect("/onboarding");
  return { user, profile };
}
