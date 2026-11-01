import { useEffect, useId, useState } from "react";

import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createMeal, renameMeal } from "@/db/repositories/meals.repo";
import { mealNameSchema } from "@/lib/validation";
import type { MealBlock } from "@/types/domain";

export function MealBlockSheet({
  open,
  meal,
  profileId,
  onClose,
}: {
  open: boolean;
  meal?: MealBlock | null;
  profileId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const formId = useId();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(meal);

  useEffect(() => {
    if (!open) return;
    setName(meal?.name ?? "");
    setError(null);
    setSaving(false);
  }, [meal, open]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = mealNameSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa el nombre.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (meal) {
        await renameMeal(meal.id, parsed.data.name);
      } else {
        await createMeal(profileId, parsed.data.name);
      }

      toast({
        title: isEditing ? "Bloque actualizado" : "Bloque agregado",
        description: parsed.data.name,
        tone: "success",
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el bloque.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? "Renombrar bloque" : "Nuevo bloque de comida"}
      description="Los bloques organizan tu diario. Puedes crear tantos como necesites."
      closeDisabled={saving}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving} fullWidth>
            {isEditing ? "Guardar nombre" : "Agregar bloque"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        <TextField
          label="Nombre del bloque"
          placeholder="Ej. Pre-entreno, Almuerzo, Once..."
          value={name}
          autoFocus
          autoComplete="off"
          maxLength={40}
          error={error ?? undefined}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null);
          }}
        />
      </form>
    </Sheet>
  );
}
