import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchInstallments, type InstallmentView } from "@/lib/data";
import { fmtDate, fmtMoney } from "@/lib/finance";
import { PageHeader, StatusBadge } from "@/components/StatusBadge";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/contratos_/$id")({
  head: () => ({ meta: [{ title: "Contrato · CALTIMER COBROS" }] }),
  component: Detalle,
});

function Detalle() {
  const { id } = Route.useParams();
  const { data = [] } = useQuery({ queryKey: ["installments"], queryFn: fetchInstallments });
  const [paying, setPaying] = useState<InstallmentView | null>(null);
  const rows = data.filter((i) => i.contract_id === id);
  const balance = rows.reduce((t, i) => t + Number(i.balance ?? 0), 0);
  return (
    <div>
      <PageHeader title={rows[0]?.client_name ?? "Contrato"} subtitle={`Saldo pendiente: ${fmtMoney(balance)}`} />
      <ul className="divide-y rounded-xl border bg-card shadow-card">
        {rows.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{i.kind === "inicial" ? "Inicial" : `Cuota ${i.number}`} · {fmtDate(i.due_date)}</span>
            <span>{fmtMoney(i.paid)} / {fmtMoney(i.amount)}</span>
            <StatusBadge status={i.status ?? "pendiente"} />
            {i.status !== "pagada" && <Button size="sm" variant="outline" onClick={() => setPaying(i)}>Cobrar</Button>}
          </li>
        ))}
      </ul>
      <PaymentDialog inst={paying} onClose={() => setPaying(null)} />
    </div>
  );
}
