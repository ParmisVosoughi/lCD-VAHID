ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS price_updated_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.set_variant_price_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price IS NOT NULL AND NEW.price > 0 THEN
      NEW.price_updated_at = now();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      NEW.price_updated_at = now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_variant_price_updated_at ON public.product_variants;
CREATE TRIGGER trg_set_variant_price_updated_at
BEFORE INSERT OR UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_variant_price_updated_at();

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('daily-exchange-rate-1700') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-exchange-rate-1700');
SELECT cron.unschedule('daily-exchange-rate-0000') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-exchange-rate-0000');

SELECT cron.schedule(
  'daily-exchange-rate-1700',
  '30 13 * * *',
  $$ SELECT net.http_post(
       url := 'https://lwwzljwdtqthwvoerzts.supabase.co/functions/v1/fetch-market-rates',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"source":"cron-1700"}'::jsonb
     ) $$
);

SELECT cron.schedule(
  'daily-exchange-rate-0000',
  '30 20 * * *',
  $$ SELECT net.http_post(
       url := 'https://lwwzljwdtqthwvoerzts.supabase.co/functions/v1/fetch-market-rates',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"source":"cron-0000"}'::jsonb
     ) $$
);