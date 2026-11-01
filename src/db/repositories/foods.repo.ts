import { db } from "@/db/db";
import { createId } from "@/lib/id";
import { normalizeText } from "@/lib/normalize";
import type { Nutrition } from "@/types/domain";

export interface CreateFoodInput {
  name: string;
  per100: Nutrition;
}

export async function createFood(input: CreateFoodInput): Promise<string> {
  const now = Date.now();
  const id = createId();

  await db.foods.add({
    id,
    name: input.name.trim(),
    nameNormalized: normalizeText(input.name),
    per100: { ...input.per100 },
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function updateFood(id: string, input: CreateFoodInput): Promise<void> {
  await db.foods.update(id, {
    name: input.name.trim(),
    nameNormalized: normalizeText(input.name),
    per100: { ...input.per100 },
    updatedAt: Date.now(),
  });
}

/** El historial conserva un snapshot, por lo que borrar no altera días pasados. */
export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}
