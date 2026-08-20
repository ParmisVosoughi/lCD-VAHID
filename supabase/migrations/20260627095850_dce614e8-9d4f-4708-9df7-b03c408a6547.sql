
CREATE TABLE public.manual_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_products TO anon, authenticated;
GRANT ALL ON public.manual_products TO service_role;

ALTER TABLE public.manual_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read all manual_products" ON public.manual_products FOR SELECT USING (true);
CREATE POLICY "Allow insert manual_products" ON public.manual_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update manual_products" ON public.manual_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete manual_products" ON public.manual_products FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_manual_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_manual_products_updated_at
BEFORE UPDATE ON public.manual_products
FOR EACH ROW EXECUTE FUNCTION public.update_manual_products_updated_at();
