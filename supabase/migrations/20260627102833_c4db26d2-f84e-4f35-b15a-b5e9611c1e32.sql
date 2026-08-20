
DROP TABLE IF EXISTS public.manual_products CASCADE;

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete products" ON public.products FOR DELETE USING (true);

CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  badge_color TEXT NOT NULL DEFAULT '#22c55e',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Public insert variants" ON public.product_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update variants" ON public.product_variants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete variants" ON public.product_variants FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();
