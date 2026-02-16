import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PgwpRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

export type PgwpRiskReason = {
  title: string;
  explanation: string;
};

export type PgwpRiskAction = {
  title: string;
  description: string;
  cta_route: string;
};

export type PgwpTask = {
  due_date: string | null;
  status: "todo" | "done";
};

export type PgwpRiskInput = {
  role: string | null;
  knows_expiry: boolean;
  study_permit_expiry_date: string | null;
  program_end_date: string | null;
  tasks: PgwpTask[];
};

export type PgwpRiskResult = {
  risk_level: PgwpRiskLevel;
  risk_score: number;
  reasons: PgwpRiskReason[];
  next_actions: PgwpRiskAction[];
  updated_at: string;
  version: "pgwp-v0.2";
  days_to_permit_expiry: number | null;
  days_to_program_end: number | null;
  days_since_program_end: number | null;
};

type ProfileForSeeding = {
  status: string | null;
  program_end_date: string | null;
};

type PgwpRiskHistorySource = {
  risk_score: number;
  risk_level: PgwpRiskLevel;
  days_to_permit_expiry: number | null;
  days_to_program_end: number | null;
  days_since_program_end: number | null;
};

type PgwpRiskHistoryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<{ error: unknown }>;
  };
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(later: Date, earlier: Date) {
  const ms = startOfDay(later).getTime() - startOfDay(earlier).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mapRiskLevel(score: number): PgwpRiskLevel {
  if (score <= 34) return "LOW";
  if (score <= 69) return "MEDIUM";
  return "HIGH";
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toUtcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function minFutureDate(date: Date, today: Date) {
  const minDate = addDays(startOfDay(today), 1);
  return date < minDate ? minDate : date;
}

function createCommonDateInfo(programEndDate: string | null, permitExpiryDate: string | null) {
  const today = startOfDay(new Date());

  const permitDate = permitExpiryDate ? new Date(`${permitExpiryDate}T00:00:00`) : null;
  const programDate = programEndDate ? new Date(`${programEndDate}T00:00:00`) : null;

  const daysToPermitExpiry = permitDate ? diffDays(permitDate, today) : null;
  const daysToProgramEnd = programDate ? diffDays(programDate, today) : null;
  const daysSinceProgramEnd = programDate ? diffDays(today, programDate) : null;

  return {
    today,
    daysToPermitExpiry,
    daysToProgramEnd,
    daysSinceProgramEnd,
  };
}

function buildReasonList(
  daysLeft: number | null,
  programEndDate: string | null,
  daysToProgramEnd: number | null,
  daysSinceProgramEnd: number | null,
  total: number,
  done: number,
  overdue: number,
): PgwpRiskReason[] {
  const reasons: PgwpRiskReason[] = [];

  if (daysLeft === null) {
    reasons.push({
      title: "Missing permit expiry date",
      explanation: "Add your study permit expiry to calculate your countdown.",
    });
  } else if (daysLeft >= 0) {
    reasons.push({
      title: "Permit countdown",
      explanation: `Your study permit expires in ${daysLeft} days.`,
    });
  } else {
    reasons.push({
      title: "Permit countdown",
      explanation: `Your study permit expiry date is in the past (${Math.abs(daysLeft)} days ago).`,
    });
  }

  if (!programEndDate) {
    reasons.push({
      title: "Program timeline",
      explanation: "Missing program end date.",
    });
  } else if ((daysToProgramEnd ?? 0) > 0) {
    reasons.push({
      title: "Program timeline",
      explanation: `Your program ends in ${daysToProgramEnd} days.`,
    });
  } else {
    reasons.push({
      title: "Program timeline",
      explanation: `Your program ended ${daysSinceProgramEnd} days ago.`,
    });
  }

  if (total === 0) {
    reasons.push({
      title: "Task readiness",
      explanation: "No PGWP tasks yet.",
    });
  } else if (overdue > 0) {
    reasons.push({
      title: "Task readiness",
      explanation: `You have ${overdue} overdue PGWP tasks.`,
    });
  } else if (done / total < 0.5) {
    reasons.push({
      title: "Task readiness",
      explanation: "PGWP tasks are less than halfway done.",
    });
  } else {
    reasons.push({
      title: "Task readiness",
      explanation: "You’re on track.",
    });
  }

  return reasons.slice(0, 4);
}

function pickTopActions(baseActions: PgwpRiskAction[]) {
  const remindersAction: PgwpRiskAction = {
    title: "Enable reminders",
    description: "Use reminders to stay ahead of PGWP planning deadlines.",
    cta_route: "/reminders",
  };

  const deduped: PgwpRiskAction[] = [];
  for (const action of baseActions) {
    if (!deduped.find((item) => item.title === action.title && item.cta_route === action.cta_route)) {
      deduped.push(action);
    }
  }

  const primary = deduped.slice(0, 2);
  return [...primary, remindersAction].slice(0, 3);
}

export function buildPgwpStarterTasks(profile: ProfileForSeeding, now = new Date()) {
  const today = startOfDay(now);
  const hasProgramEnd = Boolean(profile.program_end_date);
  const programDate = profile.program_end_date ? new Date(`${profile.program_end_date}T00:00:00`) : null;
  const programInFuture = Boolean(programDate && diffDays(programDate, today) > 7);

  const dueFromProgramOr = (programOffsetDays: number, fallbackDays: number) => {
    if (programDate && programInFuture) {
      return toDateOnly(minFutureDate(addDays(programDate, programOffsetDays), today));
    }
    return toDateOnly(addDays(today, fallbackDays));
  };

  const task3Due = hasProgramEnd ? dueFromProgramOr(-7, 7) : toDateOnly(addDays(today, 7));
  const task7Due = hasProgramEnd ? dueFromProgramOr(-7, 1) : toDateOnly(addDays(today, 1));

  return [
    {
      title: "Add your key dates (permit + program end)",
      notes: "Keep your timeline accurate so the app can warn you early.",
      due_date: toDateOnly(addDays(today, 7)),
      sort_order: 1,
    },
    {
      title: "Create a personal document checklist",
      notes: "List the documents you want to gather and where they are stored.",
      due_date: toDateOnly(addDays(today, 7)),
      sort_order: 2,
    },
    {
      title: "Request/collect proof of program completion (when available)",
      notes: "Add a reminder to collect completion-related documents from your school.",
      due_date: task3Due,
      sort_order: 3,
    },
    {
      title: "Check your passport expiry date",
      notes: "Add your passport expiry to your personal notes if relevant.",
      due_date: dueFromProgramOr(-30, 14),
      sort_order: 4,
    },
    {
      title: "Update your contact info and mailing address",
      notes: "Make sure your profile details are current.",
      due_date: dueFromProgramOr(1, 14),
      sort_order: 5,
    },
    {
      title: "Block 60 minutes to review your PGWP plan",
      notes: "Weekly planning reduces last-minute stress.",
      due_date: toDateOnly(addDays(today, 7)),
      sort_order: 6,
    },
    {
      title: "Enable reminders for upcoming deadlines",
      notes: "Turn on notifications so nothing slips.",
      due_date: task7Due,
      sort_order: 7,
    },
    {
      title: "Create a folder for PGWP files (cloud/local)",
      notes: "Keep everything organized in one place.",
      due_date: toDateOnly(addDays(today, 7)),
      sort_order: 8,
    },
    {
      title: "Write down questions for a future consultation (optional)",
      notes: "Capture questions you want to ask a licensed professional later.",
      due_date: dueFromProgramOr(14, 45),
      sort_order: 9,
    },
  ];
}

export function evaluatePgwpRisk(input: PgwpRiskInput): PgwpRiskResult {
  const { role, knows_expiry, study_permit_expiry_date, program_end_date, tasks } = input;
  const { today, daysToPermitExpiry, daysToProgramEnd, daysSinceProgramEnd } = createCommonDateInfo(
    program_end_date,
    study_permit_expiry_date,
  );

  const pgwpTasks = tasks.filter((task) => task.status === "todo" || task.status === "done");
  const total = pgwpTasks.length;
  const done = pgwpTasks.filter((task) => task.status === "done").length;
  const overdue = pgwpTasks.filter(
    (task) => task.status === "todo" && task.due_date && new Date(`${task.due_date}T00:00:00`) < today,
  ).length;

  const baseActions: PgwpRiskAction[] = [];

  if (!program_end_date) {
    baseActions.push({
      title: "Add your program end date",
      description: "Add your program end date to keep your PGWP timeline organized.",
      cta_route: "/profile",
    });
  }

  if (total === 0) {
    baseActions.push({
      title: "Create your PGWP plan tasks",
      description: "Start with a simple PGWP checklist to track progress.",
      cta_route: "/tasks/new?category=pgwp",
    });
  } else if (overdue > 0) {
    baseActions.push({
      title: "Review overdue PGWP tasks",
      description: "Focus on overdue items first to reduce stress.",
      cta_route: "/tasks?category=pgwp&filter=overdue",
    });
  } else if (done / total < 1) {
    baseActions.push({
      title: "Complete next PGWP task",
      description: "Finish the next open task in your list.",
      cta_route: "/tasks?category=pgwp&sort=soonest",
    });
  }

  if (role !== "student") {
    return {
      risk_level: "UNKNOWN",
      risk_score: 60,
      reasons: [
        {
          title: "Student profile required",
          explanation: "PGWP risk is available for student profiles only.",
        },
      ],
      next_actions: pickTopActions(baseActions),
      updated_at: new Date().toISOString(),
      version: "pgwp-v0.2",
      days_to_permit_expiry: daysToPermitExpiry,
      days_to_program_end: daysToProgramEnd,
      days_since_program_end: daysSinceProgramEnd,
    };
  }

  if (!study_permit_expiry_date || !knows_expiry) {
    const unknownActions: PgwpRiskAction[] = [
      {
        title: "Set your study permit expiry date",
        description: "Add your study permit expiry to calculate your countdown.",
        cta_route: "/profile",
      },
      ...baseActions,
    ];

    if (total > 0 && done < total) {
      unknownActions.push({
        title: "Complete your PGWP tasks",
        description: "Continue your PGWP checklist while profile details are being updated.",
        cta_route: "/tasks?category=pgwp",
      });
    }

    return {
      risk_level: "UNKNOWN",
      risk_score: 60,
      reasons: buildReasonList(daysToPermitExpiry, program_end_date, daysToProgramEnd, daysSinceProgramEnd, total, done, overdue),
      next_actions: pickTopActions(unknownActions),
      updated_at: new Date().toISOString(),
      version: "pgwp-v0.2",
      days_to_permit_expiry: daysToPermitExpiry,
      days_to_program_end: daysToProgramEnd,
      days_since_program_end: daysSinceProgramEnd,
    };
  }

  const daysLeft = daysToPermitExpiry ?? 0;

  let base = 15;
  if (daysLeft < 0) {
    base = 95;
  } else if (daysLeft <= 30) {
    base = 80;
  } else if (daysLeft <= 60) {
    base = 60;
  } else if (daysLeft <= 120) {
    base = 35;
  }

  let programFactor = 0;
  if (!program_end_date) {
    programFactor += 6;
  } else if ((daysToProgramEnd ?? 0) > 0) {
    if ((daysToProgramEnd ?? 0) <= 30) programFactor += 8;
    else if ((daysToProgramEnd ?? 0) <= 60) programFactor += 5;
    else programFactor += 2;
  } else {
    if ((daysSinceProgramEnd ?? 0) <= 30) programFactor += 10;
    else if ((daysSinceProgramEnd ?? 0) <= 60) programFactor += 7;
    else programFactor += 4;
  }

  const progressPenalty = total === 0 ? 10 : Math.round((1 - done / total) * 20);
  const overduePenalty = Math.min(overdue * 8, 24);
  const riskScore = clamp(base + programFactor + progressPenalty + overduePenalty, 0, 100);

  return {
    risk_level: mapRiskLevel(riskScore),
    risk_score: riskScore,
    reasons: buildReasonList(daysLeft, program_end_date, daysToProgramEnd, daysSinceProgramEnd, total, done, overdue),
    next_actions: pickTopActions(baseActions),
    updated_at: new Date().toISOString(),
    version: "pgwp-v0.2",
    days_to_permit_expiry: daysToPermitExpiry,
    days_to_program_end: daysToProgramEnd,
    days_since_program_end: daysSinceProgramEnd,
  };
}

export async function seedPgwpTasksIfEmpty(userId: string, profile: ProfileForSeeding) {
  if (profile.status !== "student") return;

  const supabase = createSupabaseServerClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("category", "pgwp");

  if ((count ?? 0) > 0) return;

  const starterTasks = buildPgwpStarterTasks(profile);
  await supabase.from("tasks").insert(
    starterTasks.map((task) => ({
      user_id: userId,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      status: "todo",
      category: "pgwp",
      sort_order: task.sort_order,
    })),
  );
}

export async function recalculatePgwpRiskForUser(userId: string) {
  const supabase = createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("status,expiry_date,study_permit_expiry_date,knows_expiry,program_end_date")
    .eq("id", userId)
    .maybeSingle();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("due_date,status,category")
    .eq("user_id", userId)
    .eq("category", "pgwp");

  const safeTasks = (tasks ?? []).map((task) => ({ due_date: task.due_date, status: task.status as "todo" | "done" }));
  const permitDate = (profile?.study_permit_expiry_date as string | null) ?? (profile?.expiry_date as string | null) ?? null;
  const knowsExpiry = typeof profile?.knows_expiry === "boolean" ? profile.knows_expiry : Boolean(permitDate);

  const risk = evaluatePgwpRisk({
    role: profile?.status ?? null,
    knows_expiry: knowsExpiry,
    study_permit_expiry_date: permitDate,
    program_end_date: (profile?.program_end_date as string | null) ?? null,
    tasks: safeTasks,
  });

  const { error: riskUpsertError } = await supabase.from("pgwp_risk").upsert({
    user_id: userId,
    risk_level: risk.risk_level,
    risk_score: risk.risk_score,
    days_to_permit_expiry: risk.days_to_permit_expiry,
    days_to_program_end: risk.days_to_program_end,
    days_since_program_end: risk.days_since_program_end,
    reasons: risk.reasons,
    next_actions: risk.next_actions,
    updated_at: risk.updated_at,
    version: risk.version,
  });
  if (riskUpsertError) {
    await supabase.from("pgwp_risk").upsert({
      user_id: userId,
      risk_level: risk.risk_level,
      risk_score: risk.risk_score,
      reasons: risk.reasons,
      next_actions: risk.next_actions,
      updated_at: risk.updated_at,
      version: risk.version,
    });
  }

  await upsertPgwpRiskHistorySnapshot(userId).catch(() => null);

  return risk;
}

export async function upsertPgwpRiskHistorySnapshot(
  userId: string,
  options?: { now?: Date; supabaseClient?: PgwpRiskHistoryClient },
) {
  const supabase = options?.supabaseClient ?? createSupabaseServerClient();
  const now = options?.now ?? new Date();
  const day = toUtcDay(now);

  let latestRisk: PgwpRiskHistorySource | null = null;

  const { data: latestRiskWithDays, error: latestRiskWithDaysError } = await supabase
    .from("pgwp_risk")
    .select("risk_score,risk_level,days_to_permit_expiry,days_to_program_end,days_since_program_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!latestRiskWithDaysError && latestRiskWithDays) {
    latestRisk = latestRiskWithDays as PgwpRiskHistorySource;
  } else {
    const { data: fallbackRisk } = await supabase
      .from("pgwp_risk")
      .select("risk_score,risk_level")
      .eq("user_id", userId)
      .maybeSingle();
    if (fallbackRisk) {
      latestRisk = {
        risk_score: (fallbackRisk as { risk_score: number }).risk_score,
        risk_level: (fallbackRisk as { risk_level: PgwpRiskLevel }).risk_level,
        days_to_permit_expiry: null,
        days_to_program_end: null,
        days_since_program_end: null,
      };
    }
  }

  const source = latestRisk;
  if (!source) return null;

  const payload = {
    user_id: userId,
    day,
    risk_score: source.risk_score,
    risk_level: source.risk_level,
    permit_days_left: source.days_to_permit_expiry,
    program_days_to_end: source.days_to_program_end,
    program_days_since_end: source.days_since_program_end,
    created_at: now.toISOString(),
  };

  const { error } = await supabase
    .from("pgwp_risk_history")
    .upsert(payload, { onConflict: "user_id,day" });
  if (error) {
    throw error;
  }

  return payload;
}
