import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { fetchClients, fetchLots, fetchContracts } from "@/lib/data";
import { addMonths, fmtDate, fmtMoney, todayISO } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/contratos")({
  head: () => ({ meta: [{ title: "Contratos · CALTIMER COBROS" }] }),
  component: Contratos,
});

type PlanItem = { kind: "inicial" | "cuota"; number: number; due_date: string; amount: string };

function Contratos() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: lots = [] } = useQuery({ queryKey: ["lots"], queryFn: fetchLots });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [lotId, setLotId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [signedDate, setSignedDate] = useState(todayISO());
  const [total, setTotal] = useState("");
  const [down, setDown] = useState("0");
  const [downDate, setDownDate] = useState(todayISO());
  const [count, setCount] = useState("12");
  const [firstDate, setFirstDate] = useState(addMonths(todayISO(), 1));
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState<PlanItem[]>([]);

  const filtered = useMemo(() => data.filter((c: any) =>
    `${c.clients?.full_name ?? ""} ${c.lots?.code ?? ""} ${c.contract_number ?? ""}`.toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  function buildPlan() {
    const t = Number(total), d = Number(down), n = Number(count);
    if (!(t > 0) || d < 0 || d > t || !Number.isInteger(n) || n < 1 || !firstDate || !downDate) {
      toast.error("Revisa el precio, la inicial, la cantidad de cuotas y las fechas.");
      return;
    }
    const rows: PlanItem[] = [];
    if (d > 0) rows.push({ kind: "inicial", number: 0, due_date: downDate, amount: d.toFixed(2) });
    const rest = Math.round((t - d) * 100) / 100;
    if (rest > 0) {
      const base = Math.floor((rest / n) * 100) / 100;
      let accumulated = 0;
      for (let i = 1; i <= n; i++) {
        const amount = i === n ? Math.round((rest - accumulated) * 100) / 100 : base;
        accumulated = Math.round((accumulated + amount) * 100) / 100;
        rows.push({ kind: "cuota", number: i, due_date: addMonths(firstDate, i - 1), amount: amount.toFixed(2) });
      }
    }
    setPlan(rows);
    toast.success("Plan generado. Puedes ajustar las fechas e importes antes de guardar.");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!clientId || !lotId) throw new Error("Selecciona un cliente y un lote.");
      if (!(Number(total) > 0)) throw new Error("El precio total debe ser mayor que cero.");
      if (!plan.length) throw new Error("Genera el plan de cuotas antes de guardar.");
      const sum = Math.round(plan.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;
      if (Math.abs(sum - Number(total)) > 0.01) throw new Error(`El plan suma ${fmtMoney(sum)} y debe sumar ${fmtMoney(Number(total))}. Ajusta los importes.`);
      if (plan.some(p => !p.due_date || !(Number(p.amount) > 0))) throw new Error("Cada cuota necesita una fecha e importe válido.");
      const { data: contract, error } = await supabase.from("contracts").insert({
        client_id: clientId, lot_id: lotId, contract_number: contractNumber.trim() || null,
        signed_date: signedDate, total_price: Number(total), notes: notes.trim() || null,
      }).select("id").single();
      if (error) throw error;
      const { error: installmentError } = await supabase.from("installments").insert(
        plan.map(p => ({ contract_id: contract.id, kind: p.kind, number: p.number, due_date: p.due_date, amount: Number(p.amount) }))
      );
      if (installmentError) {
        // Avoid leaving a contract without its planned installments.
        await supabase.from("contracts").delete().eq("id", contract.id);
        throw installmentError;
      }
      return contract.id;
    },
    onSuccess: () => {
      toast.success("Contrato y plan de cuotas guardados.");
      qc.invalidateQueries();
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setClientId(""); setLotId(""); setContractNumber(""); setSignedDate(todayISO());
    setTotal(""); setDown("0"); setDownDate(todayISO()); setCount("12");
    setFirstDate(addMonths(todayISO(), 1)); setNotes(""); setPlan([]);
  }

  return (
    <div>
      <PageHeader title="Contratos" subtitle="Administra contratos y planes de cuotas por cliente"
        actions={<Button onClick={() => { resetForm(); setOpen(true); }}><Plus className="mr-2 size-4" /> Nuevo contrato</Button>} />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente, lote o contrato…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="divide-y rounded-xl border bg-card shadow-card">
        {isLoading && <div className="p-8 text-center text-muted-foreground">Cargando contratos…</div>}
        {!isLoading && filtered.length === 0 && <div className="p-8 text-center text-muted-foreground">{data.length ? "No hay resultados." : "Aún no hay contratos. Crea el primero con “Nuevo contrato”."}</div>}
        {filtered.map((c: any) => (
          <div key={c.id} className="flex flex-col gap-2 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/contratos/$id" params={{ id: c.id }} className="font-semibold hover:text-primary">{c.clients?.full_name ?? "Cliente"} · Lote {c.lots?.code ?? "—"}</Link>
              <div className="text-xs text-muted-foreground">{c.contract_number ? `Contrato ${c.contract_number} · ` : ""}{fmtDate(c.signed_date)} · {c.lots?.project ?? "Proyecto no especificado"}</div>
            </div>
            <div className="font-semibold">{fmtMoney(c.total_price)}</div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear contrato y plan de cuotas</DialogTitle>
            <DialogDescription>El plan puede tener importes y fechas personalizados. Verifica que la suma coincida con el precio total.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Cliente *</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Seleccionar cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}</select></div>
            <div className="space-y-1.5"><Label>Lote *</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={lotId} onChange={e => setLotId(e.target.value)}><option value="">Seleccionar lote</option>{lots.map(l => <option key={l.id} value={l.id}>{l.code}{l.block ? ` · Mz. ${l.block}` : ""}{l.project ? ` · ${l.project}` : ""}</option>)}</select></div>
            <div className="space-y-1.5"><Label>Número de contrato</Label><Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="Ej. CAL-2026-001" /></div>
            <div className="space-y-1.5"><Label>Fecha de contrato *</Label><Input type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} required /></div>
            <div className="space-y-1.5"><Label>Precio total del lote (S/) *</Label><Input type="number" min="0.01" step="0.01" value={total} onChange={e => { setTotal(e.target.value); setPlan([]); }} placeholder="48000.00" /></div>
            <div className="space-y-1.5"><Label>Inicial (S/)</Label><Input type="number" min="0" step="0.01" value={down} onChange={e => { setDown(e.target.value); setPlan([]); }} /></div>
            <div className="space-y-1.5"><Label>Fecha de pago de inicial</Label><Input type="date" value={downDate} onChange={e => setDownDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Cantidad de cuotas mensuales</Label><Input type="number" min="1" max="600" value={count} onChange={e => { setCount(e.target.value); setPlan([]); }} /></div>
            <div className="space-y-1.5"><Label>Fecha de primera cuota</Label><Input type="date" value={firstDate} onChange={e => { setFirstDate(e.target.value); setPlan([]); }} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Notas del contrato</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condiciones o acuerdos relevantes" /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-sm text-muted-foreground">Genera un plan inicial y después modifica las fechas o los importes de cada cuota.</div>
            <Button type="button" variant="outline" onClick={buildPlan}>Generar / actualizar plan</Button>
          </div>
          {plan.length > 0 && <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-semibold"><span>Plan de pagos ({plan.length} movimientos)</span><span>Total: {fmtMoney(plan.reduce((s,p)=>s+Number(p.amount||0),0))}</span></div>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Concepto</th><th className="p-2 text-left">Vencimiento</th><th className="p-2 text-left">Importe (S/)</th></tr></thead>
                <tbody>{plan.map((p, idx) => <tr key={`${p.kind}-${p.number}`} className="border-t">
                  <td className="p-2">{p.kind === "inicial" ? "Inicial" : `Cuota ${p.number}`}</td>
                  <td className="p-2"><Input type="date" value={p.due_date} onChange={e => setPlan(old => old.map((x,i)=>i===idx?{...x,due_date:e.target.value}:x))} className="min-w-36" /></td>
                  <td className="p-2"><Input type="number" min="0.01" step="0.01" value={p.amount} onChange={e => setPlan(old => old.map((x,i)=>i===idx?{...x,amount:e.target.value}:x))} className="min-w-28" /></td>
                </tr>)}</tbody>
              </table>
            </div>
            <p className={Math.abs(plan.reduce((s,p)=>s+Number(p.amount||0),0)-Number(total))<0.01 ? "text-xs text-green-700" : "text-xs text-destructive"}>El plan debe sumar exactamente {fmtMoney(Number(total) || 0)} para poder guardarse.</p>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || plan.length === 0}>{save.isPending ? "Guardando…" : "Guardar contrato y cuotas"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
