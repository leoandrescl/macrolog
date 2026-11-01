import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";

import { useProfile } from "@/app/ProfileProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { db } from "@/db/db";
import { sortMeals } from "@/db/repositories/entries.repo";
import { DailySummary } from "@/features/diary/DailySummary";
import { EntrySheet } from "@/features/diary/EntrySheet";
import { MealSection } from "@/features/diary/MealSection";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToday } from "@/hooks/useToday";
import {
  addDays,
  formatLongDate,
  formatShortDate,
  isValidDateKey,
  relativeDateLabel,
} from "@/lib/dates";
import type { DateKey, DiaryEntry } from "@/types/domain";

interface EntrySheetState {
  open: boolean;
  mealId: string | null;
  entry: DiaryEntry | null;
}

export function DiaryPage() {
  const { date } = useParams<{ date: string }>();

  if (date && !isValidDateKey(date)) {
    return <Navigate to="/diario" replace />;
  }

  return <DiaryContent routeDate={date as DateKey | undefined} />;
}

function DiaryContent({ routeDate }: { routeDate?: DateKey }) {
  const { activeProfile } = useProfile();
  const navigate = useNavigate();
  const today = useToday();
  const dateKey = routeDate ?? today;
  const title =
    relativeDateLabel(dateKey, today) === formatLongDate(dateKey)
      ? formatShortDate(dateKey)
      : relativeDateLabel(dateKey, today);
  usePageTitle(dateKey === today ? "Diario" : title);

  const entries = useLiveQuery(
    () =>
      db.entries.where("[profileId+date]").equals([activeProfile.id, dateKey]).toArray(),
    [activeProfile.id, dateKey],
  );
  const meals = useLiveQuery(
    () => db.meals.where("profileId").equals(activeProfile.id).toArray(),
    [activeProfile.id],
  );

  const [entrySheet, setEntrySheet] = useState<EntrySheetState>({
    open: false,
    mealId: null,
    entry: null,
  });

  const sortedMeals = useMemo(() => sortMeals(meals ?? []), [meals]);
  const activeMeals = useMemo(
    () => sortedMeals.filter((meal) => !meal.archivedAt),
    [sortedMeals],
  );

  const entriesByMeal = useMemo(() => {
    const grouped = new Map<string, DiaryEntry[]>();
    for (const entry of entries ?? []) {
      const list = grouped.get(entry.mealId) ?? [];
      list.push(entry);
      grouped.set(entry.mealId, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    return grouped;
  }, [entries]);

  const visibleMeals = useMemo(
    () =>
      sortedMeals.filter(
        (meal) => !meal.archivedAt || (entriesByMeal.get(meal.id)?.length ?? 0) > 0,
      ),
    [entriesByMeal, sortedMeals],
  );

  const loading = entries === undefined || meals === undefined;

  const goToDate = (nextDate: DateKey) => {
    navigate(nextDate === today ? "/diario" : `/diario/${nextDate}`);
  };

  const openAdd = (mealId?: string) => {
    if (activeMeals.length === 0) {
      navigate("/perfiles");
      return;
    }
    setEntrySheet({
      open: true,
      mealId: mealId ?? activeMeals[0].id,
      entry: null,
    });
  };

  const openEdit = (entry: DiaryEntry) => {
    setEntrySheet({
      open: true,
      mealId: entry.mealId,
      entry,
    });
  };

  const closeSheet = () => {
    setEntrySheet((current) => ({ ...current, open: false }));
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Día anterior"
            onClick={() => goToDate(addDays(dateKey, -1))}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-fg"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="min-w-0 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Diario
            </p>
            <h1 className="truncate text-[1.6rem] font-bold leading-tight tracking-[-0.035em] text-fg sm:text-[1.9rem]">
              {title}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted">
              {formatLongDate(dateKey)}
            </p>
          </div>

          <button
            type="button"
            aria-label="Día siguiente"
            onClick={() => goToDate(addDays(dateKey, 1))}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-fg"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {dateKey !== today ? (
            <Button variant="secondary" size="sm" onClick={() => goToDate(today)}>
              Hoy
            </Button>
          ) : null}

          <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:border-line-strong hover:text-fg focus-within:ring-2 focus-within:ring-accent/30">
            <CalendarDays className="size-[18px]" />
            <span className="sr-only">Elegir fecha</span>
            <input
              type="date"
              value={dateKey}
              aria-label="Elegir fecha del diario"
              onChange={(event) => {
                if (isValidDateKey(event.target.value)) {
                  goToDate(event.target.value);
                }
              }}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>

          <div className="hidden sm:block">
            <Button size="sm" onClick={() => openAdd()}>
              <Plus className="size-4" />
              Agregar
            </Button>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="order-2 space-y-3.5 xl:order-1">
          {loading ? (
            <>
              <Skeleton className="h-36 rounded-3xl" />
              <Skeleton className="h-28 rounded-3xl" />
              <Skeleton className="h-28 rounded-3xl" />
            </>
          ) : visibleMeals.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" />}
              title={
                activeMeals.length
                  ? "Tu día está en blanco"
                  : "Crea tu primer bloque de comida"
              }
              description={
                activeMeals.length
                  ? "Registra lo que comiste y el resumen se actualizará al instante."
                  : "Los bloques organizan tus comidas: desayuno, almuerzo, once, cena o cualquier otro."
              }
              action={
                activeMeals.length ? (
                  <Button onClick={() => openAdd()}>
                    <Plus className="size-4" />
                    Registrar primer alimento
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/perfiles")}>
                    <Plus className="size-4" />
                    Crear bloque de comida
                  </Button>
                )
              }
            />
          ) : (
            <>
              {activeMeals.length === 0 ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-xs leading-relaxed text-warning sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    No tienes bloques activos. Crea uno para seguir registrando alimentos.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate("/perfiles")}
                  >
                    Crear bloque
                  </Button>
                </div>
              ) : null}

              {visibleMeals.map((meal) => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  entries={entriesByMeal.get(meal.id) ?? []}
                  onAdd={openAdd}
                  onEditEntry={openEdit}
                />
              ))}

              <div className="flex justify-center pt-1">
                <Button variant="ghost" size="sm" onClick={() => navigate("/perfiles")}>
                  <Pencil className="size-3.5" />
                  Editar bloques de comida
                </Button>
              </div>
            </>
          )}
        </div>

        <aside className="order-1 xl:sticky xl:top-8 xl:order-2">
          <DailySummary
            profile={activeProfile}
            entries={entries ?? []}
            canAdd={activeMeals.length > 0}
            loadingMeals={meals === undefined}
            onAdd={() => {
              if (activeMeals.length) openAdd();
              else navigate("/perfiles");
            }}
          />
        </aside>
      </div>

      {entrySheet.open ? (
        <EntrySheet
          open
          onClose={closeSheet}
          profile={activeProfile}
          date={dateKey}
          meals={meals ?? []}
          initialMealId={entrySheet.mealId}
          entry={entrySheet.entry}
        />
      ) : null}
    </>
  );
}
