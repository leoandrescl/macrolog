import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/app/AuthProvider";
import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { ApiError, NetworkError } from "@/lib/api";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "Usa al menos 8 caracteres")
      .max(128, "Máximo 128 caracteres"),
    confirmPassword: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ChangePasswordSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const formId = useId();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }, [open, reset]);

  const onSubmit = async (values: PasswordValues) => {
    setFormError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast({
        title: "Contraseña actualizada",
        description: "Las demás sesiones de tu cuenta fueron cerradas.",
        tone: "success",
      });
      onClose();
    } catch (error) {
      if (error instanceof ApiError) setFormError(error.message);
      else if (error instanceof NetworkError) {
        setFormError("No pudimos conectar. Revisa tu conexión.");
      } else {
        setFormError("No se pudo cambiar la contraseña.");
      }
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cambiar contraseña"
      description="Al guardar, se cerrarán las sesiones de tu cuenta en otros dispositivos."
      closeDisabled={isSubmitting}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} fullWidth>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting} fullWidth>
            Guardar contraseña
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <TextField
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          autoFocus
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <TextField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <TextField
          label="Repite la nueva contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {formError ? (
          <p
            className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
