import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";

import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { formatKcal } from "@/lib/format";
import {
  formatSplitLabel,
  getMacroSplitPreset,
  gramsFromCaloriesAndSplit,
  MACRO_SPLIT_PRESETS,
  type MacroPresetId,
} from "@/lib/macroSplits";
import { parseDecimalInput } from "@/lib/parseNumber";
import type { ProfileFormInput, ProfileFormOutput } from "@/lib/validation";

interface MacroGoalsFieldsProps {
  form: UseFormReturn<ProfileFormInput, unknown, ProfileFormOutput>;
  presetId: MacroPresetId | null;
  onPresetIdChange: (presetId: MacroPresetId | null) => void;
}

export function MacroGoalsFields({
  form,
  presetId,
  onPresetIdChange,
}: MacroGoalsFieldsProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  const watched = useWatch({ control });
  const activePreset = getMacroSplitPreset(presetId);
  const activeSplit = activePreset?.split ?? null;
  const automatic = Boolean(activePreset);

  useEffect(() => {
    if (!activeSplit) return;

    const kcal = parseDecimalInput(watched.kcal);
    if (kcal === undefined || kcal <= 0) return;

    const grams = gramsFromCaloriesAndSplit(kcal, activeSplit);
    setValue("protein", String(grams.protein), { shouldValidate: false });
    setValue("carbs", String(grams.carbs), { shouldValidate: false });
    setValue("fat", String(grams.fat), { shouldValidate: false });
  }, [activeSplit, setValue, watched.kcal]);

  const protein = parseDecimalInput(watched.protein) ?? 0;
  const carbs = parseDecimalInput(watched.carbs) ?? 0;
  const fat = parseDecimalInput(watched.fat) ?? 0;
  const macroKcal = protein * 4 + carbs * 4 + fat * 9;
  const kcalValue = parseDecimalInput(watched.kcal);
  const macroDifference =
    kcalValue !== undefined && macroKcal > 0 ? Math.abs(kcalValue - macroKcal) : 0;
  const showMacroHint = macroKcal > 0 && macroDifference > Math.max(50, macroKcal * 0.1);

  return (
    <div className="rounded-2xl border border-line bg-surface-2/55 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
          Meta diaria
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
            automatic
              ? "border-accent/25 bg-accent/10 text-accent"
              : "border-line bg-surface-2 text-subtle",
          )}
        >
          {automatic ? "Automático" : "Manual"}
        </span>
      </div>

      <fieldset>
        <legend className="mb-2 block text-[13px] font-medium text-muted">
          Distribución de macros
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MACRO_SPLIT_PRESETS.map((preset) => {
            const selected = presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                title={`${preset.name}: ${preset.description}`}
                onClick={() => onPresetIdChange(preset.id)}
                className={cn(
                  "flex min-h-[52px] flex-col justify-center rounded-xl border px-2.5 py-2 text-left transition",
                  selected
                    ? "border-accent/50 bg-accent/10"
                    : "border-line bg-surface-2/40 hover:border-line-strong hover:bg-surface-2/70",
                )}
              >
                <span className="truncate text-[11px] font-semibold text-fg">
                  {preset.name}
                </span>
                <span className="num mt-0.5 text-[10px] text-subtle">
                  {formatSplitLabel(preset.split)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            aria-pressed={presetId === null}
            onClick={() => onPresetIdChange(null)}
            className={cn(
              "flex min-h-[52px] flex-col justify-center rounded-xl border px-2.5 py-2 text-left transition",
              presetId === null
                ? "border-accent/50 bg-accent/10"
                : "border-line bg-surface-2/40 hover:border-line-strong hover:bg-surface-2/70",
            )}
          >
            <span className="text-[11px] font-semibold text-fg">Manual</span>
            <span className="mt-0.5 text-[10px] text-subtle">Ajuste libre</span>
          </button>
        </div>
      </fieldset>

      <p className="mt-2.5 text-[11px] leading-relaxed text-subtle">
        {activePreset
          ? `${activePreset.name}: ${activePreset.description}. Los gramos se recalculan automáticamente al cambiar las calorías.`
          : "Ajuste manual: las calorías no modifican los gramos de los macros."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <TextField
          label="Calorías"
          suffix="kcal"
          inputMode="decimal"
          error={errors.kcal?.message}
          {...register("kcal")}
        />
        <TextField
          label={activePreset ? `Proteína · ${activePreset.split.protein}%` : "Proteína"}
          suffix="g"
          inputMode="decimal"
          readOnly={automatic}
          className={automatic ? "border-dashed" : undefined}
          error={errors.protein?.message}
          {...register("protein")}
        />
        <TextField
          label={
            activePreset
              ? `Carbohidratos · ${activePreset.split.carbs}%`
              : "Carbohidratos"
          }
          suffix="g"
          inputMode="decimal"
          readOnly={automatic}
          className={automatic ? "border-dashed" : undefined}
          error={errors.carbs?.message}
          {...register("carbs")}
        />
        <TextField
          label={activePreset ? `Grasa · ${activePreset.split.fat}%` : "Grasa"}
          suffix="g"
          inputMode="decimal"
          readOnly={automatic}
          className={automatic ? "border-dashed" : undefined}
          error={errors.fat?.message}
          {...register("fat")}
        />
      </div>

      <p
        className={cn(
          "mt-3 text-[11px] leading-relaxed",
          showMacroHint ? "text-warning" : "text-subtle",
        )}
      >
        {macroKcal > 0
          ? `Los macros actuales suman ${formatKcal(macroKcal)} kcal.${
              showMacroHint
                ? " La diferencia con la meta calórica es alta; puedes guardar igualmente."
                : ""
            }`
          : "Los macros pueden quedar en 0 si no aplica para este perfil."}
      </p>
    </div>
  );
}
