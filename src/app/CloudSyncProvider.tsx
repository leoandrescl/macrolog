import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SplashScreen } from "@/components/layout/SplashScreen";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { clearAllData, createBackup, restoreBackup } from "@/db/repositories/backup.repo";
import {
  ApiError,
  type AuthUser,
  type CloudSnapshot,
  deleteCloudData,
  fetchCloudData,
  NetworkError,
  putCloudData,
} from "@/lib/api";
import { readSyncMeta, type SyncMeta, writeSyncMeta } from "@/lib/authStorage";
import { mergeSnapshots } from "@/lib/cloudMerge";
import { onLocalDataChange, withoutLocalChangeNotifications } from "@/lib/syncEvents";
import type { BackupFile } from "@/types/domain";

export type SyncStatus = "loading" | "ready" | "pending" | "offline" | "error";

interface CloudSyncContextValue {
  status: SyncStatus;
  pending: boolean;
  lastSyncedAt: number | null;
  errorMessage: string | null;
  syncNow: () => Promise<boolean>;
  deleteAllCloudData: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

function hasContent(snapshot: CloudSnapshot): boolean {
  return (
    snapshot.data.profiles.length > 0 ||
    snapshot.data.foods.length > 0 ||
    snapshot.data.meals.length > 0 ||
    snapshot.data.entries.length > 0
  );
}

async function loadLocalSnapshot(): Promise<CloudSnapshot> {
  const backup = await createBackup();
  return {
    activeProfileId: backup.activeProfileId,
    data: backup.data,
  };
}

async function applySnapshot(snapshot: CloudSnapshot): Promise<void> {
  const backup: BackupFile = {
    app: "macrolog",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    activeProfileId: snapshot.activeProfileId,
    data: snapshot.data,
  };
  await withoutLocalChangeNotifications(async () => {
    await restoreBackup(backup);
  });
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) {
    return "Tu sesión expiró. Recarga la página para volver a iniciar sesión.";
  }
  if (error instanceof NetworkError) {
    return "No pudimos conectar. Revisa tu conexión e intenta de nuevo.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "No se pudieron cargar tus datos.";
}

function SyncErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo size={48} showText={false} />
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">
        No pudimos cargar tus datos
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{message}</p>
      <Button className="mt-5" onClick={onRetry}>
        Reintentar
      </Button>
    </main>
  );
}

export function CloudSyncProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [initialized, setInitialized] = useState(false);
  const [pending, setPending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const metaRef = useRef<SyncMeta>(readSyncMeta());
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);
  const deletingRef = useRef(false);

  const persistMeta = useCallback((patch: Partial<SyncMeta>) => {
    const next = { ...metaRef.current, ...patch };
    metaRef.current = next;
    writeSyncMeta(next);
    if (!mountedRef.current) return;
    setPending(next.dirty);
    setLastSyncedAt(next.lastSyncedAt);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const pushNow = useCallback(async (): Promise<boolean> => {
    if (deletingRef.current) return false;
    if (inFlightRef.current && inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }
    if (!navigator.onLine) {
      setStatus("offline");
      return false;
    }

    const run = async (): Promise<boolean> => {
      inFlightRef.current = true;
      try {
        const local = await loadLocalSnapshot();
        try {
          const result = await putCloudData(local, metaRef.current.revision);
          persistMeta({
            ownerId: user.id,
            revision: result.revision,
            dirty: false,
            lastSyncedAt: result.updatedAt,
          });
          setStatus("ready");
          setErrorMessage(null);
          return true;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;

          const remote = await fetchCloudData();
          if (!remote.snapshot) {
            const result = await putCloudData(local, 0);
            persistMeta({
              ownerId: user.id,
              revision: result.revision,
              dirty: false,
              lastSyncedAt: result.updatedAt,
            });
            setStatus("ready");
            return true;
          }

          const merged = mergeSnapshots(local, remote.snapshot);
          await applySnapshot(merged);
          const result = await putCloudData(merged, remote.revision);
          persistMeta({
            ownerId: user.id,
            revision: result.revision,
            dirty: false,
            lastSyncedAt: result.updatedAt,
          });
          setStatus("ready");
          setErrorMessage(null);
          return true;
        }
      } catch (error) {
        persistMeta({ dirty: true });
        if (error instanceof ApiError && error.status === 401) {
          setStatus("error");
          setErrorMessage(errorText(error));
        } else if (error instanceof NetworkError || !navigator.onLine) {
          setStatus("offline");
        } else {
          setStatus("error");
          setErrorMessage("No se pudieron guardar los cambios. Se reintentará.");
        }
        return false;
      } finally {
        inFlightRef.current = false;
        inFlightPromiseRef.current = null;
      }
    };

    const promise = run();
    inFlightPromiseRef.current = promise;
    return promise;
  }, [persistMeta, user.id]);

  const schedulePush = useCallback(() => {
    if (!initializedRef.current || deletingRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    timerRef.current = window.setTimeout(() => {
      void pushNow();
    }, 1100);
  }, [pushNow]);

  useEffect(() => {
    let cancelled = false;

    const runInitialSync = async () => {
      setStatus("loading");
      setErrorMessage(null);
      setInitialized(false);
      initializedRef.current = false;
      metaRef.current = readSyncMeta();
      setPending(metaRef.current.dirty);
      setLastSyncedAt(metaRef.current.lastSyncedAt);

      let local = await loadLocalSnapshot();

      if (metaRef.current.ownerId && metaRef.current.ownerId !== user.id) {
        await withoutLocalChangeNotifications(async () => {
          await clearAllData();
        });
        local = {
          activeProfileId: null,
          data: { profiles: [], foods: [], meals: [], entries: [], meta: [] },
        };
        persistMeta({ ownerId: null, revision: 0, dirty: false, lastSyncedAt: null });
      }

      const localHasContent = hasContent(local);

      if (!navigator.onLine) {
        if (
          localHasContent &&
          (!metaRef.current.ownerId || metaRef.current.ownerId === user.id)
        ) {
          persistMeta({
            ownerId: user.id,
            dirty: true,
            lastSyncedAt: metaRef.current.lastSyncedAt,
          });
          setStatus("offline");
          if (cancelled || !mountedRef.current) return;
          initializedRef.current = true;
          setInitialized(true);
          return;
        }

        setStatus("error");
        setErrorMessage(
          "Necesitas conexión para cargar tu cuenta por primera vez en este dispositivo.",
        );
        return;
      }

      try {
        const remote = await fetchCloudData();
        if (cancelled || !mountedRef.current) return;

        if (!remote.snapshot) {
          if (localHasContent) {
            persistMeta({
              ownerId: user.id,
              revision: 0,
              dirty: true,
              lastSyncedAt: metaRef.current.lastSyncedAt,
            });
            try {
              const result = await putCloudData(local, 0);
              persistMeta({
                ownerId: user.id,
                revision: result.revision,
                dirty: false,
                lastSyncedAt: result.updatedAt,
              });
              setStatus("ready");
            } catch {
              setStatus(navigator.onLine ? "pending" : "offline");
            }
          } else {
            persistMeta({
              ownerId: user.id,
              revision: 0,
              dirty: false,
              lastSyncedAt: null,
            });
            setStatus("ready");
          }
        } else {
          const ownerMatches =
            !metaRef.current.ownerId || metaRef.current.ownerId === user.id;
          const shouldMerge =
            ownerMatches &&
            localHasContent &&
            (metaRef.current.ownerId === null || metaRef.current.dirty);

          if (shouldMerge) {
            const merged = mergeSnapshots(local, remote.snapshot);
            await applySnapshot(merged);
            if (cancelled || !mountedRef.current) return;
            persistMeta({
              ownerId: user.id,
              revision: remote.revision,
              dirty: true,
              lastSyncedAt: metaRef.current.lastSyncedAt,
            });
            try {
              const result = await putCloudData(merged, remote.revision);
              persistMeta({
                ownerId: user.id,
                revision: result.revision,
                dirty: false,
                lastSyncedAt: result.updatedAt,
              });
              setStatus("ready");
            } catch {
              setStatus(navigator.onLine ? "pending" : "offline");
            }
          } else {
            await applySnapshot(remote.snapshot);
            if (cancelled || !mountedRef.current) return;
            persistMeta({
              ownerId: user.id,
              revision: remote.revision,
              dirty: false,
              lastSyncedAt: remote.updatedAt,
            });
            setStatus("ready");
          }
        }
      } catch (error) {
        if (cancelled || !mountedRef.current) return;

        if (localHasContent && !(error instanceof ApiError && error.status === 401)) {
          persistMeta({
            ownerId: user.id,
            dirty: true,
            lastSyncedAt: metaRef.current.lastSyncedAt,
          });
          setStatus("offline");
        } else {
          setStatus("error");
          setErrorMessage(errorText(error));
          return;
        }
      }

      if (cancelled || !mountedRef.current) return;
      initializedRef.current = true;
      setInitialized(true);
    };

    void runInitialSync();

    return () => {
      cancelled = true;
    };
  }, [persistMeta, user.id]);

  useEffect(() => {
    if (!initialized) return;

    const unsubscribe = onLocalDataChange(() => {
      if (deletingRef.current) return;
      persistMeta({ ownerId: user.id, dirty: true });
      setStatus(navigator.onLine ? "pending" : "offline");
      schedulePush();
    });

    return unsubscribe;
  }, [initialized, persistMeta, schedulePush, user.id]);

  useEffect(() => {
    if (!initialized) return;

    const retry = () => {
      if (metaRef.current.dirty) void pushNow();
      else if (navigator.onLine) setStatus("ready");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") retry();
    };

    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [initialized, pushNow]);

  useEffect(() => {
    if (!initialized || !pending || !navigator.onLine) return;

    const interval = window.setInterval(() => {
      if (metaRef.current.dirty && !inFlightRef.current) {
        void pushNow();
      }
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [initialized, pending, pushNow]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!metaRef.current.dirty) return true;
    if (!navigator.onLine) {
      setStatus("offline");
      return false;
    }
    return pushNow();
  }, [pushNow]);

  const deleteAllCloudData = useCallback(async (): Promise<void> => {
    deletingRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);

    try {
      if (inFlightPromiseRef.current) {
        await inFlightPromiseRef.current.catch(() => undefined);
      }
      await deleteCloudData();
      await withoutLocalChangeNotifications(async () => {
        await clearAllData();
      });
      persistMeta({
        ownerId: user.id,
        revision: 0,
        dirty: false,
        lastSyncedAt: null,
      });
      setStatus("ready");
      setErrorMessage(null);
    } finally {
      deletingRef.current = false;
    }
  }, [persistMeta, user.id]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      status,
      pending,
      lastSyncedAt,
      errorMessage,
      syncNow,
      deleteAllCloudData,
    }),
    [deleteAllCloudData, errorMessage, lastSyncedAt, pending, status, syncNow],
  );

  if (!initialized) {
    if (status === "error") {
      return (
        <SyncErrorScreen
          message={errorMessage ?? "No pudimos cargar tus datos."}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return <SplashScreen message="Cargando tu cuenta y tus perfiles..." />;
  }

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error("useCloudSync debe usarse dentro de CloudSyncProvider.");
  }
  return context;
}
