import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/id";

type ToastTone = "default" | "success" | "danger";

interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICONS = {
  default: Info,
  success: CheckCircle2,
  danger: AlertTriangle,
};

const TONE_STYLES: Record<ToastTone, string> = {
  default: "text-sky-400",
  success: "text-lime-400",
  danger: "text-rose-400",
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const tone = toast.tone ?? "default";
  const Icon = TONE_ICONS[tone];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 4200);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-surface-2/95 p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl"
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", TONE_STYLES[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{toast.description}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-accent underline-offset-4 hover:underline"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Cerrar aviso"
        className="rounded-lg p-1 text-muted transition hover:bg-white/5 hover:text-fg"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = createId();
    setToasts((current) => [...current.slice(-1), { ...options, id }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }
  return context;
}
