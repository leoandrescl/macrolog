import { Logo } from "@/components/ui/Logo";

export function SplashScreen({ message = "Cargando tus datos" }: { message?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <Logo size={54} showText={false} />
      <p className="text-sm font-semibold tracking-tight text-fg">MacroLog</p>
      <div className="h-1 w-28 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
      <p className="sr-only">{message}</p>
      <p className="text-xs text-subtle">{message}</p>
    </main>
  );
}
