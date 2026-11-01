import type { DiaryEntry, Nutrition } from "@/types/domain";

export const EMPTY_NUTRITION: Nutrition = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

export function nutritionForGrams(grams: number, per100: Nutrition): Nutrition {
  const factor = grams / 100;
  return {
    kcal: per100.kcal * factor,
    protein: per100.protein * factor,
    carbs: per100.carbs * factor,
    fat: per100.fat * factor,
  };
}

export function entryNutrition(entry: DiaryEntry): Nutrition {
  return nutritionForGrams(entry.grams, entry.per100);
}

export function addNutrition(left: Nutrition, right: Nutrition): Nutrition {
  return {
    kcal: left.kcal + right.kcal,
    protein: left.protein + right.protein,
    carbs: left.carbs + right.carbs,
    fat: left.fat + right.fat,
  };
}

export function sumNutrition(values: Nutrition[]): Nutrition {
  return values.reduce((total, value) => addNutrition(total, value), EMPTY_NUTRITION);
}

export function sumEntries(entries: DiaryEntry[]): Nutrition {
  return sumNutrition(entries.map(entryNutrition));
}

export function remainingNutrition(goals: Nutrition, consumed: Nutrition): Nutrition {
  return {
    kcal: goals.kcal - consumed.kcal,
    protein: goals.protein - consumed.protein,
    carbs: goals.carbs - consumed.carbs,
    fat: goals.fat - consumed.fat,
  };
}

export function progressRatio(consumed: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0) {
    return consumed > 0 ? 1 : 0;
  }

  return Math.min(Math.max(consumed / goal, 0), 1);
}

export function isOverGoal(consumed: number, goal: number): boolean {
  return goal >= 0 && consumed > goal;
}

export function macroKcal(goals: Nutrition): number {
  return goals.protein * 4 + goals.carbs * 4 + goals.fat * 9;
}
