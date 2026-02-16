import { dateOnlyToSafeISO } from "@/lib/dates";
import type { StatusType } from "@/lib/types";

export function generateInitialReminders(userId: string, status: StatusType, expiryDate: string) {
  const expiryISO = dateOnlyToSafeISO(expiryDate);
  if (!expiryISO) return [];

  const expiry = new Date(expiryISO);
  const withLeadTime = (daysBefore: number) => {
    const due = new Date(expiry);
    due.setUTCDate(due.getUTCDate() - daysBefore);
    return due.toISOString();
  };

  if (status === "student") {
    return [120, 90, 60, 30].map((days) => ({
      user_id: userId,
      title: `Study permit checkpoint (${days} days)` ,
      category: "study_milestone",
      due_at: withLeadTime(days),
      notes: "Auto-generated milestone reminder.",
    }));
  }

  return [
    {
      user_id: userId,
      title: "PGWP 180-day window reminder",
      category: "pgwp_deadline",
      due_at: withLeadTime(180),
      notes: "Placeholder reminder for PGWP 180-day window.",
    },
  ];
}
