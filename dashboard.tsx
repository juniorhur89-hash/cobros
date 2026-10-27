import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CircleDollarSign, Clock } from "lucide-react";
import { fetchInstallments, type InstallmentView } from "@/lib/data";
import { addMonths, fmtDate, fmtMoney, todayISO } from "@/lib/finance";
import { PageHeader, StatusBadge } from "@/components/StatusBadge";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · CALTIMER COBROS" }] }),
  component: Dashboard,
});

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const { data = [], isLoading } = useQuery({ queryKey: ["installments"], queryFn: fetchInstallments });
  const [paying, setPaying] = useState<InstallmentView | null>(null);
  const today = todayISO();

  const s = useMemo(() => {
    const open = data.filter((i) => i.status !== "pagada");
    const dueToday = open.filter((i) => i.due_date === today);
    const in7 = addDays(today, 7);
    const upcoming = open.filter((i) => i.due_date! > today && i.due_date! <= in7);
    const overdue = open.filter((i) => i.status === "vencida");
    const sum = (a: InstallmentView[]) => a.reduce((t, i) => t + Number(i.balance ?? 0), 0);
    return { dueToday, upcoming, overdue, sumToday: sum(dueToday), sumUp: sum(upcoming), sumOver: sum(overdue), pending: sum(open) };
  }, [data, today]);

  const cards = [
    { label: "Cobros de hoy", value: fmtMoney(s.sumToday), sub: `${s.dueToday.length} cuota(s)`, icon: Clock },
    { label: "Próximos 7 días", value: fmtMoney(s.sumUp), sub: `${s.upcoming.length} cuota(s)`, icon: CalendarClock },
    { label: "Atrasos", value: fmtMoney(s.sumOver), sub: `${s.overdue.length} cuota(s) vencidas`, icon: AlertTriangle, danger: true },
    { label: "Saldo pendiente total", value: fmtMoney(s.pending), sub: "Por cobrar en todos los contratos", icon: CircleDollarSign },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Hoy, ${fmtDate(today)}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, idx) => (
          <div key={c.label} className={idx === 3 ? "rounded-xl bg-navy-gradient p-5 text-primary-foreground shadow-card" : "rounded-xl border bg-card p-5 shadow-card"}>
            <div className="flex items-center justify-between">
              <span className={idx === 3 ? "text-sm text-primary-foreground/70" : "text-sm text-muted-foreground"}>{c.label}</span>
              <c.icon className={c.danger ? "size-5 text-destructive" : idx === 3 ? "size-5 text-gold" : "size-5 text-primary"} />
            </div>
            <div className="mt-3 font-display text-3xl">{isLoading ? "…" : c.value}</div>
            <div className={idx === 3 ? "mt-1 text-xs text-primary-foreground/60" : "mt-1 text-xs text-muted-foreground"}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <List title="Atrasos" items={s.overdue} empty="No hay cuotas vencidas." onPay={setPaying} />
        <List title="Hoy y próximos 7 días" items={[...s.dueToday, ...s.upcoming]} empty="No hay vencimientos próximos." onPay={setPaying} />
      </div>
      {data.length === 0 && !isLoading && (
        <div className="mt-8 rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-muted-foreground">Empieza registrando clientes y lotes, luego crea un contrato con su plan de cuotas.</p>
          <Button asChild className="mt-4"><Link to="/contratos">Ir a contratos</Link></Button>
        </div>
      )}
      <PaymentDialog inst={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function List({ title, items, empty, onPay }: { title: string; items: InstallmentView[]; empty: string; onPay: (i: InstallmentView) => void }) {
  return (
    <section className="rounded-xl border bg-card shadow-card">
      <h2 className="border-b px-5 py-4 font-display text-xl text-primary">{title}</h2>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="max-h-[480px] divide-y overflow-y-auto">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link to="/contratos/$id" params={{ id: i.contract_id! }} className="block truncate font-semibold hover:text-primary">{i.client_name}</Link>
                <div className="text-xs text-muted-foreground">
                  Lote {i.lot_code} · {i.kind === "inicial" ? "Inicial" : `Cuota ${i.number}`} · {fmtDate(i.due_date)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold">{fmtMoney(i.balance)}</div>
                  <StatusBadge status={i.status!} />
                </div>
                <Button size="sm" variant="outline" onClick={() => onPay(i)}>Cobrar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { addMonths };
