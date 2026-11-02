import type { Food } from "@/types/domain";

/**
 * Devuelve los alimentos remotos que son más nuevos que la copia local.
 * Los tombstones también se propagan (deletedAt + updatedAt).
 */
export function pickNewerRemoteFoods(local: Food[], remote: Food[]): Food[] {
  const localById = new Map(local.map((food) => [food.id, food]));
  const updates: Food[] = [];

  for (const food of remote) {
    const current = localById.get(food.id);
    if (!current || food.updatedAt > current.updatedAt) updates.push(food);
  }

  return updates;
}

/** Une ambas bibliotecas por ID, conservando el updatedAt más reciente. */
export function mergeFoods(local: Food[], remote: Food[]): Food[] {
  const merged = new Map<string, Food>();

  for (const food of remote) merged.set(food.id, food);
  for (const food of local) {
    const current = merged.get(food.id);
    if (!current || food.updatedAt > current.updatedAt) merged.set(food.id, food);
  }

  return [...merged.values()].sort((left, right) =>
    left.nameNormalized.localeCompare(right.nameNormalized),
  );
}
