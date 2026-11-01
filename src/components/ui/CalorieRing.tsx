import { formatKcal } from "@/lib/format";
import { isOverGoal, progressRatio } from "@/lib/nutrition";

export function CalorieRing({
  consumed,
  goal,
  size = 148,
}: {
  consumed: number;
  goal: number;
  size?: number;
}) {
  const over = isOverGoal(consumed, goal);
  const remaining = goal - consumed;
  const ratio = progressRatio(consumed, goal);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const strokeColor = over ? "var(--danger)" : "var(--accent)";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={
        over
          ? `Calorías excedidas por ${formatKcal(Math.abs(remaining))} kcal`
          : `Restan ${formatKcal(remaining)} kcal de ${formatKcal(goal)}`
      }
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth="9"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          {over ? "Excedido" : "Restan"}
        </span>
        <span className="num mt-0.5 text-[1.75rem] font-bold leading-none tracking-tight text-fg">
          {formatKcal(Math.abs(remaining))}
        </span>
        <span className="mt-1 text-[11px] font-medium text-muted">kcal</span>
      </div>
    </div>
  );
}
