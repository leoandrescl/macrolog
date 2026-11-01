import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center border-dashed bg-transparent px-6 py-10 text-center shadow-none",
        className,
      )}
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-line bg-surface-2 text-accent">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
