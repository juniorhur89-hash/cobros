import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/StatusBadge";

export interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "textarea";
  required?: boolean;
  table?: boolean;
  format?: (v: unknown) => string;
}

type Row = Record<string, unknown> & { id: string };

export function SimpleCrud({
  table,
  title,
  subtitle,
  singular,
  fields,
  orderBy,
}: {
  table: "clients" | "lots";
  title: string;
  subtitle: string;
  singular: string;
  fields: Field[];
  orderBy: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order(orderBy);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) => fields.some((f) => String(r[f.key] ?? "").toLowerCase().includes(s)));
  }, [data, q, fields]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | number | null> = {};
      for (const f of fields) {
        const v = (form[f.key] ?? "").trim();
        payload[f.key] = v === "" ? null : f.type === "number" ? Number(v) : v;
      }
      const res = editing
        ? await supabase.from(table).update(payload as never).eq("id", editing.id)
        : await supabase.from(table).insert(payload as never);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success(editing ? "Cambios guardados" : `${singular} registrado`);
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.code === "23503" ? "No se puede eliminar: tiene contratos asociados." : error.message);
    },
    onSuccess: () => {
      toast.success("Eliminado");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openForm(row: Row | null) {
    setEditing(row);
    const f: Record<string, string> = {};
    for (const fld of fields) f[fld.key] = row?.[fld.key] != null ? String(row[fld.key]) : "";
    setForm(f);
    setOpen(true);
  }

  const cols = fields.filter((f) => f.table);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<Button onClick={() => openForm(null)}><Plus /> Nuevo {singular.toLowerCase()}</Button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {cols.map((c) => <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>)}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={cols.length + 1} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={cols.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                {data.length === 0 ? `Aún no hay registros. Crea el primero con “Nuevo ${singular.toLowerCase()}”.` : "Sin resultados."}
              </td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/50">
                {cols.map((c) => (
                  <td key={c.key} className="px-4 py-3">{c.format ? c.format(r[c.key]) : String(r[c.key] ?? "—")}</td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openForm(r)} aria-label="Editar"><Pencil /></Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar"
                    onClick={() => confirm("¿Eliminar este registro?") && remove.mutate(r.id)}
                  ><Trash2 className="text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Editar ${singular.toLowerCase()}` : `Nuevo ${singular.toLowerCase()}`}</DialogTitle></DialogHeader>
          <form
            id="crud-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <Label>{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    step={f.type === "number" ? "0.01" : undefined}
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="crud-form" disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
