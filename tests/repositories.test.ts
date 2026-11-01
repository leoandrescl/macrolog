import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db, getActiveProfileId } from "@/db/db";
import { clearAllData, createBackup, restoreBackup } from "@/db/repositories/backup.repo";
import { addEntry, deleteEntry, restoreEntry } from "@/db/repositories/entries.repo";
import { createFood, deleteFood, updateFood } from "@/db/repositories/foods.repo";
import { deleteMeal } from "@/db/repositories/meals.repo";
import {
  createProfile,
  deleteProfile,
  updateProfile,
} from "@/db/repositories/profiles.repo";
import { DEFAULT_GOALS } from "@/lib/constants";
import type { Nutrition } from "@/types/domain";

const CHICKEN: Nutrition = {
  kcal: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
};

async function seedProfile(name = "Leo") {
  return createProfile({
    name,
    color: "lime",
    goals: DEFAULT_GOALS,
  });
}

async function seedEntry(profileId: string, date = "2026-11-01") {
  const foodId = await createFood({ name: "Pechuga de pollo", per100: CHICKEN });
  const meals = await db.meals.where("profileId").equals(profileId).toArray();
  const meal = meals.sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const entry = await addEntry({
    profileId,
    date,
    mealId: meal.id,
    foodId,
    grams: 140,
  });
  return { foodId, meal, entry };
}

describe("repositorios locales", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  afterAll(async () => {
    await db.delete();
    db.close();
  });

  it("crea un perfil con cuatro bloques y lo deja activo", async () => {
    const profile = await seedProfile();

    expect(await db.profiles.count()).toBe(1);
    expect(await getActiveProfileId()).toBe(profile.id);
    const meals = (await db.meals.where("profileId").equals(profile.id).toArray()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    expect(meals.map((meal) => meal.name)).toEqual([
      "Desayuno",
      "Almuerzo",
      "Once",
      "Cena",
    ]);
  });

  it("persiste y puede quitar la distribución automática de macros", async () => {
    const split = { protein: 30, carbs: 40, fat: 30 };
    const profile = await createProfile({
      name: "Auto",
      color: "lime",
      goals: DEFAULT_GOALS,
      macroSplitPct: split,
    });

    expect((await db.profiles.get(profile.id))?.macroSplitPct).toEqual(split);

    await updateProfile(profile.id, {
      name: profile.name,
      color: profile.color,
      goals: profile.goals,
    });

    expect((await db.profiles.get(profile.id))?.macroSplitPct).toBeUndefined();
  });

  it("guarda snapshots y no altera el historial al editar o borrar el alimento", async () => {
    const profile = await seedProfile();
    const { foodId, entry } = await seedEntry(profile.id);

    await updateFood(foodId, {
      name: "Pechuga cocida",
      per100: { kcal: 200, protein: 35, carbs: 0, fat: 5 },
    });
    await deleteFood(foodId);

    const stored = await db.entries.get(entry.id);
    expect(stored?.foodName).toBe("Pechuga de pollo");
    expect(stored?.per100.kcal).toBe(165);
    expect(stored?.grams).toBe(140);
  });

  it("archiva un bloque con historial y elimina uno vacío", async () => {
    const profile = await seedProfile();
    const { meal } = await seedEntry(profile.id);

    await expect(deleteMeal(meal)).resolves.toBe("archived");
    expect((await db.meals.get(meal.id))?.archivedAt).toBeTypeOf("number");

    const others = await db.meals
      .where("profileId")
      .equals(profile.id)
      .filter((item) => item.id !== meal.id)
      .toArray();

    await expect(deleteMeal(others[0])).resolves.toBe("deleted");
    expect(await db.meals.get(others[0].id)).toBeUndefined();
  });

  it("elimina perfil, bloques y registros sin tocar la biblioteca", async () => {
    const profile = await seedProfile();
    await seedEntry(profile.id);

    await deleteProfile(profile.id);

    expect(await db.profiles.count()).toBe(0);
    expect(await db.meals.count()).toBe(0);
    expect(await db.entries.count()).toBe(0);
    expect(await db.foods.count()).toBe(1);
  });

  it("restaura un registro eliminado con su snapshot", async () => {
    const profile = await seedProfile();
    const { entry } = await seedEntry(profile.id);

    await deleteEntry(entry.id);
    expect(await db.entries.count()).toBe(0);

    await restoreEntry(entry);
    const restored = await db.entries.get(entry.id);
    expect(restored?.foodName).toBe(entry.foodName);
    expect(restored?.per100.kcal).toBe(entry.per100.kcal);
  });

  it("exporta e importa todos los datos en una transacción", async () => {
    const profile = await seedProfile();
    await updateProfile(profile.id, {
      name: profile.name,
      color: profile.color,
      goals: profile.goals,
      macroSplitPct: { protein: 30, carbs: 40, fat: 30 },
    });
    await seedEntry(profile.id);

    const backup = await createBackup();
    await clearAllData();

    expect(backup.data.profiles).toHaveLength(1);
    expect(backup.data.profiles[0]?.macroSplitPct).toEqual({
      protein: 30,
      carbs: 40,
      fat: 30,
    });
    expect(backup.data.foods).toHaveLength(1);
    expect(backup.data.entries).toHaveLength(1);

    await restoreBackup(backup);

    expect(await db.profiles.count()).toBe(1);
    expect(await db.foods.count()).toBe(1);
    expect(await db.entries.count()).toBe(1);
    expect(await getActiveProfileId()).toBe(profile.id);
    expect((await db.profiles.get(profile.id))?.macroSplitPct).toEqual({
      protein: 30,
      carbs: 40,
      fat: 30,
    });
  });
});
