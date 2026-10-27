
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  full_name text NOT NULL,
  document_id text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clients" ON public.clients FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  code text NOT NULL,
  project text,
  block text,
  area_m2 numeric(12,2),
  price numeric(12,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lots TO authenticated;
GRANT ALL ON public.lots TO service_role;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lots" ON public.lots FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  lot_id uuid NOT NULL REFERENCES public.lots(id) ON DELETE RESTRICT,
  contract_number text,
  signed_date date NOT NULL DEFAULT current_date,
  total_price numeric(12,2) NOT NULL CHECK (total_price >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contracts" ON public.contracts FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- kind: 'inicial' (down payment) or 'cuota'
CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'cuota' CHECK (kind IN ('inicial','cuota')),
  number int NOT NULL,
  due_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own installments" ON public.installments FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  installment_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  method text,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX ON public.installments(contract_id);
CREATE INDEX ON public.installments(due_date);
CREATE INDEX ON public.payments(installment_id);

-- Prevent paying more than the installment's remaining balance
CREATE OR REPLACE FUNCTION public.check_payment_amount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE inst_amount numeric; already numeric;
BEGIN
  SELECT amount INTO inst_amount FROM public.installments WHERE id = NEW.installment_id;
  SELECT COALESCE(SUM(amount),0) INTO already FROM public.payments
    WHERE installment_id = NEW.installment_id AND id <> NEW.id;
  IF already + NEW.amount > inst_amount THEN
    RAISE EXCEPTION 'El pago excede el saldo de la cuota (saldo: %)', inst_amount - already;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payments_check_amount BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.check_payment_amount();

-- Computed installment status: only 'pagada' when fully paid
CREATE VIEW public.installment_status WITH (security_invoker = true) AS
SELECT i.id, i.owner_id, i.contract_id, i.kind, i.number, i.due_date, i.amount,
  COALESCE(p.paid,0)::numeric(12,2) AS paid,
  (i.amount - COALESCE(p.paid,0))::numeric(12,2) AS balance,
  CASE
    WHEN COALESCE(p.paid,0) >= i.amount THEN 'pagada'
    WHEN i.due_date < current_date THEN 'vencida'
    WHEN COALESCE(p.paid,0) > 0 THEN 'parcial'
    ELSE 'pendiente'
  END AS status,
  c.client_id, c.lot_id, c.contract_number, cl.full_name AS client_name, cl.phone AS client_phone, l.code AS lot_code
FROM public.installments i
JOIN public.contracts c ON c.id = i.contract_id
JOIN public.clients cl ON cl.id = c.client_id
JOIN public.lots l ON l.id = c.lot_id
LEFT JOIN (SELECT installment_id, SUM(amount) AS paid FROM public.payments GROUP BY installment_id) p ON p.installment_id = i.id;
GRANT SELECT ON public.installment_status TO authenticated;
