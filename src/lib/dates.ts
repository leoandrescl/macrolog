import type { DateKey } from "@/types/domain";

const LONG_DATE = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const SHORT_DATE = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const MONTH_YEAR = new Intl.DateTimeFormat("es-CL", {
  month: "long",
  year: "numeric",
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Construye una fecha local al mediodía para evitar saltos de DST. */
export function dateFromKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}` as DateKey;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function isValidDateKey(value: string): value is DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

export function addDays(key: DateKey, amount: number): DateKey {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function formatLongDate(key: DateKey): string {
  const text = LONG_DATE.format(dateFromKey(key));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(key: DateKey): string {
  const text = SHORT_DATE.format(dateFromKey(key));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMonthYear(key: DateKey): string {
  const text = MONTH_YEAR.format(dateFromKey(key));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function relativeDateLabel(key: DateKey, today: DateKey = todayKey()): string {
  if (key === today) return "Hoy";
  if (key === addDays(today, -1)) return "Ayer";
  if (key === addDays(today, 1)) return "Mañana";
  return formatLongDate(key);
}

export function isToday(key: DateKey): boolean {
  return key === todayKey();
}

export function dateInputValue(key: DateKey): string {
  return key;
}
