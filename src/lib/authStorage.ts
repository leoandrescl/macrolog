import type { AuthUser } from "@/lib/api";

const AUTH_USER_KEY = "macrolog.auth.user";
const SYNC_KEY = "macrolog.sync";

export interface SyncMeta {
  ownerId: string | null;
  revision: number;
  dirty: boolean;
  lastSyncedAt: number | null;
}

export const EMPTY_SYNC_META: SyncMeta = {
  ownerId: null,
  revision: 0,
  dirty: false,
  lastSyncedAt: null,
};

export function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.name !== "string" ||
      typeof record.email !== "string"
    ) {
      return null;
    }
    return { id: record.id, name: record.name, email: record.email };
  } catch {
    return null;
  }
}

export function writeCachedUser(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    /* El estado offline no es imprescindible para iniciar sesión. */
  }
}

export function clearCachedUser(): void {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* noop */
  }
}

export function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return { ...EMPTY_SYNC_META };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_SYNC_META };
    const record = parsed as Record<string, unknown>;
    return {
      ownerId: typeof record.ownerId === "string" ? record.ownerId : null,
      revision:
        typeof record.revision === "number" && Number.isFinite(record.revision)
          ? Math.max(0, Math.floor(record.revision))
          : 0,
      dirty: record.dirty === true,
      lastSyncedAt:
        typeof record.lastSyncedAt === "number" && Number.isFinite(record.lastSyncedAt)
          ? record.lastSyncedAt
          : null,
    };
  } catch {
    return { ...EMPTY_SYNC_META };
  }
}

export function writeSyncMeta(meta: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(meta));
  } catch {
    /* La sincronización seguirá funcionando mientras la pestaña esté abierta. */
  }
}

export function clearSyncMeta(): void {
  try {
    localStorage.removeItem(SYNC_KEY);
  } catch {
    /* noop */
  }
}
