export function dateOnlyToSafeISO(dateOnly: string) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return null;
  const safeNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return safeNoon.toISOString();
}

export function daysUntil(dateOnly: string | null) {
  if (!dateOnly) return null;
  const iso = dateOnlyToSafeISO(dateOnly);
  if (!iso) return null;
  const target = new Date(iso);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date));
}
