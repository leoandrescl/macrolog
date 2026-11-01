import { describe, expect, it } from "vitest";

import {
  findMacroSplitPresetId,
  formatSplitLabel,
  getMacroSplitPreset,
  gramsFromCaloriesAndSplit,
  MACRO_SPLIT_PRESETS,
} from "@/lib/macroSplits";

describe("distribuciones de macros", () => {
  it("todos los presets suman 100%", () => {
    for (const preset of MACRO_SPLIT_PRESETS) {
      expect(preset.split.protein + preset.split.carbs + preset.split.fat).toBe(100);
    }
  });

  it("calcula gramos desde calorías y porcentajes", () => {
    const grams = gramsFromCaloriesAndSplit(2000, {
      protein: 30,
      carbs: 40,
      fat: 30,
    });

    expect(grams).toEqual({
      kcal: 2000,
      protein: 150,
      carbs: 200,
      fat: 67,
    });
  });

  it("redondea los gramos a enteros sin alterar las calorías objetivo", () => {
    const grams = gramsFromCaloriesAndSplit(1700, {
      protein: 30,
      carbs: 45,
      fat: 25,
    });

    expect(grams.protein).toBe(128);
    expect(grams.carbs).toBe(191);
    expect(grams.fat).toBe(47);
    expect(grams.kcal).toBe(1700);
  });

  it("identifica un preset a partir de sus porcentajes", () => {
    const highProtein = getMacroSplitPreset("high-protein");
    expect(highProtein).not.toBeNull();
    if (!highProtein) return;

    expect(findMacroSplitPresetId(highProtein.split)).toBe("high-protein");
    expect(findMacroSplitPresetId({ protein: 1, carbs: 2, fat: 3 })).toBeNull();
    expect(findMacroSplitPresetId(undefined)).toBeNull();
  });

  it("devuelve null para el modo manual", () => {
    expect(getMacroSplitPreset(null)).toBeNull();
  });

  it("formatea la distribución para la UI", () => {
    expect(formatSplitLabel({ protein: 30, carbs: 45, fat: 25 })).toBe(
      "P30% · C45% · G25%",
    );
  });
});
