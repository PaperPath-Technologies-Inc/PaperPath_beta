import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recalculatePgwpRiskForUser } from "@/lib/pgwpRisk";
import { getEffectivePlanWithSource, type Plan } from "@/lib/plan.server";
import {
  generateSuggestedReminders,
  getRemindersCoverage,
  type SuggestedReminder,
} from "@/lib/suggestedReminders";
import {
  VAULT_DOC_TYPE_LABELS,
  buildVaultChecklist,
  normalizeVaultDocType,
  type VaultChecklistItem,
  type VaultDocType,
} from "@/lib/vault";

export type SnapshotReason = {
  code: string;
  title: string;
  explanation: string;
  severity: 1 | 2 | 3 | 4 | 5;
  evidence: string;
  cta_route: string;
  cta_label: string;
};

export type SnapshotNextAction = {
  code: string;
  title: string;
  description: string;
  urgency: "today" | "this_week" | "soon";
  cta_route: string;
  cta_label: string;
};

export type SnapshotMissingItem = {
  code: string;
  title: string;
  evidence: string;
  cta_route: string;
  cta_label: string;
};

type SnapshotRiskRow = {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  reasons: Array<{ title: string; explanation: string }>;
  next_actions: Array<{ title: string; description: string; cta_route: string }>;
  updated_at: string;
};

type SnapshotTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: "todo" | "done";
  category?: string | null;
};

type SnapshotReminder = {
  id: string;
  title: string;
  due_at: string;
  is_done: boolean;
};

export type PgwpSnapshot = {
  plan: Plan;
  plan_owner_override: boolean;
  profile: {
    study_permit_expiry_date: string | null;
    program_end_date: string | null;
    city: string | null;
    missing_fields: string[];
    completeness_score: number;
  };
  countdowns: {
    permit_days_left: number | null;
    program_days_to_end: number | null;
    program_days_since_end: number | null;
  };
  tasks_summary: {
    total: number;
    done: number;
    active_todo: number;
    overdue_count: number;
    due_next_7_days_count: number;
  };
  reminders_summary: {
    enabled_count: number;
  };
  suggested_reminders: SuggestedReminder[];
  reminders_coverage: {
    has_permit_series: boolean;
    has_program_series: boolean;
  };
  vault_summary: {
    documents_count: number;
  };
  vault_checklist: VaultChecklistItem[];
  risk: {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    reasons: Array<{ title: string; explanation: string }>;
    next_actions: Array<{ title: string; description: string; cta_route: string }>;
    updated_at: string | null;
  };
  derived: {
    connected_reasons: SnapshotReason[];
    connected_next_actions: SnapshotNextAction[];
    missing_items: SnapshotMissingItem[];
  };
  feeds: {
    upcoming_tasks_next_7_days: SnapshotTask[];
    overdue_tasks: SnapshotTask[];
    upcoming_deadlines_next_7_days: SnapshotReminder[];
    overdue_deadlines: SnapshotReminder[];
  };
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function buildConnectedReasons(input: {
  missingPermit: boolean;
  missingProgram: boolean;
  tasksTotal: number;
  overdueCount: number;
  remindersEnabled: number;
  remindersIncomplete: boolean;
  missingVaultDocTypes: VaultDocType[];
}): SnapshotReason[] {
  const reasons: SnapshotReason[] = [];

  if (input.missingPermit) {
    reasons.push({
      code: "MISSING_PERMIT_EXPIRY",
      title: "Missing permit expiry date",
      explanation: "Add your study permit expiry date to keep your PGWP timeline accurate.",
      severity: 5,
      evidence: "Permit expiry date not set",
      cta_route: "/profile",
      cta_label: "Complete profile",
    });
  }

  if (input.missingProgram) {
    reasons.push({
      code: "MISSING_PROGRAM_END",
      title: "Missing program end date",
      explanation: "Add your program end date to improve timeline planning.",
      severity: 4,
      evidence: "Program end date not set",
      cta_route: "/profile",
      cta_label: "Add date",
    });
  }

  if (input.tasksTotal === 0) {
    reasons.push({
      code: "NO_PGWP_TASKS",
      title: "No PGWP tasks yet",
      explanation: "Create your first PGWP tasks to organize upcoming work.",
      severity: 4,
      evidence: "0 PGWP tasks",
      cta_route: "/tasks/new?category=pgwp",
      cta_label: "Create task",
    });
  }

  if (input.overdueCount > 0) {
    reasons.push({
      code: "OVERDUE_TASKS",
      title: "Overdue PGWP tasks",
      explanation: "You have overdue work that should be handled first.",
      severity: 5,
      evidence: `${input.overdueCount} overdue PGWP tasks`,
      cta_route: "/tasks?category=pgwp&filter=overdue",
      cta_label: "Review overdue",
    });
  }

  if (input.remindersEnabled === 0 || input.remindersIncomplete) {
    reasons.push({
      code: "REMINDERS_INCOMPLETE",
      title: "Recommended reminders are incomplete",
      explanation: "Most people forget to set reminders early — this keeps you on track.",
      severity: 3,
      evidence: "Recommended reminders not enabled",
      cta_route: "/reminders",
      cta_label: "Open reminders",
    });
  }

  if (input.missingVaultDocTypes.length > 0) {
    const topMissing = input.missingVaultDocTypes
      .slice(0, 3)
      .map((docType) => VAULT_DOC_TYPE_LABELS[docType])
      .join(", ");

    reasons.push({
      code: "VAULT_MISSING_DOCS",
      title: "Missing key vault documents",
      explanation: "Upload the remaining checklist documents so your records stay complete.",
      severity: 3,
      evidence: `Missing: ${topMissing}`,
      cta_route: "/vault",
      cta_label: "Upload documents",
    });
  }

  return reasons
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 6);
}

function mapReasonToAction(reason: SnapshotReason): SnapshotNextAction {
  const urgency: "today" | "this_week" | "soon" =
    reason.severity >= 5 ? "today" : reason.severity >= 4 ? "this_week" : "soon";

  return {
    code: `ACTION_${reason.code}`,
    title: reason.title,
    description: reason.explanation,
    urgency,
    cta_route: reason.cta_route,
    cta_label: reason.cta_label,
  };
}

function buildMissingItems(input: {
  missingPermit: boolean;
  missingProgram: boolean;
  remindersIncomplete: boolean;
  missingVaultDocTypes: VaultDocType[];
}): SnapshotMissingItem[] {
  const items: SnapshotMissingItem[] = [];

  if (input.missingPermit) {
    items.push({
      code: "MISSING_PERMIT_EXPIRY",
      title: "Study permit expiry date",
      evidence: "Not set in profile",
      cta_route: "/profile",
      cta_label: "Add date",
    });
  }

  if (input.missingProgram) {
    items.push({
      code: "MISSING_PROGRAM_END",
      title: "Program end date",
      evidence: "Not set in profile",
      cta_route: "/profile",
      cta_label: "Add date",
    });
  }

  if (input.remindersIncomplete) {
    items.push({
      code: "REMINDERS_INCOMPLETE",
      title: "Reminders coverage",
      evidence: "Recommended reminders not enabled",
      cta_route: "/reminders",
      cta_label: "Open reminders",
    });
  }

  if (input.missingVaultDocTypes.length > 0) {
    items.push({
      code: "VAULT_MISSING_DOCS",
      title: "Vault checklist",
      evidence: `Missing: ${input.missingVaultDocTypes
        .slice(0, 3)
        .map((docType) => VAULT_DOC_TYPE_LABELS[docType])
        .join(", ")}`,
      cta_route: "/vault",
      cta_label: "Upload documents",
    });
  }

  return items.slice(0, 6);
}

export function buildConnectedNextActions(reasons: SnapshotReason[]): SnapshotNextAction[] {
  return reasons
    .slice(0, 3)
    .map(mapReasonToAction)
    .slice(0, 5);
}

export async function getPgwpSnapshot(userId: string): Promise<PgwpSnapshot> {
  const supabase = createSupabaseServerClient();
  const today = startOfDay(new Date());
  const { plan, ownerOverride } = await getEffectivePlanWithSource(userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("expiry_date,study_permit_expiry_date,program_end_date,city")
    .eq("id", userId)
    .maybeSingle();

  const permitDate = (profile?.study_permit_expiry_date as string | null) ?? (profile?.expiry_date as string | null) ?? null;
  const programEndDate = (profile?.program_end_date as string | null) ?? null;
  const city = (profile?.city as string | null) ?? null;

  const missingFields: string[] = [];
  if (!permitDate) missingFields.push("study_permit_expiry_date");
  if (!programEndDate) missingFields.push("program_end_date");
  const completenessScore = (permitDate ? 50 : 0) + (programEndDate ? 50 : 0);

  const permitDaysLeft = permitDate ? diffDays(today, new Date(`${permitDate}T12:00:00`)) : null;
  const programDaysToEnd = programEndDate ? diffDays(today, new Date(`${programEndDate}T12:00:00`)) : null;
  const programDaysSinceEnd = programEndDate ? diffDays(new Date(`${programEndDate}T12:00:00`), today) : null;

  let tasks: SnapshotTask[] = [];
  try {
    const { data } = await supabase
      .from("tasks")
      .select("id,title,due_date,status,category")
      .eq("user_id", userId);
    tasks = (data as SnapshotTask[] | null) ?? [];
  } catch {
    tasks = [];
  }

  const todos = tasks.filter((task) => task.status === "todo");
  const done = tasks.filter((task) => task.status === "done").length;
  const overdueTasks = todos.filter((task) => task.due_date && new Date(`${task.due_date}T12:00:00`) < today);
  const upcomingTasks = todos.filter((task) => {
    if (!task.due_date) return false;
    const delta = diffDays(today, new Date(`${task.due_date}T12:00:00`));
    return delta >= 0 && delta <= 7;
  });

  const { data: remindersData } = await supabase
    .from("reminders")
    .select("id,title,due_at,is_done,reminder_type")
    .eq("user_id", userId);
  const reminders = (remindersData as Array<SnapshotReminder & { reminder_type?: string | null }> | null) ?? [];
  const activeReminders = reminders.filter((item) => !item.is_done);
  const overdueDeadlines = activeReminders.filter((item) => new Date(item.due_at) < today);
  const upcomingDeadlines = activeReminders.filter((item) => {
    const delta = diffDays(today, new Date(item.due_at));
    return delta >= 0 && delta <= 7;
  });
  const profileForSuggestions = {
    study_permit_expiry_date: permitDate,
    program_end_date: programEndDate,
  };
  const reminderTypes = reminders.map((item) => ({ reminder_type: item.reminder_type ?? null }));
  const suggestedReminders = generateSuggestedReminders(profileForSuggestions, reminderTypes);
  const remindersCoverage = getRemindersCoverage(profileForSuggestions, reminderTypes);
  const remindersIncomplete = suggestedReminders.length > 0;

  const { data: documentsData, count: documentsCountRaw } = await supabase
    .from("documents")
    .select("id,doc_type", { count: "exact" })
    .eq("user_id", userId);
  const documentsCount = documentsCountRaw ?? 0;
  const uploadedDocTypes = new Set<VaultDocType>(
    (documentsData ?? []).map((document) => normalizeVaultDocType(document.doc_type as string | null)),
  );
  const vaultChecklist = buildVaultChecklist(uploadedDocTypes, {
    study_permit_expiry_date: permitDate,
    program_end_date: programEndDate,
    city,
  });
  const missingVaultDocTypes = vaultChecklist
    .filter((item) => item.required && !item.uploaded)
    .map((item) => item.doc_type);

  const { data: riskData } = await supabase
    .from("pgwp_risk")
    .select("risk_score,risk_level,reasons,next_actions,updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  const risk = (riskData as SnapshotRiskRow | null) ?? null;

  const connectedReasons = buildConnectedReasons({
    missingPermit: !permitDate,
    missingProgram: !programEndDate,
    tasksTotal: tasks.length,
    overdueCount: overdueTasks.length,
    remindersEnabled: activeReminders.length,
    remindersIncomplete,
    missingVaultDocTypes,
  });
  const connectedActions = buildConnectedNextActions(connectedReasons);
  const missingItems = buildMissingItems({
    missingPermit: !permitDate,
    missingProgram: !programEndDate,
    remindersIncomplete,
    missingVaultDocTypes,
  });

  return {
    plan,
    plan_owner_override: ownerOverride,
    profile: {
      study_permit_expiry_date: permitDate,
      program_end_date: programEndDate,
      city,
      missing_fields: missingFields,
      completeness_score: completenessScore,
    },
    countdowns: {
      permit_days_left: permitDaysLeft,
      program_days_to_end: programDaysToEnd,
      program_days_since_end: programDaysSinceEnd,
    },
    tasks_summary: {
      total: tasks.length,
      done,
      active_todo: todos.length,
      overdue_count: overdueTasks.length,
      due_next_7_days_count: upcomingTasks.length,
    },
    reminders_summary: {
      enabled_count: activeReminders.length,
    },
    suggested_reminders: suggestedReminders,
    reminders_coverage: remindersCoverage,
    vault_summary: {
      documents_count: documentsCount,
    },
    vault_checklist: vaultChecklist,
    risk: {
      score: risk?.risk_score ?? 60,
      level: risk?.risk_level ?? "UNKNOWN",
      reasons: risk?.reasons ?? [],
      next_actions: risk?.next_actions ?? [],
      updated_at: risk?.updated_at ?? null,
    },
    derived: {
      connected_reasons: connectedReasons,
      connected_next_actions: connectedActions,
      missing_items: missingItems,
    },
    feeds: {
      upcoming_tasks_next_7_days: upcomingTasks.slice(0, 10),
      overdue_tasks: overdueTasks.slice(0, 10),
      upcoming_deadlines_next_7_days: upcomingDeadlines.slice(0, 10),
      overdue_deadlines: overdueDeadlines.slice(0, 10),
    },
  };
}

export async function recalculatePgwp(userId: string) {
  await recalculatePgwpRiskForUser(userId);
  return getPgwpSnapshot(userId);
}
