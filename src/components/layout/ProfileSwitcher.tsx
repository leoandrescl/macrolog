import { Check, ChevronDown, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { useProfile } from "@/app/ProfileProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { formatKcal } from "@/lib/format";

export function ProfileSwitcher({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "compact";
  className?: string;
}) {
  const { profiles, activeProfile, setActiveProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const chooseProfile = (id: string) => {
    setOpen(false);
    if (id !== activeProfile.id) void setActiveProfile(id);
  };

  const goToProfiles = (newProfile = false) => {
    setOpen(false);
    navigate(newProfile ? "/perfiles?nuevo=1" : "/perfiles");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex min-w-0 items-center gap-2.5 text-left transition",
          variant === "sidebar"
            ? "w-full rounded-2xl border border-line bg-surface-2/70 p-3 hover:border-line-strong hover:bg-surface-2"
            : "max-w-[12rem] rounded-full border border-line bg-surface-2/80 py-1.5 pl-1.5 pr-3 hover:border-line-strong",
          className,
        )}
      >
        <Avatar profile={activeProfile} size={variant === "sidebar" ? "md" : "sm"} />
        <span className="min-w-0 flex-1">
          {variant === "sidebar" ? (
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
              Perfil activo
            </span>
          ) : null}
          <span className="block truncate text-sm font-semibold text-fg">
            {activeProfile.name}
          </span>
          {variant === "sidebar" ? (
            <span className="mt-0.5 block text-[11px] text-muted">
              {formatKcal(activeProfile.goals.kcal)} kcal / día
            </span>
          ) : null}
        </span>
        <ChevronDown className="size-4 shrink-0 text-subtle transition group-hover:text-fg" />
        <span className="sr-only">Cambiar perfil</span>
      </button>

      {open ? (
        <Sheet
          open
          onClose={() => setOpen(false)}
          title="Cambiar de perfil"
          description="Cada perfil tiene su propia meta diaria, diario y bloques de comida."
        >
          <div className="space-y-2">
            {profiles.map((profile) => {
              const active = profile.id === activeProfile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => chooseProfile(profile.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
                    active
                      ? "border-accent/40 bg-accent/10"
                      : "border-line bg-surface-2/50 hover:border-line-strong hover:bg-surface-2",
                  )}
                >
                  <Avatar profile={profile} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {profile.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatKcal(profile.goals.kcal)} kcal · {profile.goals.protein} g
                      proteína
                    </span>
                  </span>
                  {active ? (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => goToProfiles(true)}>
              <Plus className="size-4" />
              Nuevo perfil
            </Button>
            <Button variant="ghost" onClick={() => goToProfiles(false)}>
              <Settings2 className="size-4" />
              Gestionar perfiles
            </Button>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
