import { db } from "@/db/db";
import { createId } from "@/lib/id";
import { normalizeText } from "@/lib/normalize";
import { notifyFoodsChange } from "@/lib/syncEvents";
import type { Food, Nutrition } from "@/types/domain";

export interface CreateFoodInput {
  name: string;
  per100: Nutrition;
  portionGrams?: number;
}

export async function createFood(input: CreateFoodInput): Promise<string> {
  const now = Date.now();
  const id = createId();

  await db.foods.add({
    id,
    name: input.name.trim(),
    nameNormalized: normalizeText(input.name),
    per100: { ...input.per100 },
    ...(input.portionGrams ? { portionGrams: input.portionGrams } : {}),
    createdAt: now,
    updatedAt: now,
  });

  notifyFoodsChange();
  return id;
}

export async function updateFood(id: string, input: CreateFoodInput): Promise<void> {
  await db.foods.update(id, {
    name: input.name.trim(),
    nameNormalized: normalizeText(input.name),
    per100: { ...input.per100 },
    portionGrams: input.portionGrams,
    updatedAt: Date.now(),
  });
  notifyFoodsChange();
}

/** Borrado lógico para propagar la eliminación a todas las cuentas. */
export async function deleteFood(id: string): Promise<void> {
  const now = Date.now();
  await db.foods.update(id, {
    deletedAt: now,
    updatedAt: now,
  });
  notifyFoodsChange();
}

/**
 * Fusiona alimentos remotos con la copia local sin pisar cambios más nuevos.
 * Devuelve cuántos registros locales fueron actualizados.
 */
export async function mergeFoodsIntoLibrary(remoteFoods: Food[]): Promise<number> {
  if (!remoteFoods.length) return 0;

  let merged = 0;
  await db.transaction("rw", db.foods, async () => {
    const existing = await db.foods.bulkGet(remoteFoods.map((food) => food.id));
    const updates: Food[] = [];

    for (let index = 0; index < remoteFoods.length; index += 1) {
      const remote = remoteFoods[index];
      const local = existing[index];
      if (!remote) continue;
      if (local && local.updatedAt >= remote.updatedAt) continue;
      updates.push(remote);
    }

    if (updates.length) {
      await db.foods.bulkPut(updates);
      merged = updates.length;
    }
  });

  return merged;
}

/** Alimentos visibles en la interfaz. Los tombstones quedan para sincronizar. */
export function isFoodVisible(food: Food): boolean {
  return food.deletedAt === undefined;
}
