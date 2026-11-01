import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, LockKeyhole, Scale, WifiOff } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { TextField } from "@/components/ui/TextField";
import { createProfile } from "@/db/repositories/profiles.repo";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import {
  DEFAULT_GOALS,
  DEFAULT_MEAL_NAMES,
  PROFILE_COLORS,
  RAW_BASIS_COPY,
} from "@/lib/constants";
import {
  type ProfileFormInput,
  type ProfileFormOutput,
  profileFormSchema,
} from "@/lib/validation";

function inputNumber(value: number): string {
  return String(value).replace(".", ",");
}

const DEFAULT_VALUES: ProfileFormInput = {
  name: "",
  color: "lime",
  kcal: inputNumber(DEFAULT_GOALS.kcal),
  protein: inputNumber(DEFAULT_GOALS.protein),
  carbs: inputNumber(DEFAULT_GOALS.carbs),
  fat: inputNumber(DEFAULT_GOALS.fat),
};

const BENEFITS = [
  {
    icon: Scale,
    title: "Gramo a gramo",
    text: "Registra cantidades exactas y valores por 100 g en crudo.",
  },
  {
    icon: WifiOff,
    title: "Funciona sin internet",
    text: "Todo queda en tu dispositivo y se abre al instante.",
  },
  {
    icon: LockKeyhole,
    title: "Sin cuentas ni fricción",
    text: "Perfiles independientes, respaldo exportable y cero tracking.",
  },
];

export function OnboardingPage() {
  usePageTitle("Bienvenido");
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = async (values: ProfileFormOutput) => {
    setFormError(null);
    try {
      await createProfile({
        name: values.name,
        color: values.color,
        goals: {
          kcal: values.kcal,
          protein: values.protein,
          carbs: values.carbs,
          fat: values.fat,
        },
      });

      navigate("/diario", { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo crear el perfil.",
      );
    }
  };

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

        <div className="grid flex-1 items-center gap-7 py-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-12">
          <div className="lg:hidden">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Control diario · local-first
            </p>
            <h1 className="text-[2rem] font-bold leading-[1.06] tracking-[-0.04em] text-fg">
              Tus macros,
              <br />
              al gramo.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sin cuentas. Todo en tu dispositivo, listo para funcionar offline.
            </p>
          </div>

          <section className="hidden max-w-lg lg:block">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Control diario · local-first
            </p>
            <h1 className="text-balance text-[2.35rem] font-bold leading-[1.06] tracking-[-0.045em] text-fg sm:text-5xl">
              Tus macros,
              <br />
              al gramo.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              Un diario limpio para saber cuánto te queda de calorías, proteína,
              carbohidratos y grasa. Sin cuentas, sin ruido y sin perder el control de las
              porciones.
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
                <Check className="size-5" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-fg">
                Crea tu primer perfil
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Define tu meta diaria. Podrás editarla y crear más perfiles cuando
                quieras.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <TextField
                label="Nombre del perfil"
                placeholder="Ej. Mi perfil"
                autoComplete="off"
                error={errors.name?.message}
                {...register("name")}
              />

              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-muted">Color</p>
                    <div className="flex gap-2">
                      {PROFILE_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          aria-label={color.label}
                          aria-pressed={field.value === color.id}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border-2 transition",
                            field.value === color.id
                              ? "border-fg ring-2 ring-accent/30 ring-offset-2 ring-offset-surface"
                              : "border-transparent hover:scale-105",
                          )}
                          style={{ backgroundColor: color.hex }}
                          onClick={() => field.onChange(color.id)}
                        >
                          {field.value === color.id ? (
                            <span className="size-2 rounded-full bg-[#10160a]" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              />

              <div className="rounded-2xl border border-line bg-surface-2/55 p-3.5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Meta diaria
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Calorías"
                    suffix="kcal"
                    inputMode="decimal"
                    error={errors.kcal?.message}
                    {...register("kcal")}
                  />
                  <TextField
                    label="Proteína"
                    suffix="g"
                    inputMode="decimal"
                    error={errors.protein?.message}
                    {...register("protein")}
                  />
                  <TextField
                    label="Carbohidratos"
                    suffix="g"
                    inputMode="decimal"
                    error={errors.carbs?.message}
                    {...register("carbs")}
                  />
                  <TextField
                    label="Grasa"
                    suffix="g"
                    inputMode="decimal"
                    error={errors.fat?.message}
                    {...register("fat")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface-2/40 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Bloques iniciales
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DEFAULT_MEAL_NAMES.map((meal) => (
                    <span
                      key={meal}
                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
                    >
                      {meal}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-subtle">
                  Luego puedes agregar, renombrar, reordenar o eliminar cualquiera.
                </p>
              </div>

              <div className="flex gap-2.5 rounded-2xl border border-accent/15 bg-accent/5 p-3 text-xs leading-relaxed text-muted">
                <Scale className="mt-0.5 size-4 shrink-0 text-accent" />
                <p>{RAW_BASIS_COPY}</p>
              </div>

              {formError ? (
                <p className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
                Crear mi perfil
                <ArrowRight className="size-4" />
              </Button>

              <p className="text-center text-[11px] leading-relaxed text-subtle">
                Tus datos se guardan solo en este dispositivo. Podrás exportar un respaldo
                desde Ajustes.
              </p>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
