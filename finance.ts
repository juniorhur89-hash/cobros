export type InstallmentStatus = "pagada" | "parcial" | "vencida" | "pendiente";

export interface PlanRow {
  kind: "inicial" | "cuota";
  number: number;
  due_date: string; // YYYY-MM-DD
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Adds months to a YYYY-MM-DD date, clamping to the last day of the month. */
export function addMonths(date: string, months: number): string {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/**
 * Builds a payment plan: optional down payment ("inicial") plus N monthly
 * installments splitting the remaining balance. Rounding difference goes to the last one.
 */
export function generatePlan(opts: {
  total: number;
  downPayment: number;
  downPaymentDate: string;
  count: number;
  firstDueDate: string;
}): PlanRow[] {
  const rows: PlanRow[] = [];
  const down = round2(Math.max(0, opts.downPayment));
  if (down > 0) rows.push({ kind: "inicial", number: 0, due_date: opts.downPaymentDate, amount: down });
  const remaining = round2(opts.total - down);
  if (opts.count > 0 && remaining > 0) {
    const base = Math.floor((remaining / opts.count) * 100) / 100;
    let acc = 0;
    for (let i = 1; i <= opts.count; i++) {
      const amount = i === opts.count ? round2(remaining - acc) : base;
      acc = round2(acc + amount);
      rows.push({ kind: "cuota", number: i, due_date: addMonths(opts.firstDueDate, i - 1), amount });
    }
  }
  return rows;
}

/** An installment is "pagada" only when the full amount was paid; partial payments never mark it as paid. */
export function installmentStatus(amount: number, paid: number, dueDate: string, today: string): InstallmentStatus {
  if (round2(paid) >= round2(amount)) return "pagada";
  if (dueDate < today) return "vencida";
  if (paid > 0) return "parcial";
  return "pendiente";
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const money = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });
export const fmtMoney = (n: number | null | undefined) => money.format(Number(n ?? 0));

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const statusLabel: Record<InstallmentStatus, string> = {
  pagada: "Pagada",
  parcial: "Parcial",
  vencida: "Vencida",
  pendiente: "Pendiente",
};
