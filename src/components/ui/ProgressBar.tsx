import { cn } from "@/lib/cn";

const COLORS = {
  protein: "bg-macro-protein",
  carbs: "bg-macro-carbs",
  fat: "bg-macro-fat",
  accent: "bg-accent",
  danger: "bg-danger",
} as const;

export type ProgressColor = keyof typeof COLORS;

export function ProgressBar({
  ratio,
  color = "accent",
  className,
  ariaLabel,
}: {
  ratio: number;
  color?: ProgressColor;
  className?: string;
  ariaLabel?: string;
}) {
  const width = Math.min(Math.max(ratio, 0), 1) * 100;

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          COLORS[color],
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
