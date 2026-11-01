import type { Nutrition, ProfileColor } from "@/types/domain";

export const APP_NAME = "MacroLog";
export const APP_VERSION = "0.1.0";
export const DB_NAME = "macrolog";
export const ACTIVE_PROFILE_KEY = "activeProfileId";
export const THEME_STORAGE_KEY = "macrolog-theme";
export const SCHEMA_VERSION = 1 as const;

export const DEFAULT_GOALS: Nutrition = {
  kcal: 2000,
  protein: 150,
  carbs: 200,
  fat: 67,
};

export const DEFAULT_MEAL_NAMES = ["Desayuno", "Almuerzo", "Once", "Cena"] as const;

export const PROFILE_COLORS: ReadonlyArray<{
  id: ProfileColor;
  label: string;
  hex: string;
}> = [
  { id: "lime", label: "Lima", hex: "#b6f36b" },
  { id: "sky", label: "Cielo", hex: "#7dd3fc" },
  { id: "violet", label: "Violeta", hex: "#c4b5fd" },
  { id: "amber", label: "Ámbar", hex: "#fcd34d" },
  { id: "rose", label: "Rosa", hex: "#fda4af" },
];

export const DEFAULT_PROFILE_COLOR: ProfileColor = "lime";

export const GRAM_PRESETS = [50, 100, 150, 200, 250] as const;
export const MAX_GRAMS = 10_000;
export const MAX_FOOD_KCAL_PER_100 = 1_000;
export const MAX_FOOD_MACRO_PER_100 = 100;
export const MAX_GOAL_KCAL = 20_000;
export const MAX_GOAL_MACRO = 3_000;

export const MACRO_ROWS = [
  { key: "protein", label: "Proteína", shortLabel: "P", unit: "g" },
  { key: "carbs", label: "Carbohidratos", shortLabel: "C", unit: "g" },
  { key: "fat", label: "Grasa", shortLabel: "G", unit: "g" },
] as const;

export const RAW_BASIS_COPY =
  "Todos los pesos son en crudo y sin cáscara, huesos ni desperdicios.";
