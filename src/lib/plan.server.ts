import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Plan = "free" | "pro";

export type PlanLimits = {
  maxActiveTasks: number;
  maxActiveReminders: number;
  maxDocuments: number;
  riskHistoryDays: number;
};

export type PlanLimitErrorPayload = {
  code: "PLAN_LIMIT";
  message: string;
  upgrade: true;
};

export function getPlanLimits(plan: Plan): PlanLimits {
  if (plan === "pro") {
    return {
      maxActiveTasks: Number.POSITIVE_INFINITY,
      maxActiveReminders: Number.POSITIVE_INFINITY,
      maxDocuments: Number.POSITIVE_INFINITY,
      riskHistoryDays: 90,
    };
  }
  return {
    maxActiveTasks: 10,
    maxActiveReminders: 3,
    maxDocuments: 3,
    riskHistoryDays: 7,
  };
}

export function buildPlanLimitError(message: string): PlanLimitErrorPayload {
  return {
    code: "PLAN_LIMIT",
    message,
    upgrade: true,
  };
}

export function isOwnerOverrideUser(userId: string): boolean {
  const ownerId = process.env.OWNER_USER_ID?.trim();
  return Boolean(ownerId) && userId === ownerId;
}

export async function getEffectivePlan(userId: string): Promise<Plan> {
  if (isOwnerOverrideUser(userId)) {
    return "pro";
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan,pro")
    .eq("id", userId)
    .maybeSingle();

  const rawPlan = typeof data?.plan === "string" ? data.plan.toLowerCase() : null;
  if (rawPlan === "pro") return "pro";
  if (rawPlan === "free") return "free";
  return data?.pro ? "pro" : "free";
}

export async function getEffectivePlanWithSource(userId: string): Promise<{ plan: Plan; ownerOverride: boolean }> {
  const ownerOverride = isOwnerOverrideUser(userId);
  if (ownerOverride) {
    return { plan: "pro", ownerOverride: true };
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan,pro")
    .eq("id", userId)
    .maybeSingle();

  const rawPlan = typeof data?.plan === "string" ? data.plan.toLowerCase() : null;
  if (rawPlan === "pro") return { plan: "pro", ownerOverride: false };
  if (rawPlan === "free") return { plan: "free", ownerOverride: false };
  return { plan: data?.pro ? "pro" : "free", ownerOverride: false };
}
