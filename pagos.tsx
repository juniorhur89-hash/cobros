import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchPayments } from "@/lib/data";
import { fmtDate, fmtMoney } from "@/lib/finance";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({ meta: [{ title: "Pagos · CALTIMER COBROS" }] }),
  component: Pagos,
});

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function Pagos() {
  const { data = [], isLoading } = useQuery({ queryKey: ["payments"], queryFn: fetchPayments });
  function exportCsv() {
    const header = ["Fecha de pago", "Cliente", "Lote", "Concepto", "Método", "N° operación", "Importe (PEN)"];
    const rows = data.map(p => [
      p.paid_on,
      p.installments?.contracts?.clients?.full_name,
      p.installments?.contracts?.lots?.code,
      p.installments?.kind === "inicial" ? "Inicial" : `Cuota ${p.installments?.number ?? ""}`,
      p.method,
      p.reference,
      Number(p.amount).toFixed(2),
    ]);
    const content = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `caltimer-pagos-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const total = data.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  return (
    <div>
      <PageHeader title="Historial de pagos" subtitle={`${data.length} pagos registrados · Total histórico: ${fmtMoney(total)}`}
        actions={<Button variant="outline" onClick={exportCsv} disabled={!data.length}><Download className="mr-2 size-4" />Exportar CSV para Excel</Button>} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>
            <th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Lote / concepto</th><th className="px-4 py-3">Método</th><th className="px-4 py-3">Operación</th><th className="px-4 py-3 text-right">Importe</th>
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando pagos…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Aún no hay pagos.</td></tr>}
            {data.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="whitespace-nowrap px-4 py-3">{fmtDate(p.paid_on)}</td>
                <td className="px-4 py-3">{p.installments?.contracts?.clients?.full_name ?? "—"}</td>
                <td className="px-4 py-3">{p.installments?.contracts?.lots?.code ?? "—"} · {p.installments?.kind === "inicial" ? "Inicial" : `Cuota ${p.installments?.number ?? ""}`}</td>
                <td className="px-4 py-3">{p.method ?? "—"}</td>
                <td className="px-4 py-3">{p.reference ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{fmtMoney(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">El archivo CSV se puede abrir con Excel. Contiene los pagos que aparecen en tu historial según los permisos de la cuenta conectada.</p>
    </div>
  );
}
