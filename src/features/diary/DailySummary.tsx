import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CalorieRing } from "@/components/ui/CalorieRing";
import { Card } from "@/components/ui/Card";
import { ProgressBar, type ProgressColor } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { MACRO_ROWS, RAW_BASIS_COPY } from "@/lib/constants";
import { formatKcal, formatMacro } from "@/lib/format";
import { isOverGoal, remainingNutrition, sumEntries } from "@/lib/nutrition";
import type { DiaryEntry, Profile } from "@/types/domain";

const MACRO_STYLES: Record<
  (typeof MACRO_ROWS)[number]["key"],
  { color: ProgressColor; dot: string }
> = {
  protein: { color: "protein", dot: "bg-macro-protein" },
  carbs: { color: "carbs", dot: "bg-macro-carbs" },
  fat: { color: "fat", dot: "bg-macro-fat" },
};

export function DailySummary({
  profile,
  entries,
  onAdd,
  canAdd,
  loadingMeals = false,
}: {
  profile: Profile;
  entries: DiaryEntry[];
  onAdd: () => void;
  canAdd: boolean;
  loadingMeals?: boolean;
}) {
  const consumed = sumEntries(entries);
  const remaining = remainingNutrition(profile.goals, consumed);
  const overCalories = isOverGoal(consumed.kcal, profile.goals.kcal);
  const percent =
    profile.goals.kcal > 0 ? Math.round((consumed.kcal / profile.goals.kcal) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Resumen del día
            </p>
            <p className="mt-0.5 text-xs text-muted">Meta diaria de tu perfil</p>
          </div>
          <span
            className={cn(
              "num rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              overCalories
                ? "border-danger/25 bg-danger/10 text-danger"
                : "border-line bg-surface-2 text-muted",
            )}
          >
            {percent}%{overCalories ? " · excedido" : ""}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <CalorieRing consumed={consumed.kcal} goal={profile.goals.kcal} size={136} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted">Consumidas</p>
            <p className="num mt-0.5 text-2xl font-bold leading-none tracking-tight text-fg">
              {formatKcal(consumed.kcal)}
              <span className="ml-1.5 text-sm font-medium text-subtle">
                / {formatKcal(profile.goals.kcal)}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-subtle">kcal</p>
            <ProgressBar
              className="mt-3 h-1.5"
              ratio={
                profile.goals.kcal > 0
                  ? consumed.kcal / profile.goals.kcal
                  : consumed.kcal > 0
                    ? 1
                    : 0
              }
              color={overCalories ? "danger" : "accent"}
              ariaLabel="Progreso de calorías"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3.5">
          {MACRO_ROWS.map((macro) => {
            const consumedValue = consumed[macro.key];
            const goalValue = profile.goals[macro.key];
            const remainingValue = remaining[macro.key];
            const over = isOverGoal(consumedValue, goalValue);
            const style = MACRO_STYLES[macro.key];
            const ratio =
              goalValue > 0 ? consumedValue / goalValue : consumedValue > 0 ? 1 : 0;

            return (
              <div key={macro.key}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-fg">
                    <span className={cn("size-1.5 rounded-full", style.dot)} />
                    {macro.label}
                  </span>
                  <span
                    className={cn("num font-semibold", over ? "text-danger" : "text-fg")}
                  >
                    {over ? "Excedido " : "Restan "}
                    {formatMacro(Math.abs(remainingValue))} g
                  </span>
                </div>
                <ProgressBar
                  className="mt-1.5 h-1.5"
                  ratio={ratio}
                  color={over ? "danger" : style.color}
                  ariaLabel={`Progreso de ${macro.label.toLowerCase()}`}
                />
                <p className="num mt-1 text-[10px] text-subtle">
                  {formatMacro(consumedValue)} de {formatMacro(goalValue)} g
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-line bg-surface-2/35 p-4 sm:px-5">
        {loadingMeals ? (
          <div
            className="flex h-11 w-full items-center justify-center rounded-xl border border-line bg-surface-2/60 text-sm font-medium text-muted"
            role="status"
          >
            Cargando bloques...
          </div>
        ) : (
          <Button fullWidth onClick={onAdd} icon={<Plus className="size-4" />}>
            {canAdd ? "Registrar alimento" : "Crear un bloque de comida"}
          </Button>
        )}
        <p className="mt-2.5 text-center text-[10px] leading-relaxed text-subtle">
          {RAW_BASIS_COPY}
        </p>
      </div>
    </Card>
  );
}
