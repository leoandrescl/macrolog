import { importLegacyFoods } from "./foods";
import type { Env } from "./types";
import {
  DATA_BLOB_LIMIT,
  gunzipString,
  gzipString,
  HttpError,
  requireRecord,
} from "./utils";

export interface CloudSnapshot {
  activeProfileId: string | null;
  data: {
    profiles: unknown[];
    meals: unknown[];
    entries: unknown[];
    meta: unknown[];
    /** Solo por compatibilidad con versiones que subían alimentos por cuenta. */
    foods?: unknown[];
  };
}

const SNAPSHOT_FIELDS = ["profiles", "meals", "entries", "meta"] as const;

export function validateSnapshot(value: unknown): CloudSnapshot {
  const snapshot = requireRecord(value, "El snapshot no es válido.");
  const activeProfileId = snapshot.activeProfileId;
  if (activeProfileId !== null && typeof activeProfileId !== "string") {
    throw new HttpError("El perfil activo del snapshot no es válido.", 400);
  }

  const data = requireRecord(snapshot.data, "Los datos del snapshot no son válidos.");
  for (const field of SNAPSHOT_FIELDS) {
    if (!Array.isArray(data[field])) {
      throw new HttpError(`La colección ${field} no es válida.`, 400);
    }
  }

  if (data.foods !== undefined && !Array.isArray(data.foods)) {
    throw new HttpError("La colección foods no es válida.", 400);
  }

  return snapshot as unknown as CloudSnapshot;
}

function withoutFoods(snapshot: CloudSnapshot): CloudSnapshot {
  return {
    activeProfileId: snapshot.activeProfileId,
    data: {
      profiles: snapshot.data.profiles,
      meals: snapshot.data.meals,
      entries: snapshot.data.entries,
      meta: snapshot.data.meta,
    },
  };
}

export async function loadSnapshot(
  env: Env,
  userId: string,
): Promise<{ snapshot: CloudSnapshot | null; revision: number; updatedAt: number }> {
  const row = await env.DB.prepare(
    "SELECT payload, revision, updated_at FROM user_data WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ payload: ArrayBuffer | Uint8Array; revision: number; updated_at: number }>();

  if (!row) {
    return { snapshot: null, revision: 0, updatedAt: 0 };
  }

  try {
    const text = await gunzipString(row.payload);
    const snapshot = validateSnapshot(JSON.parse(text));

    // Migración transparente: los alimentos antiguos pasan a la tabla global.
    if (Array.isArray(snapshot.data.foods) && snapshot.data.foods.length) {
      await importLegacyFoods(env, snapshot.data.foods);
    }

    return {
      snapshot: withoutFoods(snapshot),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  } catch {
    throw new HttpError("No se pudo leer el respaldo en la nube.", 500, "storage_error");
  }
}

export async function saveSnapshot(
  env: Env,
  userId: string,
  snapshot: CloudSnapshot,
  baseRevision: number,
): Promise<{ revision: number; updatedAt: number }> {
  if (Array.isArray(snapshot.data.foods) && snapshot.data.foods.length) {
    await importLegacyFoods(env, snapshot.data.foods);
  }

  const json = JSON.stringify(withoutFoods(snapshot));
  if (new TextEncoder().encode(json).byteLength > 8_000_000) {
    throw new HttpError(
      "El respaldo supera el tamaño permitido.",
      413,
      "payload_too_large",
    );
  }

  const compressed = await gzipString(json);
  if (compressed.byteLength > DATA_BLOB_LIMIT) {
    throw new HttpError(
      "El respaldo es demasiado grande. Contacta al administrador.",
      413,
      "payload_too_large",
    );
  }

  const now = Date.now();
  const result =
    baseRevision === 0
      ? await env.DB.prepare(
          "INSERT INTO user_data (user_id, payload, revision, updated_at) VALUES (?, ?, 1, ?) " +
            "ON CONFLICT(user_id) DO NOTHING",
        )
          .bind(userId, compressed, now)
          .run()
      : await env.DB.prepare(
          "UPDATE user_data SET payload = ?, revision = revision + 1, updated_at = ? " +
            "WHERE user_id = ? AND revision = ?",
        )
          .bind(compressed, now, userId, baseRevision)
          .run();

  if (result.meta.changes === 0) {
    throw new HttpError(
      "Hay cambios más recientes en otro dispositivo. Se volverá a sincronizar.",
      409,
      "conflict",
    );
  }

  return { revision: baseRevision + 1, updatedAt: now };
}

export async function removeSnapshot(env: Env, userId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM user_data WHERE user_id = ?").bind(userId).run();
}
