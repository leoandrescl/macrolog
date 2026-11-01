import { db } from "@/db/db";
import { createId } from "@/lib/id";
import type { MealBlock } from "@/types/domain";

export async function createMeal(profileId: string, name: string): Promise<MealBlock> {
  const activeMeals = await db.meals
    .where("profileId")
    .equals(profileId)
    .filter((meal) => !meal.archivedAt)
    .toArray();

  const maxOrder = activeMeals.reduce((max, meal) => Math.max(max, meal.sortOrder), -1);
  const now = Date.now();
  const meal: MealBlock = {
    id: createId(),
    profileId,
    name: name.trim(),
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.meals.add(meal);
  return meal;
}

export async function renameMeal(id: string, name: string): Promise<void> {
  await db.meals.update(id, {
    name: name.trim(),
    updatedAt: Date.now(),
  });
}

export async function moveMeal(
  profileId: string,
  mealId: string,
  direction: "up" | "down",
): Promise<void> {
  await db.transaction("rw", db.meals, async () => {
    const activeMeals = await db.meals
      .where("profileId")
      .equals(profileId)
      .filter((meal) => !meal.archivedAt)
      .toArray();
    activeMeals.sort((a, b) => a.sortOrder - b.sortOrder);

    const index = activeMeals.findIndex((meal) => meal.id === mealId);
    if (index < 0) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeMeals.length) return;

    const current = activeMeals[index];
    const target = activeMeals[targetIndex];
    const now = Date.now();

    await db.meals.update(current.id, {
      sortOrder: target.sortOrder,
      updatedAt: now,
    });
    await db.meals.update(target.id, {
      sortOrder: current.sortOrder,
      updatedAt: now,
    });
  });
}

/**
 * Elimina el bloque de comida. Si tiene registros históricos, se archiva para
 * conservar el nombre del bloque en esos días.
 */
export async function deleteMeal(meal: MealBlock): Promise<"deleted" | "archived"> {
  const entryCount = await db.entries.where("mealId").equals(meal.id).count();

  if (entryCount > 0) {
    await db.meals.update(meal.id, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return "archived";
  }

  await db.meals.delete(meal.id);
  return "deleted";
}
