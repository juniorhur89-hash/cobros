import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusLabel, type InstallmentStatus } from "@/lib/finance";

const styles: Record<InstallmentStatus, string> = {
  pagada: "bg-success/12 text-success border-success/30",
  parcial: "bg-warning/15 text-warning-foreground border-warning/40",
  vencida: "bg-destructive/10 text-destructive border-destructive/30",
  pendiente: "bg-secondary text-secondary-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status as InstallmentStatus) in styles ? (status as InstallmentStatus) : "pendiente";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles[s])}>
      {statusLabel[s]}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
