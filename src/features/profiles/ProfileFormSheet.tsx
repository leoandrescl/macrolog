import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createProfile, updateProfile } from "@/db/repositories/profiles.repo";
import { MacroGoalsFields } from "@/features/profiles/MacroGoalsFields";
import { cn } from "@/lib/cn";
import { DEFAULT_GOALS, PROFILE_COLORS } from "@/lib/constants";
import {
  DEFAULT_MACRO_PRESET_ID,
  findMacroSplitPresetId,
  getMacroSplitPreset,
  gramsFromCaloriesAndSplit,
  type MacroPresetId,
} from "@/lib/macroSplits";
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

function initialPresetFor(profile?: Profile | null): MacroPresetId | null {
  if (!profile) return DEFAULT_MACRO_PRESET_ID;
  return findMacroSplitPresetId(profile.macroSplitPct);
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
  const [macroPresetId, setMacroPresetId] = useState<MacroPresetId | null>(() =>
    initialPresetFor(profile),
  );
  const isEditing = Boolean(profile);

  const form = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileDefaults(profile),
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setMacroPresetId(initialPresetFor(profile));
    reset(profileDefaults(profile));
  }, [open, profile, reset]);

  const onSubmit = async (values: ProfileFormOutput) => {
    setFormError(null);
    try {
      const activePreset = getMacroSplitPreset(macroPresetId);
      const goals = activePreset
        ? gramsFromCaloriesAndSplit(values.kcal, activePreset.split)
        : {
            kcal: values.kcal,
            protein: values.protein,
            carbs: values.carbs,
            fat: values.fat,
          };
      const payload = {
        name: values.name,
        color: values.color,
        goals,
        macroSplitPct: activePreset?.split,
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

        <MacroGoalsFields
          form={form}
          presetId={macroPresetId}
          onPresetIdChange={setMacroPresetId}
        />

        {formError ? (
          <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            {formError}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
