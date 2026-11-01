import { useLiveQuery } from "dexie-react-hooks";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";

import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { ProfileProvider } from "@/app/ProfileProvider";
import { PwaUpdater } from "@/app/PwaUpdater";
import { ThemeProvider } from "@/app/ThemeProvider";
import { ToastProvider } from "@/app/ToastProvider";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/ui/Logo";
import { db, getActiveProfileId, setActiveProfileId } from "@/db/db";
import { usePersistentStorage } from "@/hooks/usePersistentStorage";

const DiaryPage = lazy(() =>
  import("@/pages/DiaryPage").then((module) => ({
    default: module.DiaryPage,
  })),
);
const FoodsPage = lazy(() =>
  import("@/pages/FoodsPage").then((module) => ({
    default: module.FoodsPage,
  })),
);
const ProfilesPage = lazy(() =>
  import("@/pages/ProfilesPage").then((module) => ({
    default: module.ProfilesPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);
const OnboardingPage = lazy(() =>
  import("@/pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
      <Logo size={38} showText={false} />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="sr-only">Cargando sección</p>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <Logo size={54} showText={false} />
      <p className="text-sm font-semibold tracking-tight text-fg">MacroLog</p>
      <div className="h-1 w-28 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="sr-only">Cargando tus datos locales</p>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: el cambio de ruta debe reiniciar el scroll
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function AppGate() {
  const data = useLiveQuery(async () => {
    const [profiles, activeProfileId] = await Promise.all([
      db.profiles.orderBy("createdAt").toArray(),
      getActiveProfileId(),
    ]);
    return { profiles, activeProfileId };
  }, []);

  const hasProfiles = Boolean(data?.profiles.length);
  usePersistentStorage(hasProfiles);

  const activeProfile =
    data?.profiles.find((profile) => profile.id === data.activeProfileId) ??
    data?.profiles[0] ??
    null;

  useEffect(() => {
    if (!hasProfiles || !activeProfile) return;
    if (data?.activeProfileId === activeProfile.id) return;
    void setActiveProfileId(activeProfile.id).catch(() => {
      /* El perfil seguirá funcionando en memoria aunque falle el guardado. */
    });
  }, [activeProfile, data?.activeProfileId, hasProfiles]);

  if (data === undefined) return <SplashScreen />;
  if (!activeProfile) {
    return (
      <Suspense fallback={<SplashScreen />}>
        <OnboardingPage />
      </Suspense>
    );
  }

  return (
    <ProfileProvider profiles={data.profiles} activeProfile={activeProfile}>
      <AppShell>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/diario" replace />} />
            <Route path="/diario" element={<DiaryPage />} />
            <Route path="/diario/:date" element={<DiaryPage />} />
            <Route path="/alimentos" element={<FoodsPage />} />
            <Route path="/perfiles" element={<ProfilesPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ProfileProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppErrorBoundary>
            <AppGate />
          </AppErrorBoundary>
        </BrowserRouter>
        {import.meta.env.PROD ? <PwaUpdater /> : null}
      </ToastProvider>
    </ThemeProvider>
  );
}
