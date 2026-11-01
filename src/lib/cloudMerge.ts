import type { CloudSnapshot } from "@/lib/api";
import type { DiaryEntry, Food, MealBlock, MetaRow, Profile } from "@/types/domain";

interface Entity {
  id: string;
  updatedAt: number;
}

function mergeEntities<T extends Entity>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();

  for (const item of remote) merged.set(item.id, item);

  for (const item of local) {
    const current = merged.get(item.id);
    if (!current || item.updatedAt > current.updatedAt) {
      merged.set(item.id, item);
    }
  }

  return [...merged.values()].sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Resolución de conflictos pragmática para una cuenta familiar:
 * une registros por ID y conserva la versión con updatedAt más reciente.
 * Las eliminaciones concurrentes pueden resucitar un registro, pero nunca
 * se descarta información nueva de ninguno de los dos dispositivos.
 */
export function mergeSnapshots(
  local: CloudSnapshot,
  remote: CloudSnapshot,
): CloudSnapshot {
  const profiles = mergeEntities<Profile>(local.data.profiles, remote.data.profiles);
  const foods = mergeEntities<Food>(local.data.foods, remote.data.foods);
  const meals = mergeEntities<MealBlock>(local.data.meals, remote.data.meals);
  const entries = mergeEntities<DiaryEntry>(local.data.entries, remote.data.entries);

  const metaMap = new Map<string, MetaRow>();
  for (const row of remote.data.meta) metaMap.set(row.key, row);
  for (const row of local.data.meta) metaMap.set(row.key, row);

  const profileIds = new Set(profiles.map((profile) => profile.id));
  const activeProfileId =
    (local.activeProfileId && profileIds.has(local.activeProfileId)
      ? local.activeProfileId
      : null) ??
    (remote.activeProfileId && profileIds.has(remote.activeProfileId)
      ? remote.activeProfileId
      : null) ??
    profiles[0]?.id ??
    null;

  metaMap.set("activeProfileId", { key: "activeProfileId", value: activeProfileId });

  return {
    activeProfileId,
    data: {
      profiles,
      foods,
      meals,
      entries,
      meta: [...metaMap.values()].sort((left, right) =>
        left.key.localeCompare(right.key),
      ),
    },
  };
}
