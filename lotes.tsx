import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud, type Field } from "@/components/SimpleCrud";
import { fmtMoney } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/lotes")({
  head: () => ({ meta: [{ title: "Lotes · CALTIMER COBROS" }] }),
  component: () => <SimpleCrud table="lots" title="Lotes" subtitle="Inventario de lotes vendidos o por vender" singular="Lote" orderBy="code" fields={fields} />,
});

const fields: Field[] = [
  { key: "code", label: "Código / N° de lote", required: true, table: true },
  { key: "project", label: "Proyecto / Urbanización", table: true },
  { key: "block", label: "Manzana", table: true },
  { key: "area_m2", label: "Área (m²)", type: "number", table: true },
  { key: "price", label: "Precio de lista", type: "number", table: true, format: (v) => (v == null ? "—" : fmtMoney(Number(v))) },
  { key: "notes", label: "Notas", type: "textarea" },
];
