import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createProfile, updateProfile } from "@/db/repositories/profiles.repo";
import { cn } from "@/lib/cn";
import { DEFAULT_GOALS, PROFILE_COLORS } from "@/lib/constants";
import { formatKcal } from "@/lib/format";
import { parseDecimalInput } from "@/lib/parseNumber";
import {
  type ProfileFormInput,
  type ProfileFormOutput,
  profileFormSchema,
} from "@/lib/validation";
import type { Profile } from "@/types/domain";

function inputNumber(value: number): string {
  return String(value).replace(".", ",");
}

const EMPTY_VALUES: ProfileFormInput = {
  name: "",
  color: "lime",
  kcal: inputNumber(DEFAULT_GOALS.kcal),
  protein: inputNumber(DEFAULT_GOALS.protein),
  carbs: inputNumber(DEFAULT_GOALS.carbs),
  fat: inputNumber(DEFAULT_GOALS.fat),
};

function profileDefaults(profile?: Profile | null): ProfileFormInput {
  if (!profile) return { ...EMPTY_VALUES };
  return {
    name: profile.name,
    color: profile.color,
    kcal: inputNumber(profile.goals.kcal),
    protein: inputNumber(profile.goals.protein),
    carbs: inputNumber(profile.goals.carbs),
    fat: inputNumber(profile.goals.fat),
  };
}

export function ProfileFormSheet({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile?: Profile | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const isEditing = Boolean(profile);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileDefaults(profile),
  });

  const watched = useWatch({ control });
  const macroKcal =
    (parseDecimalInput(watched.protein) ?? 0) * 4 +
    (parseDecimalInput(watched.carbs) ?? 0) * 4 +
    (parseDecimalInput(watched.fat) ?? 0) * 9;
  const kcalValue = parseDecimalInput(watched.kcal);
  const macroDifference = kcalValue !== undefined ? Math.abs(kcalValue - macroKcal) : 0;
  const showMacroHint = macroKcal > 0 && macroDifference > Math.max(50, macroKcal * 0.1);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset(profileDefaults(profile));
  }, [open, profile, reset]);

  const onSubmit = async (values: ProfileFormOutput) => {
    setFormError(null);
    try {
      const payload = {
        name: values.name,
        color: values.color,
        goals: {
          kcal: values.kcal,
          protein: values.protein,
          carbs: values.carbs,
          fat: values.fat,
        },
      };

      if (profile) {
        await updateProfile(profile.id, payload);
      } else {
        await createProfile(payload);
      }

      toast({
        title: isEditing ? "Perfil actualizado" : "Perfil creado y activado",
        description: values.name,
        tone: "success",
      });
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo guardar el perfil.",
      );
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar perfil" : "Nuevo perfil"}
      description="Define la meta diaria de calorías y macros de este perfil."
      closeDisabled={isSubmitting}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting} fullWidth>
            {isEditing ? "Guardar cambios" : "Crear perfil"}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <TextField
          label="Nombre del perfil"
          placeholder="Ej. Corte · Leo"
          autoFocus
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />

        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div>
              <p className="mb-2 text-[13px] font-medium text-muted">Color</p>
              <div className="flex flex-wrap gap-2">
                {PROFILE_COLORS.map((color) => {
                  const selected = field.value === color.id;
                  return (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={color.label}
                      aria-pressed={selected}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full border-2 transition",
                        selected
                          ? "border-fg ring-2 ring-accent/30 ring-offset-2 ring-offset-surface"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: color.hex }}
                      onClick={() => field.onChange(color.id)}
                    >
                      {selected ? (
                        <span className="size-2 rounded-full bg-[#10160a]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        />

        <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
            Meta diaria
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Calorías"
              suffix="kcal"
              inputMode="decimal"
              error={errors.kcal?.message}
              {...register("kcal")}
            />
            <TextField
              label="Proteína"
              suffix="g"
              inputMode="decimal"
              error={errors.protein?.message}
              {...register("protein")}
            />
            <TextField
              label="Carbohidratos"
              suffix="g"
              inputMode="decimal"
              error={errors.carbs?.message}
              {...register("carbs")}
            />
            <TextField
              label="Grasa"
              suffix="g"
              inputMode="decimal"
              error={errors.fat?.message}
              {...register("fat")}
            />
          </div>
          <p
            className={cn(
              "mt-3 text-xs leading-relaxed",
              showMacroHint ? "text-warning" : "text-subtle",
            )}
          >
            {macroKcal > 0
              ? `Los macros suman ${formatKcal(macroKcal)} kcal.${
                  showMacroHint
                    ? " La diferencia con la meta calórica es alta; puedes guardar igualmente."
                    : ""
                }`
              : "Los macros pueden quedar en 0 si no aplica para este perfil."}
          </p>
        </div>

        {formError ? (
          <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            {formError}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
