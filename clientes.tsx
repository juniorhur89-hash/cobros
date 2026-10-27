import { createFileRoute } from "@tanstack/react-router";
import { SimpleCrud, type Field } from "@/components/SimpleCrud";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes · CALTIMER COBROS" }] }),
  component: () => <SimpleCrud table="clients" title="Clientes" subtitle="Compradores de lotes" singular="Cliente" orderBy="full_name" fields={fields} />,
});

const fields: Field[] = [
  { key: "full_name", label: "Nombre completo", required: true, table: true },
  { key: "document_id", label: "DNI / RUC", table: true },
  { key: "phone", label: "Teléfono", table: true },
  { key: "email", label: "Correo", type: "email", table: true },
  { key: "address", label: "Dirección" },
  { key: "notes", label: "Notas", type: "textarea" },
];
