import { useRegisterSW } from "virtual:pwa-register/react";
import { LoaderCircle, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ACTIVATION_TIMEOUT_MS = 4_000;

export function PwaUpdater() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null;
    },
  });

  useEffect(() => {
    const checkForUpdate = () => {
      if (document.visibilityState === "visible") {
        void registrationRef.current?.update();
      }
    };

    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      window.removeEventListener("focus", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  if (!needRefresh) return null;

  const activateUpdate = async () => {
    setUpdating(true);
    setError(null);

    try {
      if (!("serviceWorker" in navigator)) {
        window.location.reload();
        return;
      }

      let registration =
        registrationRef.current ?? (await navigator.serviceWorker.getRegistration());

      if (!registration) {
        window.location.reload();
        return;
      }

      if (!registration.waiting) {
        await registration.update().catch(() => undefined);
        registration = (await navigator.serviceWorker.getRegistration()) ?? registration;
      }

      const waiting = registration.waiting;
      if (!waiting) {
        window.location.reload();
        return;
      }

      const controllerBefore = navigator.serviceWorker.controller;

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          window.clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            handleControllerChange,
          );
        };

        const handleControllerChange = () => {
          cleanup();
          resolve();
        };

        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("La actualización tardó demasiado en activarse."));
        }, ACTIVATION_TIMEOUT_MS);

        navigator.serviceWorker.addEventListener(
          "controllerchange",
          handleControllerChange,
        );

        waiting.postMessage({ type: "SKIP_WAITING" });

        if (
          navigator.serviceWorker.controller &&
          navigator.serviceWorker.controller !== controllerBefore
        ) {
          cleanup();
          resolve();
        }
      });

      window.location.reload();
    } catch {
      setUpdating(false);
      setError("No se pudo activar. Cierra la app y vuelve a abrirla.");
    }
  };

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex items-center gap-3 rounded-2xl border border-line bg-surface-2/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
      role="status"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Nueva versión disponible</p>
        <p
          aria-live="polite"
          className={`mt-0.5 text-xs ${error ? "text-danger" : "text-muted"}`}
        >
          {error ?? "Actualiza para recibir las mejoras."}
        </p>
      </div>
      <button
        type="button"
        disabled={updating}
        className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:pointer-events-none disabled:opacity-60"
        onClick={() => void activateUpdate()}
      >
        {updating ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        {updating ? "Actualizando…" : error ? "Reintentar" : "Actualizar"}
      </button>
      <button
        type="button"
        aria-label="Cerrar aviso de actualización"
        disabled={updating}
        className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-fg disabled:opacity-50"
        onClick={() => setNeedRefresh(false)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
