export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesFoodQuery(name: string, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;

  const normalizedName = normalizeText(name);
  if (normalizedName.startsWith(normalizedQuery)) return true;

  const words = normalizedName.split(" ");
  return words.some((word) => word.startsWith(normalizedQuery));
}
