import { db } from "@/db/db";
import { createId } from "@/lib/id";
import { notifyLocalDataChange } from "@/lib/syncEvents";
import type { DateKey, DiaryEntry, MealBlock } from "@/types/domain";

export interface AddEntryInput {
  profileId: string;
  date: DateKey;
  mealId: string;
  foodId: string;
  grams: number;
}

export async function addEntry(input: AddEntryInput): Promise<DiaryEntry> {
  const food = await db.foods.get(input.foodId);
  if (!food) throw new Error("El alimento ya no existe.");
  if (food.deletedAt !== undefined) {
    throw new Error("El alimento fue eliminado de la biblioteca global.");
  }

  const meal = await db.meals.get(input.mealId);
  if (!meal || meal.profileId !== input.profileId) {
    throw new Error("El bloque de comida ya no existe.");
  }

  const grams = Math.round(input.grams);
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error("La cantidad debe ser mayor que 0 g.");
  }

  const now = Date.now();
  const entry: DiaryEntry = {
    id: createId(),
    profileId: input.profileId,
    date: input.date,
    mealId: input.mealId,
    foodId: input.foodId,
    foodName: food.name,
    grams,
    per100: { ...food.per100 },
    createdAt: now,
    updatedAt: now,
  };

  await db.entries.add(entry);
  notifyLocalDataChange();
  return entry;
}

export async function updateEntry(
  id: string,
  input: { grams: number; mealId: string },
): Promise<void> {
  const grams = Math.round(input.grams);
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error("La cantidad debe ser mayor que 0 g.");
  }

  await db.entries.update(id, {
    grams,
    mealId: input.mealId,
    updatedAt: Date.now(),
  });
  notifyLocalDataChange();
}

export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
  notifyLocalDataChange();
}

/** Restaura un registro eliminado con su snapshot original (para "Deshacer"). */
export async function restoreEntry(entry: DiaryEntry): Promise<void> {
  await db.entries.put(entry);
  notifyLocalDataChange();
}

export async function getRecentFoodIds(profileId: string, limit = 6): Promise<string[]> {
  const recent = await db.entries
    .where("[profileId+createdAt]")
    .between([profileId, 0], [profileId, Number.MAX_SAFE_INTEGER], true, true)
    .reverse()
    .limit(60)
    .toArray();

  const unique: string[] = [];
  for (const entry of recent) {
    if (!unique.includes(entry.foodId)) unique.push(entry.foodId);
    if (unique.length >= limit) break;
  }

  return unique;
}

export function sortMeals(meals: MealBlock[]): MealBlock[] {
  return [...meals].sort((a, b) => a.sortOrder - b.sortOrder);
}
