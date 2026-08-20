
CREATE TABLE public.market_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text NOT NULL UNIQUE,
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  rate_in_rial numeric NOT NULL,
  unit_label text NOT NULL,
  source_name text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  previous_rate_in_rial numeric,
  change_amount numeric,
  change_percent numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_rates TO anon, authenticated;
GRANT ALL ON public.market_rates TO service_role;
ALTER TABLE public.market_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_rates public read" ON public.market_rates FOR SELECT USING (true);

CREATE TABLE public.market_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text NOT NULL,
  rate_in_rial numeric NOT NULL,
  unit_label text NOT NULL,
  source_name text NOT NULL,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_code, rate_in_rial, fetched_at)
);
CREATE INDEX idx_market_rate_history_asset_time ON public.market_rate_history(asset_code, fetched_at DESC);
GRANT SELECT ON public.market_rate_history TO anon, authenticated;
GRANT ALL ON public.market_rate_history TO service_role;
ALTER TABLE public.market_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market_rate_history public read" ON public.market_rate_history FOR SELECT USING (true);

CREATE TRIGGER update_market_rates_updated_at
BEFORE UPDATE ON public.market_rates
FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();
