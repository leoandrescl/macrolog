import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeDisabled?: boolean;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeDisabled,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!closeDisabled) onClose();
    };

    const handleClick = (event: Event) => {
      if (event.target === dialog && !closeDisabled) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleClick);
    };
  }, [closeDisabled, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "app-dialog fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none",
        "max-h-[92dvh] overflow-hidden rounded-t-[1.75rem] border border-line",
        "bg-surface p-0 text-fg shadow-[0_30px_100px_rgba(0,0,0,0.55)]",
        "sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-[1.75rem]",
        className,
      )}
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        <header className="flex items-start gap-3 px-5 pb-4 pt-3 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-[13px] leading-relaxed text-muted"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="-mr-1 -mt-1 rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-50"
            disabled={closeDisabled}
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? (
          <footer className="border-t border-line bg-surface/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
