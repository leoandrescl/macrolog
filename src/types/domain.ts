export type Id = string;

/** Fecha local en formato YYYY-MM-DD. Nunca usar fechas UTC para el diario. */
export type DateKey = `${number}-${number}-${number}`;

export type ProfileColor = "lime" | "sky" | "violet" | "amber" | "rose";

export type ThemePreference = "dark" | "light" | "system";

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Porcentaje de calorías diarias asignado a cada macro. Debe sumar 100. */
export interface MacroSplitPct {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  id: Id;
  name: string;
  color: ProfileColor;
  goals: Nutrition;
  /** Distribución activa para recalcular macros al cambiar las calorías. */
  macroSplitPct?: MacroSplitPct;
  createdAt: number;
  updatedAt: number;
}

export interface Food {
  id: Id;
  name: string;
  nameNormalized: string;
  /** Valores por 100 g de alimento en crudo y limpio. */
  per100: Nutrition;
  /** Peso de una porción casera, por ejemplo 50 g para una rebanada de pan. */
  portionGrams?: number;
  createdAt: number;
  updatedAt: number;
  /** Borrado lógico global: conserva el historial y propaga la eliminación. */
  deletedAt?: number;
}

export interface MealBlock {
  id: Id;
  profileId: Id;
  name: string;
  sortOrder: number;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DiaryEntry {
  id: Id;
  profileId: Id;
  date: DateKey;
  mealId: Id;
  foodId: Id;
  /** Snapshot para que editar o eliminar el alimento no altere el historial. */
  foodName: string;
  grams: number;
  per100: Nutrition;
  /** Snapshot del tamaño de porción vigente al registrar la comida. */
  portionGrams?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface BackupData {
  profiles: Profile[];
  foods: Food[];
  meals: MealBlock[];
  entries: DiaryEntry[];
  meta: MetaRow[];
}

export interface BackupFile {
  app: "macrolog";
  schemaVersion: 1;
  exportedAt: string;
  activeProfileId: string | null;
  data: BackupData;
}
