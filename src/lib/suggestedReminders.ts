import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildPlanLimitError, getEffectivePlan } from "@/lib/plan.server";

type ProfileInput = {
  study_permit_expiry_date: string | null;
  program_end_date: string | null;
};

type ExistingReminderInput = {
  reminder_type: string | null;
};

export type SuggestedReminder = {
  reminder_type: string;
  title: string;
  run_at: string;
  explanation: string;
  recommended: boolean;
  related_date_type: "permit_expiry" | "program_end";
  target_date: string;
};

const BEFORE_OFFSETS = [60, 30, 14, 7, 3, 1];
const AFTER_OFFSETS = [1, 7, 14];

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildRunAt(baseDate: string, offsetDays: number) {
  const date = new Date(`${baseDate}T09:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function buildPermitSuggestions(baseDate: string): SuggestedReminder[] {
  return BEFORE_OFFSETS.map((daysBefore) => {
    const runAt = buildRunAt(baseDate, -daysBefore);
    return {
      reminder_type: `permit_expiry_${daysBefore}`,
      title: `Study permit expiry in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`,
      run_at: runAt.toISOString(),
      explanation: "Keep your permit timeline organized and prepare early.",
      recommended: true,
      related_date_type: "permit_expiry",
      target_date: baseDate,
    };
  });
}

function buildProgramSuggestions(baseDate: string): SuggestedReminder[] {
  const before = BEFORE_OFFSETS.map((daysBefore) => {
    const runAt = buildRunAt(baseDate, -daysBefore);
    return {
      reminder_type: `program_end_${daysBefore}`,
      title: `Program end in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`,
      run_at: runAt.toISOString(),
      explanation: "Plan tasks before your program end date.",
      recommended: true,
      related_date_type: "program_end" as const,
      target_date: baseDate,
    };
  });

  const after = AFTER_OFFSETS.map((daysAfter) => {
    const runAt = buildRunAt(baseDate, daysAfter);
    return {
      reminder_type: `program_end_after_${daysAfter}`,
      title: `Program end follow-up +${daysAfter} day${daysAfter === 1 ? "" : "s"}`,
      run_at: runAt.toISOString(),
      explanation: "Run quick post-program organizational check-ins.",
      recommended: true,
      related_date_type: "program_end" as const,
      target_date: baseDate,
    };
  });

  return [...before, ...after];
}

export function generateSuggestedReminders(
  profile: ProfileInput,
  existingReminders: ExistingReminderInput[],
): SuggestedReminder[] {
  const existingTypes = new Set(existingReminders.map((item) => item.reminder_type).filter(Boolean) as string[]);
  const suggestions: SuggestedReminder[] = [];

  if (profile.study_permit_expiry_date) {
    suggestions.push(...buildPermitSuggestions(profile.study_permit_expiry_date));
  }
  if (profile.program_end_date) {
    suggestions.push(...buildProgramSuggestions(profile.program_end_date));
  }

  return suggestions
    .filter((item) => !existingTypes.has(item.reminder_type))
    .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());
}

export function getRemindersCoverage(profile: ProfileInput, existingReminders: ExistingReminderInput[]) {
  const existingTypes = new Set(existingReminders.map((item) => item.reminder_type).filter(Boolean) as string[]);
  const permitExpected = profile.study_permit_expiry_date ? BEFORE_OFFSETS.map((d) => `permit_expiry_${d}`) : [];
  const programExpected = profile.program_end_date
    ? [...BEFORE_OFFSETS.map((d) => `program_end_${d}`), ...AFTER_OFFSETS.map((d) => `program_end_after_${d}`)]
    : [];

  const hasPermitSeries = permitExpected.length > 0 ? permitExpected.every((type) => existingTypes.has(type)) : true;
  const hasProgramSeries = programExpected.length > 0 ? programExpected.every((type) => existingTypes.has(type)) : true;
  return { has_permit_series: hasPermitSeries, has_program_series: hasProgramSeries };
}

export async function enableRecommendedReminders(userId: string) {
  const plan = await getEffectivePlan(userId);
  if (plan !== "pro") {
    throw buildPlanLimitError("Enable all recommended reminders is available on Pro.");
  }

  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("study_permit_expiry_date,expiry_date,program_end_date")
    .eq("id", userId)
    .maybeSingle();

  const profileInput: ProfileInput = {
    study_permit_expiry_date: (profile?.study_permit_expiry_date as string | null) ?? (profile?.expiry_date as string | null) ?? null,
    program_end_date: (profile?.program_end_date as string | null) ?? null,
  };

  const { data: existing } = await supabase
    .from("reminders")
    .select("reminder_type")
    .eq("user_id", userId);

  const suggestions = generateSuggestedReminders(profileInput, (existing ?? []) as ExistingReminderInput[]);
  if (!suggestions.length) {
    return { created: 0 };
  }

  const payload = suggestions.map((item) => ({
    user_id: userId,
    title: item.title,
    category: "pgwp_recommended",
    due_at: item.run_at,
    run_at: item.run_at,
    reminder_type: item.reminder_type,
    related_date_type: item.related_date_type,
    target_date: item.target_date,
    notes: item.explanation,
    is_done: false,
  }));

  await supabase.from("reminders").insert(payload);
  return { created: payload.length };
}

export function reminderDisplayDate(reminder: SuggestedReminder) {
  return toDateOnly(new Date(reminder.run_at));
}
