import { Compass } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Página no encontrada");
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        eyebrow="404"
        title="Página no encontrada"
        description="La dirección no corresponde a ninguna sección de MacroLog."
      />
      <div className="mt-6 max-w-2xl">
        <EmptyState
          icon={<Compass className="size-5" />}
          title="Te perdiste en el camino"
          description="Vuelve a tu diario para seguir registrando el día."
          action={<Button onClick={() => navigate("/diario")}>Volver al diario</Button>}
        />
      </div>
    </>
  );
}
