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

import { db } from "@/db/db";
import { mergeFoodsIntoLibrary } from "@/db/repositories/foods.repo";
import { ApiError, fetchGlobalFoods, NetworkError, pushGlobalFoods } from "@/lib/api";
import { onFoodsChange, withoutLocalChangeNotifications } from "@/lib/syncEvents";

const FOODS_SYNC_KEY = "macrolog.foods.sync";
const RETRY_DELAY_MS = 4_000;

export type FoodsSyncStatus = "loading" | "ready" | "offline" | "error";

interface GlobalFoodsContextValue {
  status: FoodsSyncStatus;
  lastSyncedAt: number | null;
  syncNow: () => Promise<boolean>;
}

const GlobalFoodsContext = createContext<GlobalFoodsContextValue | null>(null);

function readLastSyncedAt(): number | null {
  try {
    const raw = localStorage.getItem(FOODS_SYNC_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = (parsed as Record<string, unknown>).lastSyncedAt;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeLastSyncedAt(timestamp: number): void {
  try {
    localStorage.setItem(FOODS_SYNC_KEY, JSON.stringify({ lastSyncedAt: timestamp }));
  } catch {
    /* La sincronización sigue funcionando en esta pestaña. */
  }
}

/**
 * La biblioteca de alimentos es global para todas las cuentas y perfiles.
 * Se sincroniza aparte del snapshot privado de la cuenta:
 * 1. sube los alimentos locales (incluidos los de versiones anteriores),
 * 2. descarga la biblioteca global,
 * 3. fusiona por ID conservando el updatedAt más reciente.
 *
 * Las sincronizaciones periódicas solo descargan; la subida ocurre al
 * cambiar un alimento para no reescribir toda la tabla cada minuto.
 */
export function GlobalFoodsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<FoodsSyncStatus>("loading");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(readLastSyncedAt);

  const inFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);
  const debounceRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const changeSeqRef = useRef(0);
  const syncRef = useRef<(mode: "full" | "pull") => Promise<boolean>>(async () => false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const performSync = useCallback(async (mode: "full" | "pull"): Promise<boolean> => {
    if (inFlightPromiseRef.current) {
      // Si un cambio local coincide con un pull, repetir en modo completo.
      if (mode === "full") dirtyRef.current = true;
      return inFlightPromiseRef.current;
    }

    if (!navigator.onLine) {
      dirtyRef.current = true;
      if (mountedRef.current) setStatus("offline");
      return false;
    }

    const changeSeqAtStart = changeSeqRef.current;

    const run = async (): Promise<boolean> => {
      try {
        if (mode === "full") {
          const localFoods = await db.foods.toArray();
          if (localFoods.length) await pushGlobalFoods(localFoods);
        }

        const remote = await fetchGlobalFoods();
        await withoutLocalChangeNotifications(async () => {
          await mergeFoodsIntoLibrary(remote.foods);
        });

        const syncedAt = remote.updatedAt || Date.now();
        writeLastSyncedAt(syncedAt);

        // Solo se limpia si no hubo cambios durante esta sincronización.
        if (changeSeqRef.current === changeSeqAtStart) dirtyRef.current = false;

        if (mountedRef.current) {
          setLastSyncedAt(syncedAt);
          setStatus("ready");
        }
        return true;
      } catch (error) {
        dirtyRef.current = true;
        if (!mountedRef.current) return false;

        if (error instanceof NetworkError || !navigator.onLine) {
          setStatus("offline");
        } else if (error instanceof ApiError && error.status === 401) {
          setStatus("error");
        } else {
          setStatus("error");
        }
        return false;
      } finally {
        inFlightPromiseRef.current = null;

        if (dirtyRef.current && mountedRef.current && navigator.onLine) {
          window.setTimeout(() => {
            if (!inFlightPromiseRef.current) void syncRef.current("full");
          }, RETRY_DELAY_MS);
        }
      }
    };

    const promise = run();
    inFlightPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    syncRef.current = performSync;
  }, [performSync]);

  useEffect(() => {
    void performSync("full");
  }, [performSync]);

  useEffect(() => {
    const unsubscribe = onFoodsChange(() => {
      changeSeqRef.current += 1;
      dirtyRef.current = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void performSync("full");
      }, 1200);
    });

    return unsubscribe;
  }, [performSync]);

  useEffect(() => {
    const sync = () => {
      void performSync(dirtyRef.current ? "full" : "pull");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") sync();
    }, 60_000);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [performSync]);

  const syncNow = useCallback(
    () => performSync(dirtyRef.current ? "full" : "pull"),
    [performSync],
  );

  const value = useMemo<GlobalFoodsContextValue>(
    () => ({ status, lastSyncedAt, syncNow }),
    [lastSyncedAt, status, syncNow],
  );

  return (
    <GlobalFoodsContext.Provider value={value}>{children}</GlobalFoodsContext.Provider>
  );
}

export function useGlobalFoods(): GlobalFoodsContextValue {
  const context = useContext(GlobalFoodsContext);
  if (!context) {
    throw new Error("useGlobalFoods debe usarse dentro de GlobalFoodsProvider.");
  }
  return context;
}
