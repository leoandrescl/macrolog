import { db } from "@/db/db";
import { ACTIVE_PROFILE_KEY, SCHEMA_VERSION } from "@/lib/constants";
import { formatFileDate } from "@/lib/format";
import { backupSchema } from "@/lib/validation";
import type { BackupFile } from "@/types/domain";

export async function createBackup(): Promise<BackupFile> {
  const [profiles, foods, meals, entries, meta] = await Promise.all([
    db.profiles.toArray(),
    db.foods.toArray(),
    db.meals.toArray(),
    db.entries.toArray(),
    db.meta.toArray(),
  ]);

  const activeMeta = meta.find((row) => row.key === ACTIVE_PROFILE_KEY);
  const activeProfileId =
    typeof activeMeta?.value === "string" &&
    profiles.some((profile) => profile.id === activeMeta.value)
      ? activeMeta.value
      : (profiles[0]?.id ?? null);

  return {
    app: "macrolog",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    activeProfileId,
    data: { profiles, foods, meals, entries, meta },
  };
}

export function backupFileName(): string {
  return `macrolog-respaldo-${formatFileDate()}.json`;
}

export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = backupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("El archivo es demasiado grande (máximo 25 MB).");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("El archivo no contiene un JSON válido.");
  }

  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "El archivo no es un respaldo válido de MacroLog o pertenece a una versión incompatible.",
    );
  }

  return parsed.data as BackupFile;
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  const profileIds = new Set(backup.data.profiles.map((profile) => profile.id));
  const mealIds = new Set(backup.data.meals.map((meal) => meal.id));

  for (const meal of backup.data.meals) {
    if (!profileIds.has(meal.profileId)) {
      throw new Error("El respaldo contiene bloques de comida sin perfil.");
    }
  }

  for (const entry of backup.data.entries) {
    if (!profileIds.has(entry.profileId)) {
      throw new Error("El respaldo contiene registros sin perfil.");
    }
    if (!mealIds.has(entry.mealId)) {
      throw new Error("El respaldo contiene registros sin bloque de comida.");
    }
  }

  const activeProfileId =
    backup.activeProfileId && profileIds.has(backup.activeProfileId)
      ? backup.activeProfileId
      : (backup.data.profiles[0]?.id ?? null);

  const meta = backup.data.meta.filter((row) => row.key !== ACTIVE_PROFILE_KEY);
  if (activeProfileId) {
    meta.push({ key: ACTIVE_PROFILE_KEY, value: activeProfileId });
  }

  await db.transaction(
    "rw",
    db.profiles,
    db.foods,
    db.meals,
    db.entries,
    db.meta,
    async () => {
      await db.profiles.clear();
      await db.foods.clear();
      await db.meals.clear();
      await db.entries.clear();
      await db.meta.clear();

      await db.profiles.bulkPut(backup.data.profiles);
      await db.foods.bulkPut(backup.data.foods);
      await db.meals.bulkPut(backup.data.meals);
      await db.entries.bulkPut(backup.data.entries);
      if (meta.length) await db.meta.bulkPut(meta);
    },
  );
}

export async function clearAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.profiles,
    db.foods,
    db.meals,
    db.entries,
    db.meta,
    async () => {
      await db.profiles.clear();
      await db.foods.clear();
      await db.meals.clear();
      await db.entries.clear();
      await db.meta.clear();
    },
  );
}
