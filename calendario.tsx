import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchInstallments } from "@/lib/data";
import { fmtDate, fmtMoney, todayISO } from "@/lib/finance";
import { PageHeader, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendario · CALTIMER COBROS" }] }),
  component: Calendario,
});

function Calendario() {
  const { data = [], isLoading } = useQuery({ queryKey: ["installments"], queryFn: fetchInstallments });
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [mode, setMode] = useState<"mes" | "todos" | "vencidas">("mes");
  const open = data.filter((i) => i.status !== "pagada");
  const visible = useMemo(() => open.filter(i => {
    if (!i.due_date) return false;
    if (mode === "vencidas") return i.due_date < today;
    if (mode === "todos") return true;
    return i.due_date.slice(0, 7) === month;
  }).sort((a,b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")), [open, mode, month, today]);
  const total = visible.reduce((sum, i) => sum + Number(i.balance ?? 0), 0);
  function shiftMonth(delta: number) {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  function reminder(i: typeof visible[number]) {
    if (!i.client_phone) return;
    const text = `Hola ${i.client_name ?? ""}, te recordamos que tienes pendiente el pago de ${i.kind === "inicial" ? "la inicial" : `la cuota ${i.number}`} de tu lote ${i.lot_code ?? ""} por ${fmtMoney(i.balance)}. Fecha de vencimiento: ${fmtDate(i.due_date)}. Por favor, confírmanos cuando realices el pago. Gracias, Caltimer.`;
    const phone = i.client_phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith("51") ? phone : `51${phone}`}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <PageHeader title="Calendario de cobranza" subtitle="Organiza los vencimientos y prepara recordatorios para cada cliente" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => shiftMonth(-1)}><ChevronLeft className="size-4" /></Button>
        <Input aria-label="Seleccionar mes" type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" />
        <Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => shiftMonth(1)}><ChevronRight className="size-4" /></Button>
        <Button variant={mode === "mes" ? "default" : "outline"} onClick={() => setMode("mes")}>Este mes</Button>
        <Button variant={mode === "vencidas" ? "default" : "outline"} onClick={() => setMode("vencidas")}>Vencidas</Button>
        <Button variant={mode === "todos" ? "default" : "outline"} onClick={() => setMode("todos")}>Todas</Button>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Cuotas mostradas</div><div className="mt-1 text-2xl font-semibold">{visible.length}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Saldo pendiente listado</div><div className="mt-1 text-2xl font-semibold">{fmtMoney(total)}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Vencidas en lista</div><div className="mt-1 text-2xl font-semibold">{visible.filter(i => i.due_date! < today).length}</div></div>
      </div>
      <div className="divide-y rounded-xl border bg-card shadow-card">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Cargando vencimientos…</div>}
        {!isLoading && visible.length === 0 && <div className="p-8 text-center text-muted-foreground">No hay cuotas pendientes para este filtro.</div>}
        {visible.map((i) => (
          <div key={i.id} className="flex flex-col gap-3 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="min-w-24 font-semibold">{fmtDate(i.due_date)}</div>
              <div><div className="font-medium">{i.client_name} · Lote {i.lot_code}</div><div className="text-xs text-muted-foreground">{i.kind === "inicial" ? "Inicial" : `Cuota ${i.number}`} · {i.client_phone ?? "Sin teléfono registrado"}</div></div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <div className="text-right"><div className="font-semibold">{fmtMoney(i.balance)}</div><StatusBadge status={i.status ?? "pendiente"} /></div>
              {i.client_phone && <Button variant="outline" size="sm" onClick={() => reminder(i)}><MessageCircle className="mr-2 size-4" />Preparar WhatsApp</Button>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Los mensajes se preparan en WhatsApp para que puedas revisarlos y enviarlos manualmente. No se envían automáticamente.</p>
    </div>
  );
}
