import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useProfile } from "@/app/ProfileProvider";
import { useToast } from "@/app/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { db } from "@/db/db";
import { sortMeals } from "@/db/repositories/entries.repo";
import { deleteMeal, moveMeal } from "@/db/repositories/meals.repo";
import { deleteProfile } from "@/db/repositories/profiles.repo";
import { MealBlockSheet } from "@/features/profiles/MealBlockSheet";
import { ProfileFormSheet } from "@/features/profiles/ProfileFormSheet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatKcal, formatMacro } from "@/lib/format";
import type { MealBlock, Profile } from "@/types/domain";

function GoalsSummary({ profile }: { profile: Profile }) {
  return (
    <div className="mt-3 grid grid-cols-4 gap-2">
      <div className="rounded-xl border border-line bg-surface-2/55 px-2.5 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
          kcal
        </p>
        <p className="num mt-0.5 text-sm font-semibold text-fg">
          {formatKcal(profile.goals.kcal)}
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface-2/55 px-2.5 py-2">
        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
          <span className="size-1 rounded-full bg-macro-protein" />P
        </p>
        <p className="num mt-0.5 text-sm font-semibold text-fg">
          {formatMacro(profile.goals.protein)}
          <span className="ml-0.5 text-[9px] font-normal text-subtle">g</span>
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface-2/55 px-2.5 py-2">
        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
          <span className="size-1 rounded-full bg-macro-carbs" />C
        </p>
        <p className="num mt-0.5 text-sm font-semibold text-fg">
          {formatMacro(profile.goals.carbs)}
          <span className="ml-0.5 text-[9px] font-normal text-subtle">g</span>
        </p>
      </div>
      <div className="rounded-xl border border-line bg-surface-2/55 px-2.5 py-2">
        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
          <span className="size-1 rounded-full bg-macro-fat" />G
        </p>
        <p className="num mt-0.5 text-sm font-semibold text-fg">
          {formatMacro(profile.goals.fat)}
          <span className="ml-0.5 text-[9px] font-normal text-subtle">g</span>
        </p>
      </div>
    </div>
  );
}

function MealRowAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-subtle transition hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function ProfilesPage() {
  usePageTitle("Perfiles");
  const { profiles, activeProfile, setActiveProfile } = useProfile();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const createOpen = searchParams.get("nuevo") === "1";

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [mealSheet, setMealSheet] = useState<{
    open: boolean;
    meal: MealBlock | null;
  }>({ open: false, meal: null });
  const [mealToDelete, setMealToDelete] = useState<MealBlock | null>(null);
  const [deletingMeal, setDeletingMeal] = useState(false);
  const [confirmProfileDelete, setConfirmProfileDelete] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  const meals = useLiveQuery(
    () => db.meals.where("profileId").equals(activeProfile.id).toArray(),
    [activeProfile.id],
  );

  const visibleMeals = useMemo(
    () => sortMeals(meals ?? []).filter((meal) => !meal.archivedAt),
    [meals],
  );

  const otherProfiles = profiles.filter((profile) => profile.id !== activeProfile.id);

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

  const switchProfile = (profile: Profile) => {
    if (profile.id === activeProfile.id) return;
    void setActiveProfile(profile.id).then(() => {
      toast({
        title: `Perfil activo: ${profile.name}`,
        description: "El diario y las metas ahora corresponden a este perfil.",
      });
    });
  };

  const handleDeleteMeal = async () => {
    if (!mealToDelete) return;
    setDeletingMeal(true);
    try {
      const result = await deleteMeal(mealToDelete);
      toast({
        title: result === "archived" ? "Bloque archivado" : "Bloque de comida eliminado",
        description:
          result === "archived"
            ? `${mealToDelete.name} se ocultó del diario, pero sus registros históricos se conservan.`
            : `${mealToDelete.name} se eliminó de este perfil.`,
        tone: "success",
      });
      setMealToDelete(null);
    } catch {
      toast({
        title: "No se pudo eliminar el bloque",
        tone: "danger",
      });
    } finally {
      setDeletingMeal(false);
    }
  };

  const handleDeleteProfile = async () => {
    setDeletingProfile(true);
    try {
      await deleteProfile(activeProfile.id);
      setConfirmProfileDelete(false);
      toast({
        title: "Perfil eliminado",
        description:
          profiles.length === 1
            ? "Puedes crear un nuevo perfil."
            : "Los demás perfiles siguen disponibles.",
      });
    } catch {
      toast({
        title: "No se pudo eliminar el perfil",
        tone: "danger",
      });
    } finally {
      setDeletingProfile(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Cuentas locales"
        title="Perfiles"
        description="Metas, diario y bloques independientes. La biblioteca de alimentos es compartida entre todos los perfiles."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nuevo perfil
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Perfil activo
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-medium text-accent">
              <Check className="size-3" strokeWidth={3} />
              En uso
            </span>
          </div>
          <Card className="border-accent/20 p-4 sm:p-5">
            <div className="flex items-start gap-3.5">
              <Avatar profile={activeProfile} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-fg">
                    {activeProfile.name}
                  </h2>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
                    Activo
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Meta diaria y diario independiente
                </p>
                <GoalsSummary profile={activeProfile} />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() => setEditingProfile(activeProfile)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            </div>
          </Card>
        </section>

        {otherProfiles.length ? (
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Otros perfiles
            </h2>
            <Card className="divide-y divide-line overflow-hidden">
              {otherProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
                >
                  <Avatar profile={profile} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">
                      {profile.name}
                    </p>
                    <p className="num text-[11px] text-muted">
                      {formatKcal(profile.goals.kcal)} kcal · P{" "}
                      {formatMacro(profile.goals.protein)} · C{" "}
                      {formatMacro(profile.goals.carbs)} · G{" "}
                      {formatMacro(profile.goals.fat)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <MealRowAction
                      label={`Editar ${profile.name}`}
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Pencil className="size-3.5" />
                    </MealRowAction>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => switchProfile(profile)}
                    >
                      Activar
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ) : null}

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Bloques de comida
            </h2>
            <p className="text-[10px] text-subtle">
              Se aplican solo a {activeProfile.name}
            </p>
          </div>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-fg">Orden del diario</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Agrega, renombra, reordena o elimina cualquier bloque.
                </p>
              </div>
              <Button size="sm" onClick={() => setMealSheet({ open: true, meal: null })}>
                <Plus className="size-4" />
                Agregar
              </Button>
            </div>

            {visibleMeals.length ? (
              <div className="divide-y divide-line">
                {visibleMeals.map((meal, index) => (
                  <div
                    key={meal.id}
                    className="flex items-center gap-2 px-3 py-2.5 sm:px-4"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[10px] font-semibold text-subtle">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                      {meal.name}
                    </p>
                    <MealRowAction
                      label={`Subir ${meal.name}`}
                      disabled={index === 0}
                      onClick={() => void moveMeal(activeProfile.id, meal.id, "up")}
                    >
                      <ArrowUp className="size-3.5" />
                    </MealRowAction>
                    <MealRowAction
                      label={`Bajar ${meal.name}`}
                      disabled={index === visibleMeals.length - 1}
                      onClick={() => void moveMeal(activeProfile.id, meal.id, "down")}
                    >
                      <ArrowDown className="size-3.5" />
                    </MealRowAction>
                    <MealRowAction
                      label={`Renombrar ${meal.name}`}
                      onClick={() => setMealSheet({ open: true, meal })}
                    >
                      <Pencil className="size-3.5" />
                    </MealRowAction>
                    <MealRowAction
                      label={`Eliminar ${meal.name}`}
                      onClick={() => setMealToDelete(meal)}
                    >
                      <Trash2 className="size-3.5" />
                    </MealRowAction>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-fg">No hay bloques de comida</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Agrega un bloque para poder registrar alimentos en el diario.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => setMealSheet({ open: true, meal: null })}
                >
                  <Plus className="size-4" />
                  Crear bloque
                </Button>
              </div>
            )}
            <div className="border-t border-line bg-surface-2/30 px-4 py-2.5 sm:px-5">
              <p className="text-[10px] leading-relaxed text-subtle">
                Los bloques con registros históricos se archivan al eliminarlos:
                desaparecen del día actual, pero sus registros pasados se mantienen.
              </p>
            </div>
          </Card>
        </section>

        <section>
          <div className="mb-2 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Datos del perfil
            </h2>
          </div>
          <Card className="flex flex-col gap-3 border-danger/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <Trash2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-fg">
                  Eliminar “{activeProfile.name}”
                </p>
                <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-muted">
                  Se eliminarán su meta, sus bloques y todos sus registros. Los alimentos
                  de la biblioteca y los demás perfiles se mantienen.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              onClick={() => setConfirmProfileDelete(true)}
            >
              Eliminar perfil
            </Button>
          </Card>
        </section>
      </div>

      {createOpen ? <ProfileFormSheet open onClose={closeCreate} /> : null}
      {editingProfile ? (
        <ProfileFormSheet
          open
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
        />
      ) : null}
      {mealSheet.open ? (
        <MealBlockSheet
          open
          meal={mealSheet.meal}
          profileId={activeProfile.id}
          onClose={() => setMealSheet({ open: false, meal: null })}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(mealToDelete)}
        title="Eliminar bloque de comida"
        description={
          mealToDelete
            ? `¿Eliminar “${mealToDelete.name}”? Si tiene registros históricos se archivará para no perderlos.`
            : ""
        }
        confirmLabel="Eliminar bloque"
        tone="danger"
        loading={deletingMeal}
        onConfirm={() => void handleDeleteMeal()}
        onClose={() => setMealToDelete(null)}
      />
      <ConfirmDialog
        open={confirmProfileDelete}
        title="Eliminar perfil"
        description={`Se eliminarán “${activeProfile.name}” y todos sus registros. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar perfil"
        tone="danger"
        loading={deletingProfile}
        onConfirm={() => void handleDeleteProfile()}
        onClose={() => setConfirmProfileDelete(false)}
      />
    </>
  );
}
