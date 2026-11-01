import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";

import { cn } from "@/lib/cn";

export const inputBaseClass =
  "h-12 w-full rounded-xl border bg-surface-2 px-3.5 text-base font-medium text-fg outline-none transition placeholder:font-normal placeholder:text-subtle focus:ring-4 disabled:opacity-60 sm:text-[15px]";

export const inputToneClass = (invalid?: boolean) =>
  invalid
    ? "border-danger/60 focus:border-danger focus:ring-danger/10"
    : "border-line focus:border-accent/60 focus:ring-accent/10";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  error?: string;
  hint?: ReactNode;
  suffix?: string;
  containerClassName?: string;
  invalid?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, suffix, className, containerClassName, id, invalid, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const hasError = Boolean(error) || invalid;

  return (
    <div className={cn("min-w-0", containerClassName)}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-[13px] font-medium text-muted"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            inputBaseClass,
            inputToneClass(hasError),
            suffix && "pr-12",
            "num",
            className,
          )}
          aria-invalid={hasError || undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? hintId : undefined}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-medium text-subtle">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
