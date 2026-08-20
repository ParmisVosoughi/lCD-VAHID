-- 1. Key Number per variant
CREATE SEQUENCE IF NOT EXISTS public.variant_key_number_seq;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS key_number bigint;

UPDATE public.product_variants
  SET key_number = nextval('public.variant_key_number_seq')
  WHERE key_number IS NULL;

ALTER TABLE public.product_variants
  ALTER COLUMN key_number SET DEFAULT nextval('public.variant_key_number_seq');

ALTER TABLE public.product_variants
  ALTER COLUMN key_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_key_number_key'
  ) THEN
    ALTER TABLE public.product_variants
      ADD CONSTRAINT product_variants_key_number_key UNIQUE (key_number);
  END IF;
END $$;

SELECT setval('public.variant_key_number_seq',
  GREATEST((SELECT COALESCE(MAX(key_number), 0) FROM public.product_variants), 1));

-- 2. Purchase / calculation info per variant (independent from selling price)
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS purchase_currency text,
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS purchase_exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS shipping_cost_rial numeric,
  ADD COLUMN IF NOT EXISTS purchase_calculated_at timestamptz;

-- 3. Shared daily currency rates
CREATE TABLE IF NOT EXISTS public.daily_currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  rate numeric NOT NULL,
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (currency, rate_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_currency_rates TO anon, authenticated;
GRANT ALL ON public.daily_currency_rates TO service_role;

ALTER TABLE public.daily_currency_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read daily rates" ON public.daily_currency_rates;
CREATE POLICY "Public read daily rates" ON public.daily_currency_rates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert daily rates" ON public.daily_currency_rates;
CREATE POLICY "Public insert daily rates" ON public.daily_currency_rates FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public update daily rates" ON public.daily_currency_rates;
CREATE POLICY "Public update daily rates" ON public.daily_currency_rates FOR UPDATE USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_daily_currency_rates_updated_at ON public.daily_currency_rates;
CREATE TRIGGER trg_daily_currency_rates_updated_at
  BEFORE UPDATE ON public.daily_currency_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

-- 4. Bulk percentage application across an entire category
CREATE OR REPLACE FUNCTION public.apply_percentage_to_category(
  p_category text,
  p_direction text,
  p_percent numeric,
  p_round_unit integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_factor numeric;
  v_unit numeric;
BEGIN
  IF p_percent IS NULL OR p_percent <= 0 THEN RETURN 0; END IF;
  IF p_direction NOT IN ('increase', 'decrease') THEN
    RAISE EXCEPTION 'invalid direction';
  END IF;

  v_unit := GREATEST(COALESCE(p_round_unit, 1000), 1);
  v_factor := CASE WHEN p_direction = 'increase'
                   THEN 1 + (p_percent / 100.0)
                   ELSE 1 - (p_percent / 100.0) END;

  WITH updated AS (
    UPDATE public.product_variants v
    SET price = ceil((v.price * v_factor) / v_unit) * v_unit
    FROM public.products p
    WHERE v.product_id = p.id
      AND (p_category = 'all' OR p.category = p_category)
      AND v.price > 0
      AND ceil((v.price * v_factor) / v_unit) * v_unit IS DISTINCT FROM v.price
    RETURNING v.id
  )
  SELECT count(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$$;
