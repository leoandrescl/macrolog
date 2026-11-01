import { useEffect } from "react";

export function usePersistentStorage(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (!("storage" in navigator) || !navigator.storage.persist) return;

    let cancelled = false;
    void navigator.storage
      .persisted()
      .then((persisted) => {
        if (!cancelled && !persisted) return navigator.storage.persist();
        return false;
      })
      .catch(() => {
        /* La app sigue funcionando aunque el navegador no conceda persistencia. */
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
