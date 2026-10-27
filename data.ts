import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Lot = Database["public"]["Tables"]["lots"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type Installment = Database["public"]["Tables"]["installments"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type InstallmentView = Database["public"]["Views"]["installment_status"]["Row"];

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const fetchClients = async () =>
  check(await supabase.from("clients").select("*").order("full_name"));
export const fetchLots = async () => check(await supabase.from("lots").select("*").order("code"));
export const fetchContracts = async () =>
  check(
    await supabase
      .from("contracts")
      .select("*, clients(full_name, phone), lots(code, project, block)")
      .order("created_at", { ascending: false }),
  );
export const fetchInstallments = async () =>
  check(await supabase.from("installment_status").select("*").order("due_date"));
export const fetchPayments = async () =>
  check(
    await supabase
      .from("payments")
      .select("*, installments(kind, number, due_date, contract_id, contracts(contract_number, clients(full_name), lots(code)))")
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
  );

export { check };
