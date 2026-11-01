import type { MacroSplitPct, Nutrition } from "@/types/domain";

export type MacroPresetId =
  | "balanced"
  | "high-protein"
  | "performance"
  | "metabolic"
  | "high-energy";

export interface MacroSplitPreset {
  id: MacroPresetId;
  name: string;
  description: string;
  split: MacroSplitPct;
}

export const MACRO_SPLIT_PRESETS: readonly MacroSplitPreset[] = [
  {
    id: "balanced",
    name: "Equilibrado",
    description: "Recomposición general",
    split: { protein: 30, carbs: 40, fat: 30 },
  },
  {
    id: "high-protein",
    name: "Alta proteína",
    description: "Control glucémico",
    split: { protein: 30, carbs: 45, fat: 25 },
  },
  {
    id: "performance",
    name: "Rendimiento",
    description: "Carbohidratos moderados-altos",
    split: { protein: 25, carbs: 50, fat: 25 },
  },
  {
    id: "metabolic",
    name: "Metabólico",
    description: "Glucosa baja",
    split: { protein: 35, carbs: 35, fat: 30 },
  },
  {
    id: "high-energy",
    name: "Alta energía",
    description: "Tolerancia alta a carbohidratos",
    split: { protein: 20, carbs: 55, fat: 25 },
  },
];

export const DEFAULT_MACRO_PRESET_ID: MacroPresetId = "balanced";

export function getMacroSplitPreset(id: MacroPresetId | null): MacroSplitPreset | null {
  if (!id) return null;
  return MACRO_SPLIT_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function findMacroSplitPresetId(
  split?: MacroSplitPct | null,
): MacroPresetId | null {
  if (!split) return null;

  return (
    MACRO_SPLIT_PRESETS.find(
      (preset) =>
        preset.split.protein === split.protein &&
        preset.split.carbs === split.carbs &&
        preset.split.fat === split.fat,
    )?.id ?? null
  );
}

/**
 * Convierte calorías + porcentajes a gramos objetivo.
 * Se redondea a gramo entero para que la meta sea cómoda de leer y registrar.
 */
export function gramsFromCaloriesAndSplit(kcal: number, split: MacroSplitPct): Nutrition {
  const safeKcal = Number.isFinite(kcal) ? Math.max(0, kcal) : 0;

  return {
    kcal: safeKcal,
    protein: Math.round((safeKcal * split.protein) / 100 / 4),
    carbs: Math.round((safeKcal * split.carbs) / 100 / 4),
    fat: Math.round((safeKcal * split.fat) / 100 / 9),
  };
}

export function formatSplitLabel(split: MacroSplitPct): string {
  return `P${split.protein}% · C${split.carbs}% · G${split.fat}%`;
}

export function formatSplitPercentages(split: MacroSplitPct): string {
  return `P ${split.protein}% · C ${split.carbs}% · G ${split.fat}%`;
}
