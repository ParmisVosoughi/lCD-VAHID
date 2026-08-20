ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'lcd';
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);