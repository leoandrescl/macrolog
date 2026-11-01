import { Apple, CalendarDays, type LucideIcon, Settings, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";

import { ProfileSwitcher } from "@/components/layout/ProfileSwitcher";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { APP_VERSION, RAW_BASIS_COPY } from "@/lib/constants";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/diario", label: "Diario", icon: CalendarDays },
  { to: "/alimentos", label: "Alimentos", icon: Apple, end: true },
  { to: "/perfiles", label: "Perfiles", icon: Users, end: true },
  { to: "/ajustes", label: "Ajustes", icon: Settings, end: true },
];

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "bg-accent/10 text-fg"
            : "text-muted hover:bg-surface-2 hover:text-fg",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg transition",
              isActive
                ? "bg-accent text-accent-contrast"
                : "bg-surface-2 text-subtle group-hover:text-fg",
            )}
          >
            <Icon className="size-[18px]" />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}

function MobileTab({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition",
          isActive ? "text-accent" : "text-muted",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex h-8 w-12 items-center justify-center rounded-xl transition",
              isActive ? "bg-accent/10" : "bg-transparent",
            )}
          >
            <Icon className="size-[21px]" strokeWidth={isActive ? 2.3 : 1.9} />
          </span>
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]"
      >
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/70 backdrop-blur-xl lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Logo size={36} />
        </div>

        <div className="px-4">
          <ProfileSwitcher />
        </div>

        <nav className="mt-5 space-y-1 px-3" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto px-5 pb-5">
          <div className="rounded-2xl border border-line bg-surface-2/50 p-3">
            <p className="text-[11px] leading-relaxed text-subtle">{RAW_BASIS_COPY}</p>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
              MacroLog v{APP_VERSION} · Local-first
            </p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4">
          <Logo size={30} />
          <ProfileSwitcher variant="compact" />
        </div>
      </header>

      <div className="lg:pl-64">
        <main
          id="contenido"
          className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-2">
          {NAV_ITEMS.map((item) => (
            <MobileTab key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
