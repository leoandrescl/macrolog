import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createFood, deleteFood, updateFood } from "@/db/repositories/foods.repo";
import { RAW_BASIS_COPY } from "@/lib/constants";
import { formatKcal } from "@/lib/format";
import { parseDecimalInput } from "@/lib/parseNumber";
import {
  type FoodFormInput,
  type FoodFormOutput,
  foodFormSchema,
} from "@/lib/validation";
import type { Food } from "@/types/domain";

function inputNumber(value: number): string {
  return String(value).replace(".", ",");
}

const EMPTY_VALUES: FoodFormInput = {
  name: "",
  kcal: "",
  protein: "",
  carbs: "",
  fat: "",
};

function foodDefaults(food?: Food | null): FoodFormInput {
  if (!food) return { ...EMPTY_VALUES };
  return {
    name: food.name,
    kcal: inputNumber(food.per100.kcal),
    protein: inputNumber(food.per100.protein),
    carbs: inputNumber(food.per100.carbs),
    fat: inputNumber(food.per100.fat),
  };
}

export function FoodFormSheet({
  open,
  food,
  onClose,
  onSaved,
}: {
  open: boolean;
  food?: Food | null;
  onClose: () => void;
  onSaved?: (foodName: string) => void;
}) {
  const { toast } = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEditing = Boolean(food);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FoodFormInput, unknown, FoodFormOutput>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: foodDefaults(food),
  });

  const watched = useWatch({ control });
  const macroKcal =
    (parseDecimalInput(watched.protein) ?? 0) * 4 +
    (parseDecimalInput(watched.carbs) ?? 0) * 4 +
    (parseDecimalInput(watched.fat) ?? 0) * 9;
  const kcalValue = parseDecimalInput(watched.kcal);
  const hasMacros =
    (parseDecimalInput(watched.protein) ?? 0) +
      (parseDecimalInput(watched.carbs) ?? 0) +
      (parseDecimalInput(watched.fat) ?? 0) >
    0;
  const kcalDifference =
    kcalValue !== undefined && hasMacros ? Math.abs(kcalValue - macroKcal) : 0;
  const showConsistencyHint = kcalDifference > Math.max(20, macroKcal * 0.15);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setConfirmDelete(false);
    setDeleting(false);
    reset(foodDefaults(food));
  }, [food, open, reset]);

  const onSubmit = async (values: FoodFormOutput) => {
    setFormError(null);
    try {
      const payload = {
        name: values.name,
        per100: {
          kcal: values.kcal,
          protein: values.protein,
          carbs: values.carbs,
          fat: values.fat,
        },
      };

      if (food) {
        await updateFood(food.id, payload);
      } else {
        await createFood(payload);
      }

      toast({
        title: isEditing ? "Alimento actualizado" : "Alimento creado",
        description: `${values.name} · ${formatKcal(values.kcal)} kcal por 100 g`,
        tone: "success",
      });
      onSaved?.(values.name);
      onClose();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo guardar el alimento.",
      );
    }
  };

  const handleDelete = async () => {
    if (!food) return;
    setDeleting(true);
    setFormError(null);
    try {
      await deleteFood(food.id);
      setConfirmDelete(false);
      toast({
        title: "Alimento eliminado",
        description: `${food.name}. Los registros anteriores se conservan.`,
      });
      onClose();
    } catch (error) {
      setConfirmDelete(false);
      setFormError(
        error instanceof Error ? error.message : "No se pudo eliminar el alimento.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={isEditing ? "Editar alimento" : "Nuevo alimento"}
        description="Valores por 100 g de alimento en crudo y limpio."
        closeDisabled={isSubmitting || deleting}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting || deleting}
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={deleting}
              fullWidth
            >
              {isEditing ? "Guardar cambios" : "Crear alimento"}
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex gap-2.5 rounded-2xl border border-accent/15 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" />
          <p>{RAW_BASIS_COPY}</p>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <TextField
            label="Nombre del alimento"
            placeholder="Ej. Pechuga de pollo"
            autoFocus
            autoComplete="off"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Calorías"
              suffix="kcal"
              inputMode="decimal"
              placeholder="0"
              error={errors.kcal?.message}
              {...register("kcal")}
            />
            <TextField
              label="Proteína"
              suffix="g"
              inputMode="decimal"
              placeholder="0"
              error={errors.protein?.message}
              {...register("protein")}
            />
            <TextField
              label="Carbohidratos"
              suffix="g"
              inputMode="decimal"
              placeholder="0"
              error={errors.carbs?.message}
              {...register("carbs")}
            />
            <TextField
              label="Grasa"
              suffix="g"
              inputMode="decimal"
              placeholder="0"
              error={errors.fat?.message}
              {...register("fat")}
            />
          </div>

          {hasMacros ? (
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                showConsistencyHint
                  ? "border-warning/25 bg-warning/10 text-warning"
                  : "border-line bg-surface-2 text-muted"
              }`}
            >
              Los macros aportan{" "}
              <span className="num font-semibold">{formatKcal(macroKcal)} kcal</span> por
              100 g.
              {showConsistencyHint
                ? " Revisa si las calorías y los macros corresponden al mismo alimento."
                : ""}
            </div>
          ) : null}

          {formError ? (
            <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
              {formError}
            </p>
          ) : null}

          {isEditing ? (
            <div className="border-t border-line pt-4">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
                disabled={deleting}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5" />
                Eliminar alimento
              </button>
              <p className="mt-1 px-2 text-[11px] leading-relaxed text-subtle">
                Se quitará de la biblioteca. Los registros anteriores conservan sus
                valores originales.
              </p>
            </div>
          ) : null}
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar alimento"
        description="Se quitará de tu biblioteca. Los registros ya guardados conservan su snapshot y no cambiarán."
        confirmLabel="Eliminar"
        tone="danger"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
