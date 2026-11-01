import {
  CloudOff,
  Database,
  Download,
  HardDrive,
  Info,
  Monitor,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useProfile } from "@/app/ProfileProvider";
import { useTheme } from "@/app/ThemeProvider";
import { useToast } from "@/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  clearAllData,
  createBackup,
  downloadBackup,
  parseBackupFile,
  restoreBackup,
} from "@/db/repositories/backup.repo";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/cn";
import { APP_NAME, APP_VERSION, RAW_BASIS_COPY } from "@/lib/constants";
import { pluralize } from "@/lib/format";
import type { BackupFile, ThemePreference } from "@/types/domain";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Moon;
}> = [
  {
    value: "dark",
    label: "Oscuro",
    description: "Predeterminado",
    icon: Moon,
  },
  {
    value: "light",
    label: "Claro",
    description: "Fondo claro",
    icon: Sun,
  },
  {
    value: "system",
    label: "Sistema",
    description: "Según el equipo",
    icon: Monitor,
  },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(bytes / (1024 * 1024 * 1024))} GB`;
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

export function SettingsPage() {
  usePageTitle("Ajustes");
  const { preference, setPreference } = useTheme();
  const { toast } = useToast();
  const { activeProfile } = useProfile();
  const install = useInstallPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    usage?: number;
    quota?: number;
    persisted?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!("storage" in navigator)) return;
    let cancelled = false;

    void Promise.all([
      navigator.storage.estimate?.() ?? Promise.resolve(null),
      navigator.storage.persisted?.() ?? Promise.resolve(false),
    ])
      .then(([estimate, persisted]) => {
        if (cancelled) return;
        setStorageInfo({
          usage: estimate?.usage,
          quota: estimate?.quota,
          persisted: Boolean(persisted),
        });
      })
      .catch(() => {
        /* El estado del almacenamiento es informativo. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      toast({
        title: "Respaldo descargado",
        description: `${countLabel(backup.data.profiles.length, "perfil", "perfiles")}, ${countLabel(backup.data.foods.length, "alimento", "alimentos")} y ${countLabel(backup.data.entries.length, "registro", "registros")}.`,
        tone: "success",
      });
    } catch {
      toast({
        title: "No se pudo crear el respaldo",
        tone: "danger",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const backup = await parseBackupFile(file);
      setPendingBackup(backup);
    } catch (error) {
      toast({
        title: "Respaldo no válido",
        description:
          error instanceof Error ? error.message : "No se pudo leer el archivo.",
        tone: "danger",
      });
    }
  };

  const handleRestore = async () => {
    if (!pendingBackup) return;
    setImporting(true);
    try {
      await restoreBackup(pendingBackup);
      setPendingBackup(null);
      window.location.assign("/diario");
    } catch (error) {
      toast({
        title: "No se pudo importar el respaldo",
        description: error instanceof Error ? error.message : "Revisa el archivo.",
        tone: "danger",
      });
      setImporting(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      await clearAllData();
      window.location.assign("/");
    } catch {
      toast({
        title: "No se pudieron borrar los datos",
        tone: "danger",
      });
      setClearing(false);
    }
  };

  const importSummary = pendingBackup
    ? `${countLabel(pendingBackup.data.profiles.length, "perfil", "perfiles")}, ${countLabel(pendingBackup.data.foods.length, "alimento", "alimentos")} y ${countLabel(pendingBackup.data.entries.length, "registro", "registros")}`
    : "";

  return (
    <>
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        description="Apariencia, instalación y control de tus datos locales."
      />

      <div className="mt-6 grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
              {preference === "light" ? (
                <Sun className="size-4" />
              ) : preference === "system" ? (
                <Monitor className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">Apariencia</h2>
              <p className="mt-0.5 text-xs text-muted">
                Elige cómo se ve MacroLog en este dispositivo.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = preference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPreference(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition",
                    selected
                      ? "border-accent/40 bg-accent/10 text-fg"
                      : "border-line bg-surface-2/40 text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn("size-4", selected ? "text-accent" : "text-subtle")}
                  />
                  <span className="text-[11px] font-semibold">{option.label}</span>
                  <span className="hidden text-[9px] text-subtle sm:block">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <Smartphone className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">Instalar aplicación</h2>
              <p className="mt-0.5 text-xs text-muted">
                Acceso desde la pantalla de inicio y funcionamiento offline.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {install.isStandalone ? (
              <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-xs text-muted">
                Ya estás usando MacroLog como aplicación instalada.
              </p>
            ) : install.canInstall ? (
              <Button variant="secondary" onClick={() => void install.promptInstall()}>
                <Smartphone className="size-4" />
                Instalar MacroLog
              </Button>
            ) : install.isIos ? (
              <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-muted">
                En iPhone o iPad: toca <strong>Compartir</strong> y luego{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : (
              <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-muted">
                Usa el menú de tu navegador y elige <strong>Instalar aplicación</strong> o{" "}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <Database className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">Datos y respaldo</h2>
              <p className="mt-0.5 text-xs text-muted">
                Todo se guarda en este navegador. Sin cuentas ni servidores.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-surface-2/40 p-3.5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-fg">Almacenamiento local</p>
              <p className="text-[11px] text-subtle">
                {storageInfo?.persisted ? "Persistente" : "Administrado por el navegador"}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{
                  width:
                    storageInfo?.usage && storageInfo?.quota
                      ? `${Math.min(
                          100,
                          Math.max(1, (storageInfo.usage / storageInfo.quota) * 100),
                        )}%`
                      : "2%",
                }}
              />
            </div>
            <p className="num mt-1.5 text-[10px] text-subtle">
              {storageInfo?.usage !== undefined
                ? `${formatBytes(storageInfo.usage)} usados`
                : "Calculando uso..."}
              {storageInfo?.quota
                ? ` de ${formatBytes(storageInfo.quota)} disponibles`
                : ""}
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              onClick={() => void handleExport()}
              loading={exporting}
            >
              <Download className="size-4" />
              Exportar respaldo
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Importar respaldo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleFileSelected(event)}
            />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-subtle">
            El respaldo JSON incluye todos los perfiles, alimentos, bloques y registros.
            Importarlo reemplaza los datos actuales de este dispositivo.
          </p>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-danger/15 bg-danger/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-fg">Borrar todos los datos</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Elimina perfiles, alimentos y registros. Descarga un respaldo antes si
                quieres conservarlos.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-3.5" />
              Borrar datos
            </Button>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Privacidad y reglas de MacroLog
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Local-first, sin tracking y con una única base de medición.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface-2/40 p-3">
              <CloudOff className="size-4 text-accent" />
              <p className="mt-2 text-xs font-semibold text-fg">Sin nube</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                No hay sincronización automática. Exporta un respaldo para mover tus
                datos.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2/40 p-3">
              <HardDrive className="size-4 text-accent" />
              <p className="mt-2 text-xs font-semibold text-fg">Tu dispositivo</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Perfil activo: {activeProfile.name}. Los datos del navegador pueden
                borrarse desde sus ajustes.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2/40 p-3">
              <Info className="size-4 text-accent" />
              <p className="mt-2 text-xs font-semibold text-fg">Peso en crudo</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {RAW_BASIS_COPY}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-[11px] text-subtle">
              {APP_NAME} v{APP_VERSION} · local-first
            </p>
            <a
              href="https://github.com/leoandrescl/macrolog"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium text-muted underline-offset-4 transition hover:text-fg hover:underline"
            >
              Código en GitHub
            </a>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pendingBackup)}
        title="Importar respaldo"
        description={`Se reemplazarán todos los datos actuales con ${importSummary}. Esta acción no se puede deshacer.`}
        confirmLabel="Reemplazar datos"
        tone="danger"
        loading={importing}
        onConfirm={() => void handleRestore()}
        onClose={() => setPendingBackup(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Borrar todos los datos"
        description="Se eliminarán todos los perfiles, alimentos, bloques y registros de este dispositivo. Esta acción no se puede deshacer."
        confirmLabel="Borrar todo"
        tone="danger"
        loading={clearing}
        onConfirm={() => void handleClearData()}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
