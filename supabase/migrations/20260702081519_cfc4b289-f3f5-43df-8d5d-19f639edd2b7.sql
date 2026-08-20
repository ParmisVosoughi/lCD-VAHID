
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  jalali_date TEXT NOT NULL,
  gregorian_date DATE NOT NULL,
  printed_time TEXT NOT NULL,
  print_copies INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Public insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invoices" ON public.invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete invoices" ON public.invoices FOR DELETE USING (true);

CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX idx_invoices_customer_name ON public.invoices(customer_name);

CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID,
  variant_id UUID,
  product_title TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  original_product_price NUMERIC NOT NULL DEFAULT 0,
  invoice_unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO anon, authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read invoice_items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Public insert invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update invoice_items" ON public.invoice_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete invoice_items" ON public.invoice_items FOR DELETE USING (true);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
