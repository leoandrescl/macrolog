import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(
        () => {
          void registration.update();
        },
        60 * 60 * 1000,
      );
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto flex items-center gap-3 rounded-2xl border border-line bg-surface-2/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Nueva versión disponible</p>
        <p className="text-xs text-muted">Actualiza para recibir las mejoras.</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast transition hover:bg-accent-strong"
        onClick={() => void updateServiceWorker(true)}
      >
        <RefreshCw className="size-3.5" />
        Actualizar
      </button>
      <button
        type="button"
        aria-label="Cerrar aviso de actualización"
        className="rounded-lg p-1.5 text-muted transition hover:bg-white/5 hover:text-fg"
        onClick={() => setNeedRefresh(false)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
