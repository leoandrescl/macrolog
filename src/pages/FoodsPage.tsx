import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Plus, Scale, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useGlobalFoods } from "@/app/GlobalFoodsProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { db } from "@/db/db";
import { FoodFormSheet } from "@/features/foods/FoodFormSheet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RAW_BASIS_COPY } from "@/lib/constants";
import { formatKcal, formatMacro } from "@/lib/format";
import { matchesFoodQuery, normalizeText } from "@/lib/normalize";
import type { Food } from "@/types/domain";

function FoodRow({ food, onSelect }: { food: Food; onSelect: (food: Food) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(food)}
      className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2/55 focus-visible:bg-surface-2/55 focus-visible:outline-none sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{food.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-macro-protein" />P{" "}
            <span className="num">{formatMacro(food.per100.protein)}</span> g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-macro-carbs" />C{" "}
            <span className="num">{formatMacro(food.per100.carbs)}</span> g
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-macro-fat" />G{" "}
            <span className="num">{formatMacro(food.per100.fat)}</span> g
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="num text-sm font-semibold text-fg">
          {formatKcal(food.per100.kcal)}
        </p>
        <p className="text-[10px] text-subtle">kcal / 100 g</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" />
    </button>
  );
}

function FoodListSkeleton() {
  return (
    <Card className="divide-y divide-line overflow-hidden">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </Card>
  );
}

export function FoodsPage() {
  usePageTitle("Alimentos");
  const [search, setSearch] = useState("");
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const createOpen = searchParams.get("nuevo") === "1";
  const { status: foodsSyncStatus } = useGlobalFoods();

  const foods = useLiveQuery(
    () =>
      db.foods
        .orderBy("nameNormalized")
        .filter((food) => food.deletedAt === undefined)
        .toArray(),
    [],
  );

  const query = normalizeText(search);
  const filteredFoods = useMemo(() => {
    if (!foods) return undefined;
    return foods.filter((food) => matchesFoodQuery(food.name, query));
  }, [foods, query]);
  const foodsLoading =
    foods === undefined || (foods.length === 0 && foodsSyncStatus === "loading");

  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.set("nuevo", "1");
    setSearchParams(next, { replace: true });
  };

  const closeCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("nuevo");
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Biblioteca"
        title="Alimentos"
        description="Biblioteca global compartida por todas las cuentas y perfiles. Valores por 100 g en crudo y limpio."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo alimento
          </Button>
        }
      />

      <div className="mt-5 flex flex-col gap-3">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={search}
            autoComplete="off"
            placeholder="Buscar por nombre..."
            aria-label="Buscar alimentos"
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-base text-fg outline-none transition placeholder:text-subtle focus:border-accent/60 focus:ring-4 focus:ring-accent/10 sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] leading-relaxed text-subtle">
          <Scale className="size-3.5 shrink-0 text-accent" />
          <p>{RAW_BASIS_COPY}</p>
        </div>
      </div>

      <div className="mt-5">
        {foodsLoading ? (
          <FoodListSkeleton />
        ) : foods.length === 0 ? (
          <EmptyState
            icon={<Scale className="size-5" />}
            title="La biblioteca está vacía"
            description="Crea el primer alimento con sus valores por 100 g en crudo. Quedará disponible para todos los perfiles y todas las cuentas."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Crear primer alimento
              </Button>
            }
          />
        ) : filteredFoods && filteredFoods.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="Sin coincidencias"
            description={`No encontramos alimentos que coincidan con “${search.trim()}”.`}
            action={
              <Button variant="secondary" onClick={() => setSearch("")}>
                Limpiar búsqueda
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-subtle">
                {query ? "Resultados" : "Biblioteca"}
              </p>
              <p className="num text-[11px] text-subtle">
                {filteredFoods?.length ?? 0}{" "}
                {filteredFoods?.length === 1 ? "alimento" : "alimentos"}
              </p>
            </div>
            <Card className="divide-y divide-line overflow-hidden">
              {filteredFoods?.map((food) => (
                <FoodRow key={food.id} food={food} onSelect={setEditingFood} />
              ))}
            </Card>
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-subtle">
              Toca un alimento para editarlo o eliminarlo. Los cambios afectan a todas las
              cuentas y perfiles.
            </p>
          </>
        )}
      </div>

      {createOpen ? <FoodFormSheet open onClose={closeCreate} /> : null}

      {editingFood ? (
        <FoodFormSheet open food={editingFood} onClose={() => setEditingFood(null)} />
      ) : null}
    </>
  );
}
