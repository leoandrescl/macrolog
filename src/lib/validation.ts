import { z } from "zod";

import {
  MAX_FOOD_KCAL_PER_100,
  MAX_FOOD_MACRO_PER_100,
  MAX_GOAL_KCAL,
  MAX_GOAL_MACRO,
} from "@/lib/constants";
import { isValidDateKey } from "@/lib/dates";
import { parseDecimalInput } from "@/lib/parseNumber";
import type { ProfileColor } from "@/types/domain";

const optionalParsedNumber = (message: string) =>
  z.preprocess(parseDecimalInput, z.number({ error: message }).finite());

const nonNegativeNutritionInput = (
  max: number,
  label: string,
): z.ZodType<number, string | number | undefined> =>
  optionalParsedNumber(`Ingresa ${label}`).pipe(
    z.number().min(0, "No puede ser negativo").max(max, `Máximo ${max}`),
  ) as unknown as z.ZodType<number, string | number | undefined>;

export const profileColorSchema = z.enum(["lime", "sky", "violet", "amber", "rose"]);

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre al perfil")
    .max(40, "Máximo 40 caracteres"),
  color: profileColorSchema,
  kcal: nonNegativeNutritionInput(MAX_GOAL_KCAL, "las calorías objetivo").pipe(
    z.number().min(1, "Debe ser mayor que 0"),
  ),
  protein: nonNegativeNutritionInput(MAX_GOAL_MACRO, "la proteína"),
  carbs: nonNegativeNutritionInput(MAX_GOAL_MACRO, "los carbohidratos"),
  fat: nonNegativeNutritionInput(MAX_GOAL_MACRO, "la grasa"),
});

export type ProfileFormOutput = z.output<typeof profileFormSchema>;
export type ProfileFormInput = z.input<typeof profileFormSchema>;

export const foodFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre al alimento")
    .max(80, "Máximo 80 caracteres"),
  kcal: nonNegativeNutritionInput(MAX_FOOD_KCAL_PER_100, "las calorías por 100 g"),
  protein: nonNegativeNutritionInput(MAX_FOOD_MACRO_PER_100, "la proteína por 100 g"),
  carbs: nonNegativeNutritionInput(MAX_FOOD_MACRO_PER_100, "los carbohidratos por 100 g"),
  fat: nonNegativeNutritionInput(MAX_FOOD_MACRO_PER_100, "la grasa por 100 g"),
});

export type FoodFormOutput = z.output<typeof foodFormSchema>;
export type FoodFormInput = z.input<typeof foodFormSchema>;

export const mealNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre al bloque")
    .max(40, "Máximo 40 caracteres"),
});

export type MealNameInput = z.input<typeof mealNameSchema>;
export type MealNameOutput = z.output<typeof mealNameSchema>;

export const gramsSchema = z
  .number()
  .int("Usa gramos enteros")
  .positive("Debe ser mayor que 0")
  .max(10_000, "Máximo 10.000 g");

export const dateKeySchema = z
  .string()
  .refine(isValidDateKey, "Fecha inválida")
  .transform((value) => value as `${number}-${number}-${number}`);

export const nutritionSchema = z.object({
  kcal: z.number().finite().min(0),
  protein: z.number().finite().min(0),
  carbs: z.number().finite().min(0),
  fat: z.number().finite().min(0),
});

export const macroSplitPctSchema = z
  .object({
    protein: z.number().finite().min(0).max(100),
    carbs: z.number().finite().min(0).max(100),
    fat: z.number().finite().min(0).max(100),
  })
  .refine(
    (split) => Math.abs(split.protein + split.carbs + split.fat - 100) < 0.01,
    "La distribución debe sumar 100%",
  );

export const profileEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: profileColorSchema,
  goals: nutritionSchema,
  macroSplitPct: macroSplitPctSchema.optional(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

export const foodEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameNormalized: z.string(),
  per100: nutritionSchema,
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

export const mealEntitySchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().finite(),
  archivedAt: z.number().finite().optional(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

export const entryEntitySchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  date: dateKeySchema,
  mealId: z.string().min(1),
  foodId: z.string().min(1),
  foodName: z.string().min(1),
  grams: z.number().finite().positive(),
  per100: nutritionSchema,
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

export const metaRowSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const backupSchema = z.object({
  app: z.literal("macrolog"),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  activeProfileId: z.string().nullable(),
  data: z.object({
    profiles: z.array(profileEntitySchema),
    foods: z.array(foodEntitySchema),
    meals: z.array(mealEntitySchema),
    entries: z.array(entryEntitySchema),
    meta: z.array(metaRowSchema),
  }),
});

export function isProfileColor(value: unknown): value is ProfileColor {
  return profileColorSchema.safeParse(value).success;
}
