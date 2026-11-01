export function parseDecimalInput(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") return undefined;

  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parsePositiveInteger(value: string): number | null {
  const parsed = parseDecimalInput(value);
  if (parsed === undefined || parsed <= 0) return null;
  return Math.round(parsed);
}
