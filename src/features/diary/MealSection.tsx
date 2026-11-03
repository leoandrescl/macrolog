import { Archive, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatGrams, formatKcal, formatMacro } from "@/lib/format";
import { entryNutrition, sumEntries } from "@/lib/nutrition";
import type { DiaryEntry, MealBlock } from "@/types/domain";

function EntryRow({
  entry,
  onEdit,
}: {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
}) {
  const nutrition = entryNutrition(entry);

  return (
    <button
      type="button"
      onClick={() => onEdit(entry)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/55 focus-visible:bg-surface-2/55 focus-visible:outline-none sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{entry.foodName}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted">
          <span className="num font-semibold text-fg">{formatGrams(entry.grams)} g</span>
          <span className="text-subtle">·</span>
          <span>
            P <span className="num">{formatMacro(nutrition.protein)}</span>
          </span>
          <span className="text-subtle">·</span>
          <span>
            C <span className="num">{formatMacro(nutrition.carbs)}</span>
          </span>
          <span className="text-subtle">·</span>
          <span>
            G <span className="num">{formatMacro(nutrition.fat)}</span>
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="num text-sm font-semibold text-fg">
          {formatKcal(nutrition.kcal)}
          <span className="ml-0.5 text-[10px] font-medium text-subtle">kcal</span>
        </span>
        <ChevronRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" />
      </div>
    </button>
  );
}

export function MealSection({
  meal,
  entries,
  onAdd,
  onEditEntry,
}: {
  meal: MealBlock;
  entries: DiaryEntry[];
  onAdd: (mealId: string) => void;
  onEditEntry: (entry: DiaryEntry) => void;
}) {
  const total = sumEntries(entries);
  const archived = Boolean(meal.archivedAt);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-surface-3 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-fg">{meal.name}</h2>
            {archived ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
                <Archive className="size-2.5" />
                Archivado
              </span>
            ) : null}
          </div>
          {entries.length ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="num font-semibold text-fg">
                {formatKcal(total.kcal)}
                <span className="ml-0.5 font-medium text-subtle">kcal</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-macro-protein" />P{" "}
                <span className="num">{formatMacro(total.protein)}</span> g
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-macro-carbs" />C{" "}
                <span className="num">{formatMacro(total.carbs)}</span> g
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-macro-fat" />G{" "}
                <span className="num">{formatMacro(total.fat)}</span> g
              </span>
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] text-subtle">Sin alimentos registrados</p>
          )}
        </div>
        {!archived ? (
          <Button
            variant="soft"
            size="sm"
            className="shrink-0"
            aria-label={`Agregar alimento a ${meal.name}`}
            onClick={() => onAdd(meal.id)}
          >
            <Plus className="size-4" />
            Agregar
          </Button>
        ) : null}
      </div>

      {entries.length ? (
        <div className="divide-y divide-line">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onEdit={onEditEntry} />
          ))}
        </div>
      ) : (
        <div className="p-3">
          <button
            type="button"
            onClick={() => onAdd(meal.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/30 bg-accent/5 px-3 py-3 text-xs font-semibold text-accent transition hover:border-accent/50 hover:bg-accent/10"
          >
            <Plus className="size-3.5" />
            Agregar alimento a {meal.name.toLowerCase()}
          </button>
        </div>
      )}
    </Card>
  );
}
