import { describe, expect, it } from "vitest";

import {
  addNutrition,
  entryNutrition,
  isOverGoal,
  macroKcal,
  nutritionForGrams,
  progressRatio,
  remainingNutrition,
  sumEntries,
  sumNutrition,
} from "@/lib/nutrition";
import type { DiaryEntry, Nutrition } from "@/types/domain";

const CHICKEN: Nutrition = {
  kcal: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
};

describe("nutrition", () => {
  it("calcula una porción con precisión completa", () => {
    const result = nutritionForGrams(140, CHICKEN);

    expect(result.kcal).toBeCloseTo(231);
    expect(result.protein).toBeCloseTo(43.4);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBeCloseTo(5.04);
  });

  it("suma porciones sin redondear los valores intermedios", () => {
    const total = sumNutrition([
      nutritionForGrams(100, CHICKEN),
      nutritionForGrams(50, CHICKEN),
    ]);

    expect(total.kcal).toBeCloseTo(247.5);
    expect(total.protein).toBeCloseTo(46.5);
  });

  it("calcula el restante aunque sea negativo", () => {
    const remaining = remainingNutrition(CHICKEN, {
      kcal: 1200,
      protein: 200,
      carbs: 20,
      fat: 10,
    });

    expect(remaining.kcal).toBeCloseTo(-1035);
    expect(remaining.protein).toBeCloseTo(-169);
    expect(remaining.carbs).toBeCloseTo(-20);
    expect(remaining.fat).toBeCloseTo(-6.4);
  });

  it("maneja metas en cero sin dividir por cero", () => {
    expect(progressRatio(0, 0)).toBe(0);
    expect(progressRatio(20, 0)).toBe(1);
    expect(progressRatio(20, 100)).toBe(0.2);
    expect(progressRatio(150, 100)).toBe(1);
  });

  it("detecta sobregiro de calorías y macros", () => {
    expect(isOverGoal(2001, 2000)).toBe(true);
    expect(isOverGoal(2000, 2000)).toBe(false);
    expect(isOverGoal(10, 0)).toBe(true);
  });

  it("calcula las kcal teóricas de los macros", () => {
    expect(macroKcal(CHICKEN)).toBeCloseTo(156.4);
  });

  it("agrega y suma entradas con sus snapshots", () => {
    const entry = {
      id: "entry-1",
      profileId: "profile-1",
      date: "2026-11-01",
      mealId: "meal-1",
      foodId: "food-1",
      foodName: "Pechuga",
      grams: 200,
      per100: CHICKEN,
      createdAt: 1,
      updatedAt: 1,
    } satisfies DiaryEntry;

    expect(entryNutrition(entry).protein).toBeCloseTo(62);
    expect(
      sumEntries([entry, { ...entry, id: "entry-2", grams: 100 }]).protein,
    ).toBeCloseTo(93);
  });

  it("suma macros con una función pura", () => {
    expect(addNutrition(CHICKEN, CHICKEN).kcal).toBeCloseTo(330);
  });
});
