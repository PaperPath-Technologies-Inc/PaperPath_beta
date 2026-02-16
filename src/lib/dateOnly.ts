const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_TOKENS = new Set(["YYYY-MM-DD", "AAAA-MM-DD"]);

function hasValidCalendarDay(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= maxDay;
}

export function normalizeDateOnlyOptional(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || PLACEHOLDER_TOKENS.has(trimmed.toUpperCase())) {
    return { value: null as string | null, error: null as string | null };
  }
  if (!DATE_ONLY_PATTERN.test(trimmed) || !hasValidCalendarDay(trimmed)) {
    return { value: null as string | null, error: "Use YYYY-MM-DD format." };
  }
  return { value: trimmed, error: null as string | null };
}

export function normalizeDateOnlyRequired(value: string | null | undefined) {
  const parsed = normalizeDateOnlyOptional(value);
  if (!parsed.value) {
    return { value: null as string | null, error: "Date is required." };
  }
  return parsed;
}

export function sanitizeErrorMessage(message: string | null | undefined, fallback: string) {
  const compact = typeof message === "string" ? message.replace(/\s+/g, " ").trim() : "";
  return compact ? compact.slice(0, 220) : fallback;
}
