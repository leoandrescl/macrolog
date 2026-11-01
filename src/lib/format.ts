const NUMBER_0 = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 0,
});

const NUMBER_1 = new Intl.NumberFormat("es-CL", {
  maximumFractionDigits: 1,
});

export function formatKcal(value: number): string {
  return NUMBER_0.format(Math.round(Number.isFinite(value) ? value : 0));
}

export function formatMacro(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
  return NUMBER_1.format(safe);
}

export function formatGrams(value: number): string {
  return NUMBER_0.format(Math.round(Number.isFinite(value) ? value : 0));
}

export function formatSignedKcal(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${NUMBER_0.format(rounded)}`;
  return NUMBER_0.format(rounded);
}

export function formatSignedMacro(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
  if (safe > 0) return `+${NUMBER_1.format(safe)}`;
  return NUMBER_1.format(safe);
}

export function formatFileDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
