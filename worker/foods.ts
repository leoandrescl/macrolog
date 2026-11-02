import type { Env } from "./types";
import { HttpError, requireRecord } from "./utils";

export interface GlobalFood {
  id: string;
  name: string;
  nameNormalized: string;
  per100: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

interface FoodRow {
  id: string;
  name: string;
  name_normalized: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

const MAX_FOODS_PER_REQUEST = 2_000;
const BATCH_SIZE = 100;
const MAX_KCAL = 10_000;
const MAX_MACRO = 1_000;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function requireFoodString(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") {
    throw new HttpError(`${field} es obligatorio.`, 400, "invalid_food");
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(`${field} no tiene una longitud válida.`, 400, "invalid_food");
  }
  return trimmed;
}

function requireTimestamp(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpError(`${field} no es válido.`, 400, "invalid_food");
  }
  return value;
}

function requireNutrient(value: unknown, field: string, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpError(`${field} no es válido.`, 400, "invalid_food");
  }
  if (value > max) {
    throw new HttpError(`${field} supera el máximo permitido.`, 400, "invalid_food");
  }
  return value;
}

export function parseFood(value: unknown): GlobalFood {
  const food = requireRecord(value, "El alimento no es válido.");
  const id = requireFoodString(food.id, "El identificador del alimento", 1, 100);
  const name = requireFoodString(food.name, "El nombre del alimento", 1, 80);
  const per100 = requireRecord(food.per100, "Los valores nutricionales no son válidos.");

  const parsed: GlobalFood = {
    id,
    name,
    nameNormalized: normalizeText(name),
    per100: {
      kcal: requireNutrient(per100.kcal, "Las calorías", MAX_KCAL),
      protein: requireNutrient(per100.protein, "La proteína", MAX_MACRO),
      carbs: requireNutrient(per100.carbs, "Los carbohidratos", MAX_MACRO),
      fat: requireNutrient(per100.fat, "La grasa", MAX_MACRO),
    },
    createdAt: requireTimestamp(food.createdAt, "La fecha de creación"),
    updatedAt: requireTimestamp(food.updatedAt, "La fecha de actualización"),
  };

  if (food.deletedAt !== undefined && food.deletedAt !== null) {
    parsed.deletedAt = requireTimestamp(food.deletedAt, "La fecha de eliminación");
  }

  return parsed;
}

export function parseFoodsPayload(value: unknown): GlobalFood[] {
  const body = requireRecord(value, "La solicitud no es válida.");
  if (!Array.isArray(body.foods)) {
    throw new HttpError("La lista de alimentos no es válida.", 400, "invalid_food");
  }
  if (body.foods.length > MAX_FOODS_PER_REQUEST) {
    throw new HttpError(
      "Se enviaron demasiados alimentos en una sola solicitud.",
      413,
      "payload_too_large",
    );
  }

  const byId = new Map<string, GlobalFood>();
  for (const item of body.foods) {
    const food = parseFood(item);
    const current = byId.get(food.id);
    if (!current || food.updatedAt > current.updatedAt) byId.set(food.id, food);
  }

  return [...byId.values()];
}

function toGlobalFood(row: FoodRow): GlobalFood {
  const food: GlobalFood = {
    id: row.id,
    name: row.name,
    nameNormalized: row.name_normalized,
    per100: {
      kcal: row.kcal,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (typeof row.deleted_at === "number") food.deletedAt = row.deleted_at;
  return food;
}

export async function listFoods(
  env: Env,
): Promise<{ foods: GlobalFood[]; updatedAt: number }> {
  const result = await env.DB.prepare(
    "SELECT id, name, name_normalized, kcal, protein, carbs, fat, " +
      "created_at, updated_at, deleted_at FROM foods " +
      "ORDER BY name_normalized ASC, id ASC",
  ).all<FoodRow>();

  let updatedAt = 0;
  const foods = (result.results ?? []).map((row) => {
    updatedAt = Math.max(updatedAt, row.updated_at);
    return toGlobalFood(row);
  });

  return { foods, updatedAt };
}

export async function upsertFoods(env: Env, foods: GlobalFood[]): Promise<number> {
  if (!foods.length) return 0;

  const statement = env.DB.prepare(
    "INSERT INTO foods (id, name, name_normalized, kcal, protein, carbs, fat, " +
      "created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET " +
      "name = excluded.name, name_normalized = excluded.name_normalized, " +
      "kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs, " +
      "fat = excluded.fat, created_at = excluded.created_at, " +
      "updated_at = excluded.updated_at, deleted_at = excluded.deleted_at " +
      "WHERE excluded.updated_at > foods.updated_at",
  );

  let updated = 0;
  for (let start = 0; start < foods.length; start += BATCH_SIZE) {
    const chunk = foods.slice(start, start + BATCH_SIZE);
    const results = await env.DB.batch(
      chunk.map((food) =>
        statement.bind(
          food.id,
          food.name,
          food.nameNormalized,
          food.per100.kcal,
          food.per100.protein,
          food.per100.carbs,
          food.per100.fat,
          food.createdAt,
          food.updatedAt,
          food.deletedAt ?? null,
        ),
      ),
    );

    for (const result of results) {
      updated += result.meta.changes ?? 0;
    }
  }

  return updated;
}

/**
 * Migra alimentos que versiones anteriores enviaban dentro del snapshot
 * privado. Los registros inválidos se omiten para no bloquear la cuenta.
 */
export async function importLegacyFoods(env: Env, values: unknown[]): Promise<void> {
  if (!values.length) return;

  const parsed: GlobalFood[] = [];
  for (const value of values) {
    try {
      parsed.push(parseFood(value));
    } catch {
      /* Ignorar datos antiguos inválidos. */
    }
  }

  await upsertFoods(env, parsed);
}
