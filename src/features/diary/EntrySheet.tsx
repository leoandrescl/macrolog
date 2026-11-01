import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Minus, Plus, Search, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { db } from "@/db/db";
import {
  addEntry,
  deleteEntry,
  getRecentFoodIds,
  restoreEntry,
  sortMeals,
  updateEntry,
} from "@/db/repositories/entries.repo";
import { cn } from "@/lib/cn";
import { GRAM_PRESETS, MACRO_ROWS, MAX_GRAMS } from "@/lib/constants";
import { formatGrams, formatKcal, formatMacro } from "@/lib/format";
import { matchesFoodQuery, normalizeText } from "@/lib/normalize";
import { EMPTY_NUTRITION, nutritionForGrams } from "@/lib/nutrition";
import { parsePositiveInteger } from "@/lib/parseNumber";
import type {
  DateKey,
  DiaryEntry,
  Food,
  MealBlock,
  Nutrition,
  Profile,
} from "@/types/domain";

const FOODS_LIMIT = 200;

interface SelectedFood {
  foodId: string;
  name: string;
  per100: Nutrition;
}

function FoodOption({ food, onSelect }: { food: Food; onSelect: (food: Food) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface-2/60 focus-visible:bg-surface-2/60 focus-visible:outline-none"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
        <Plus className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{food.name}</span>
        <span className="num mt-0.5 block text-[11px] text-muted">
          {formatKcal(food.per100.kcal)} kcal · P {formatMacro(food.per100.protein)} · C{" "}
          {formatMacro(food.per100.carbs)} · G {formatMacro(food.per100.fat)} / 100 g
        </span>
      </span>
    </button>
  );
}

function FoodSearchSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center gap-3 px-1 py-2">
          <Skeleton className="size-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EntrySheet({
  open,
  onClose,
  profile,
  date,
  meals,
  initialMealId,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  date: DateKey;
  meals: MealBlock[];
  initialMealId?: string | null;
  entry?: DiaryEntry | null;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const gramsRef = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(entry);

  const [step, setStep] = useState<"food" | "portion">(entry ? "portion" : "food");
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<SelectedFood | null>(() =>
    entry
      ? {
          foodId: entry.foodId,
          name: entry.foodName,
          per100: entry.per100,
        }
      : null,
  );
  const [gramsValue, setGramsValue] = useState(() => (entry ? String(entry.grams) : ""));
  const [mealId, setMealId] = useState(() => entry?.mealId ?? initialMealId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const foods = useLiveQuery(() => db.foods.orderBy("nameNormalized").toArray(), []);
  const recentIds = useLiveQuery(() => getRecentFoodIds(profile.id, 6), [profile.id]);

  const sortedMeals = useMemo(() => sortMeals(meals), [meals]);
  const activeMeals = useMemo(
    () => sortedMeals.filter((meal) => !meal.archivedAt),
    [sortedMeals],
  );
  const firstActiveMealId = activeMeals[0]?.id ?? "";
  const mealOptions = useMemo(() => {
    if (!entry) return activeMeals;

    const currentMeal = sortedMeals.find((meal) => meal.id === entry.mealId);
    if (currentMeal?.archivedAt) {
      return [...activeMeals, currentMeal].sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return activeMeals;
  }, [activeMeals, entry, sortedMeals]);

  useEffect(() => {
    if (!open) return;

    setSearch("");
    setError(null);
    setSaving(false);
    setDeleting(false);

    if (entry) {
      setStep("portion");
      setSelectedFood({
        foodId: entry.foodId,
        name: entry.foodName,
        per100: entry.per100,
      });
      setGramsValue(String(entry.grams));
      setMealId(entry.mealId);
      return;
    }

    setStep("food");
    setSelectedFood(null);
    setGramsValue("");
    const initialIsActive = activeMeals.some((meal) => meal.id === initialMealId);
    setMealId(initialIsActive && initialMealId ? initialMealId : firstActiveMealId);
  }, [activeMeals, entry, firstActiveMealId, initialMealId, open]);

  useEffect(() => {
    if (!open || step !== "portion") return;
    const frame = window.requestAnimationFrame(() => {
      gramsRef.current?.focus();
      gramsRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, step]);

  const normalizedQuery = normalizeText(search);
  const filteredFoods = useMemo(() => {
    if (!foods) return undefined;
    return foods
      .filter((food) => matchesFoodQuery(food.name, normalizedQuery))
      .slice(0, FOODS_LIMIT);
  }, [foods, normalizedQuery]);

  const recentFoods = useMemo(() => {
    if (!foods || !recentIds) return [];
    return recentIds
      .map((id) => foods.find((food) => food.id === id))
      .filter((food): food is Food => Boolean(food));
  }, [foods, recentIds]);

  const otherFoods = useMemo(() => {
    if (!filteredFoods) return [];
    if (normalizedQuery) return filteredFoods;
    const recentSet = new Set(recentFoods.map((food) => food.id));
    return filteredFoods.filter((food) => !recentSet.has(food.id));
  }, [filteredFoods, normalizedQuery, recentFoods]);

  const grams = parsePositiveInteger(gramsValue);
  const previewNutrition = useMemo(
    () =>
      selectedFood ? nutritionForGrams(grams ?? 0, selectedFood.per100) : EMPTY_NUTRITION,
    [grams, selectedFood],
  );

  const chooseFood = (food: Food) => {
    setSelectedFood({
      foodId: food.id,
      name: food.name,
      per100: food.per100,
    });
    setGramsValue("100");
    setError(null);
    setStep("portion");
  };

  const goBackToSearch = () => {
    setStep("food");
    setError(null);
  };

  const adjustGrams = (delta: number) => {
    const current = grams ?? 0;
    const next = Math.min(Math.max(current + delta, 1), MAX_GRAMS);
    setGramsValue(String(next));
    if (error) setError(null);
  };

  const handleGramsChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 5);
    setGramsValue(digits);
    if (error) setError(null);
  };

  const validatePortion = (): number | null => {
    if (!selectedFood) {
      setError("Elige un alimento.");
      return null;
    }
    if (!mealId) {
      setError("Crea un bloque de comida antes de registrar.");
      return null;
    }
    if (grams === null) {
      setError("Ingresa una cantidad mayor que 0 g.");
      return null;
    }
    if (grams > MAX_GRAMS) {
      setError(`La cantidad máxima es ${formatGrams(MAX_GRAMS)} g.`);
      return null;
    }
    return grams;
  };

  const handleSave = async (event?: FormEvent) => {
    event?.preventDefault();
    const validGrams = validatePortion();
    if (validGrams === null) return;

    setSaving(true);
    setError(null);
    try {
      if (entry) {
        await updateEntry(entry.id, { grams: validGrams, mealId });
      } else if (selectedFood) {
        await addEntry({
          profileId: profile.id,
          date,
          mealId,
          foodId: selectedFood.foodId,
          grams: validGrams,
        });
      }
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el registro.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEntry(entry.id);
      onClose();
      toast({
        title: "Registro eliminado",
        description: `${entry.foodName} · ${formatGrams(entry.grams)} g`,
        action: {
          label: "Deshacer",
          onClick: () => {
            void restoreEntry(entry).catch(() => {
              toast({
                title: "No se pudo deshacer",
                description: "Intenta registrar el alimento nuevamente.",
                tone: "danger",
              });
            });
          },
        },
      });
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el registro.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const goToCreateFood = () => {
    onClose();
    navigate("/alimentos?nuevo=1");
  };

  const sheetTitle = isEditing
    ? "Editar registro"
    : step === "food"
      ? "Agregar alimento"
      : "Cantidad consumida";

  const sheetDescription = isEditing
    ? "Ajusta la cantidad o el bloque de comida."
    : step === "food"
      ? "Busca en tu biblioteca. Los valores son por 100 g en crudo."
      : "Indica el peso consumido, en crudo y sin desperdicios.";

  const footer =
    step === "portion" ? (
      <div className="flex gap-2">
        {entry ? (
          <Button
            variant="ghost"
            aria-label="Eliminar registro"
            className="shrink-0 px-3 text-danger hover:bg-danger/10 hover:text-danger"
            disabled={saving || deleting}
            loading={deleting}
            onClick={() => void handleDelete()}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        <Button
          type="submit"
          form="entry-portion-form"
          fullWidth
          loading={saving}
          disabled={deleting || !mealId || (!selectedFood && !entry)}
        >
          {isEditing
            ? "Guardar cambios"
            : grams
              ? `Agregar ${formatGrams(grams)} g`
              : "Agregar al diario"}
        </Button>
      </div>
    ) : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      description={sheetDescription}
      closeDisabled={saving || deleting}
      footer={footer}
    >
      {step === "food" ? (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={search}
              autoFocus
              autoComplete="off"
              placeholder="Buscar alimento..."
              aria-label="Buscar alimento"
              enterKeyHint="search"
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3.5 text-base text-fg outline-none transition placeholder:text-subtle focus:border-accent/60 focus:ring-4 focus:ring-accent/10 sm:text-[15px]"
            />
          </div>

          {foods === undefined ? (
            <FoodSearchSkeleton />
          ) : foods.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-5 py-8 text-center">
              <p className="text-sm font-semibold text-fg">Tu biblioteca está vacía</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Crea tu primer alimento con sus valores por 100 g en crudo.
              </p>
              <Button className="mt-4" onClick={goToCreateFood}>
                <Plus className="size-4" />
                Crear alimento
              </Button>
            </div>
          ) : filteredFoods === undefined ? null : filteredFoods.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-5 py-8 text-center">
              <p className="text-sm font-semibold text-fg">
                No encontramos “{search.trim()}”
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Prueba con otro nombre o crea el alimento.
              </p>
              <Button variant="secondary" className="mt-4" onClick={goToCreateFood}>
                <Plus className="size-4" />
                Crear alimento
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {!normalizedQuery && recentFoods.length ? (
                <section>
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    Recientes
                  </p>
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-2/25">
                    {recentFoods.map((food) => (
                      <FoodOption key={food.id} food={food} onSelect={chooseFood} />
                    ))}
                  </div>
                </section>
              ) : null}

              {otherFoods.length ? (
                <section>
                  <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    {normalizedQuery ? "Resultados" : "Todos los alimentos"}
                  </p>
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-2/25">
                    {otherFoods.map((food) => (
                      <FoodOption key={food.id} food={food} onSelect={chooseFood} />
                    ))}
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                onClick={goToCreateFood}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-xs font-medium text-subtle transition hover:border-line-strong hover:bg-surface-2/50 hover:text-fg"
              >
                <Plus className="size-3.5" />
                Crear un alimento nuevo
              </button>
            </div>
          )}
        </div>
      ) : selectedFood ? (
        <form
          id="entry-portion-form"
          onSubmit={(event) => void handleSave(event)}
          noValidate
        >
          <div className="rounded-2xl border border-line bg-surface-2/50 p-3.5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{selectedFood.name}</p>
                <p className="num mt-0.5 text-[11px] text-muted">
                  Por 100 g: {formatKcal(selectedFood.per100.kcal)} kcal · P{" "}
                  {formatMacro(selectedFood.per100.protein)} · C{" "}
                  {formatMacro(selectedFood.per100.carbs)} · G{" "}
                  {formatMacro(selectedFood.per100.fat)}
                </p>
              </div>
              {!entry ? (
                <button
                  type="button"
                  onClick={goBackToSearch}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/10"
                >
                  <ArrowLeft className="size-3" />
                  Cambiar
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="entry-grams"
              className="mb-2 block text-[13px] font-medium text-muted"
            >
              Cantidad consumida <span className="text-subtle">(en crudo)</span>
            </label>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                aria-label="Restar 10 gramos"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted transition hover:border-line-strong hover:text-fg active:scale-[0.97]"
                onClick={() => adjustGrams(-10)}
              >
                <Minus className="size-5" />
              </button>
              <div className="relative min-w-0 flex-1">
                <input
                  ref={gramsRef}
                  id="entry-grams"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={gramsValue}
                  onChange={(event) => handleGramsChange(event.target.value)}
                  placeholder="100"
                  className={cn(
                    "num h-14 w-full rounded-2xl border bg-surface-2 px-3 text-center text-2xl font-bold tracking-tight text-fg outline-none transition placeholder:text-subtle focus:ring-4",
                    error
                      ? "border-danger/60 focus:border-danger focus:ring-danger/10"
                      : "border-line focus:border-accent/60 focus:ring-accent/10",
                  )}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "entry-grams-error" : undefined}
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-subtle">
                  g
                </span>
              </div>
              <button
                type="button"
                aria-label="Sumar 10 gramos"
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted transition hover:border-line-strong hover:text-fg active:scale-[0.97]"
                onClick={() => adjustGrams(10)}
              >
                <Plus className="size-5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GRAM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setGramsValue(String(preset));
                    setError(null);
                  }}
                  className={cn(
                    "num rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
                    grams === preset
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-surface-2/50 text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  {preset} g
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium text-muted">
              Aporte de esta porción
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">
                  Calorías
                </p>
                <p className="num mt-0.5 text-base font-semibold text-fg">
                  {formatKcal(previewNutrition.kcal)}
                  <span className="ml-0.5 text-[10px] font-normal text-subtle">kcal</span>
                </p>
              </div>
              {MACRO_ROWS.map((macro) => (
                <div
                  key={macro.key}
                  className="rounded-xl border border-line bg-surface-2/40 px-3 py-2.5"
                >
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-subtle">
                    <span
                      className={cn(
                        "size-1 rounded-full",
                        macro.key === "protein"
                          ? "bg-macro-protein"
                          : macro.key === "carbs"
                            ? "bg-macro-carbs"
                            : "bg-macro-fat",
                      )}
                    />
                    {macro.shortLabel}
                  </p>
                  <p className="num mt-0.5 text-base font-semibold text-fg">
                    {formatMacro(previewNutrition[macro.key])}
                    <span className="ml-0.5 text-[10px] font-normal text-subtle">g</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="entry-meal"
              className="mb-1.5 block text-[13px] font-medium text-muted"
            >
              Bloque de comida
            </label>
            <select
              id="entry-meal"
              value={mealId}
              onChange={(event) => setMealId(event.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base font-medium text-fg outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10 sm:text-sm"
              disabled={!mealOptions.length}
            >
              {mealOptions.length ? null : (
                <option value="">Sin bloques disponibles</option>
              )}
              {mealOptions.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {meal.name}
                  {meal.archivedAt ? " (archivado)" : ""}
                </option>
              ))}
            </select>
            {!mealOptions.length ? (
              <p className="mt-1.5 text-xs text-warning">
                Primero crea un bloque de comida en Perfiles.
              </p>
            ) : null}
          </div>

          {selectedFood ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2/40 px-3 py-2 text-[11px] leading-relaxed text-subtle">
              <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
              <p>
                Se guardará el snapshot de los valores actuales del alimento. Los cambios
                futuros en la biblioteca no alteran este registro.
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              id="entry-grams-error"
              className="mt-3 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </Sheet>
  );
}
