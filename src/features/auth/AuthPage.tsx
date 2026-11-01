import { zodResolver } from "@hookform/resolvers/zod";
import { Cloud, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/app/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { TextField } from "@/components/ui/TextField";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError, NetworkError } from "@/lib/api";
import { cn } from "@/lib/cn";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu correo").email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Ingresa tu nombre").max(40, "Máximo 40 caracteres"),
    email: z
      .string()
      .trim()
      .min(1, "Ingresa tu correo")
      .email("Ingresa un correo válido"),
    password: z
      .string()
      .min(8, "Usa al menos 8 caracteres")
      .max(128, "Máximo 128 caracteres"),
    confirmPassword: z.string().min(1, "Repite tu contraseña"),
    familyCode: z.string().trim().min(1, "Ingresa el código de familia"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type AuthMode = "login" | "register";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Cada cuenta es privada",
    text: "Cada persona de la familia ve únicamente sus perfiles y registros.",
  },
  {
    icon: Cloud,
    title: "Sincronización automática",
    text: "Tus perfiles y comidas se guardan en tu cuenta y viajan contigo.",
  },
  {
    icon: WifiOff,
    title: "Funciona offline",
    text: "Puedes seguir registrando sin conexión; se sincroniza al volver.",
  },
];

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.";
  }
  return "No se pudo completar la operación. Intenta nuevamente.";
}

function useAfterAuth() {
  return () => {
    window.history.replaceState(null, "", "/diario");
  };
}

function LoginForm() {
  const { login } = useAuth();
  const afterAuth = useAfterAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      afterAuth();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <TextField
        label="Correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu@correo.cl"
        autoFocus
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        error={errors.password?.message}
        {...register("password")}
      />

      {formError ? (
        <p
          className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        Entrar
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-subtle">
        Tu sesión se mantiene activa en este dispositivo.
      </p>
      <p className="text-center text-[11px] leading-relaxed text-subtle">
        ¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.
      </p>
    </form>
  );
}

function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const afterAuth = useAfterAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      familyCode: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        familyCode: values.familyCode,
      });
      afterAuth();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Tu nombre"
          autoComplete="name"
          placeholder="Ej. María"
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.cl"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>
      <TextField
        label="Código de familia"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="FAMILIA-XXXX-XXXX"
        error={errors.familyCode?.message}
        hint="Te lo comparte quien administra MacroLog."
        {...register("familyCode")}
      />

      {formError ? (
        <p
          className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        Crear cuenta
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-subtle">
        Al crear una cuenta, tus datos actuales de este dispositivo se vincularán a ella.
      </p>
    </form>
  );
}

export function AuthPage() {
  usePageTitle("Entrar");
  const { serverError, retrySession } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 size-[32rem] rounded-full bg-accent/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-52 -right-40 size-[34rem] rounded-full bg-sky-400/5 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:py-10">
        <Logo size={36} />

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-12">
          <section className="hidden max-w-lg lg:block">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              MacroLog familiar
            </p>
            <h1 className="text-balance text-[2.35rem] font-bold leading-[1.06] tracking-[-0.045em] text-fg sm:text-5xl">
              Tu cuenta,
              <br />
              tus macros.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Cada integrante de la familia entra con su cuenta y mantiene sus propios
              perfiles, metas y registros. Todo privado, sincronizado y disponible
              offline.
            </p>

            <div className="mt-7 space-y-4">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface/70 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">{benefit.title}</p>
                      <p className="text-[13px] leading-relaxed text-muted">
                        {benefit.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <Card className="p-5 sm:p-7">
            <div className="mb-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-fg">
                {mode === "login" ? "Entra a tu MacroLog" : "Crea tu cuenta"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {mode === "login"
                  ? "Usa tu correo y contraseña para cargar tus perfiles."
                  : "Necesitas el código de familia para unirte."}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2/60 p-1">
              <button
                type="button"
                aria-pressed={mode === "login"}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "login"
                    ? "bg-surface text-fg shadow-sm"
                    : "text-muted hover:text-fg",
                )}
                onClick={() => setMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                aria-pressed={mode === "register"}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition",
                  mode === "register"
                    ? "bg-surface text-fg shadow-sm"
                    : "text-muted hover:text-fg",
                )}
                onClick={() => setMode("register")}
              >
                Crear cuenta
              </button>
            </div>

            {serverError ? (
              <div className="mb-4 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                <p>No pudimos conectar con el servidor.</p>
                <button
                  type="button"
                  className="mt-1 font-semibold underline underline-offset-4"
                  onClick={() => void retrySession()}
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {mode === "login" ? <LoginForm /> : <RegisterForm />}

            <p className="mt-5 border-t border-line pt-4 text-center text-[11px] leading-relaxed text-subtle">
              Cada cuenta es independiente. Los perfiles te permiten separar etapas,
              clientes o planes dentro de tu misma cuenta.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
