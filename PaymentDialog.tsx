import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate, fmtMoney, todayISO } from "@/lib/finance";
import type { InstallmentView } from "@/lib/data";

export function PaymentDialog({ inst, onClose }: { inst: InstallmentView | null; onClose: () => void }) {
  const qc = useQueryClient();
  const balance = Number(inst?.balance ?? 0);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Efectivo");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (inst) {
      setAmount(balance.toFixed(2));
      setDate(todayISO());
      setReference("");
    }
  }, [inst, balance]);

  const save = useMutation({
    mutationFn: async () => {
      const n = Number(amount);
      if (!(n > 0)) throw new Error("Ingresa un monto mayor a 0");
      if (n > balance + 0.001) throw new Error(`El monto excede el saldo (${fmtMoney(balance)})`);
      const { error } = await supabase.from("payments").insert({
        installment_id: inst!.id!,
        amount: n,
        paid_on: date,
        method: method || null,
        reference: reference || null,
      });
      if (error) throw error;
      return n;
    },
    onSuccess: (n) => {
      toast.success(n < balance ? "Pago parcial registrado. La cuota sigue pendiente." : "Cuota pagada por completo.");
      qc.invalidateQueries();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!inst} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {inst?.client_name} · Lote {inst?.lot_code} · {inst?.kind === "inicial" ? "Inicial" : `Cuota ${inst?.number}`} (vence {fmtDate(inst?.due_date)})
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center text-sm">
          <div><div className="text-xs text-muted-foreground">Monto</div><div className="font-semibold">{fmtMoney(inst?.amount)}</div></div>
          <div><div className="text-xs text-muted-foreground">Pagado</div><div className="font-semibold">{fmtMoney(inst?.paid)}</div></div>
          <div><div className="text-xs text-muted-foreground">Saldo</div><div className="font-semibold text-primary">{fmtMoney(balance)}</div></div>
        </div>
        <form id="pay-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="space-y-1.5">
            <Label>Monto *</Label>
            <Input type="number" step="0.01" min="0.01" max={balance} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de pago *</Label>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Método</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Efectivo, Yape, transferencia…" />
          </div>
          <div className="space-y-1.5">
            <Label>N° operación / recibo</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="pay-form" disabled={save.isPending}>Registrar pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
