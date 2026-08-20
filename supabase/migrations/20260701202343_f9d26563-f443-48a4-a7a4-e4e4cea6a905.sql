
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  variant_name text NOT NULL,
  old_price numeric,
  new_price numeric NOT NULL,
  percentage_change numeric,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.product_price_history TO anon, authenticated;
GRANT ALL ON public.product_price_history TO service_role;

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price history" ON public.product_price_history FOR SELECT USING (true);
CREATE POLICY "Public insert price history" ON public.product_price_history FOR INSERT WITH CHECK (true);

CREATE INDEX idx_pph_product ON public.product_price_history(product_id);
CREATE INDEX idx_pph_variant ON public.product_price_history(variant_id);
CREATE INDEX idx_pph_changed_at ON public.product_price_history(changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_variant_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pct numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price IS NOT NULL AND NEW.price <> 0 THEN
      INSERT INTO public.product_price_history(product_id, variant_id, variant_name, old_price, new_price, percentage_change)
      VALUES (NEW.product_id, NEW.id, NEW.variant_name, NULL, NEW.price, NULL);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      IF OLD.price IS NULL OR OLD.price = 0 THEN
        pct := NULL;
      ELSE
        pct := ((NEW.price - OLD.price) / OLD.price) * 100;
      END IF;
      INSERT INTO public.product_price_history(product_id, variant_id, variant_name, old_price, new_price, percentage_change)
      VALUES (NEW.product_id, NEW.id, NEW.variant_name, OLD.price, NEW.price, pct);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_variant_price_change
AFTER INSERT OR UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.log_variant_price_change();
