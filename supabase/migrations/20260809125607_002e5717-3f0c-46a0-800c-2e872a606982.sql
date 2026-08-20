ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS website_product_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS show_thumbnail boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS print_format text NOT NULL DEFAULT 'thermal80',
  ADD COLUMN IF NOT EXISTS payment_method text;

GRANT ALL ON public.backup_snapshots TO service_role;
REVOKE ALL ON public.backup_snapshots FROM anon, authenticated;