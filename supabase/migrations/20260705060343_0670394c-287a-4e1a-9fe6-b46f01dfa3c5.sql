
-- 1) Add optional change_source column to existing price history
ALTER TABLE public.product_price_history
  ADD COLUMN IF NOT EXISTS change_source text NOT NULL DEFAULT 'manual';

-- 2) Fix log_variant_price_change to also populate change_source and attach trigger
CREATE OR REPLACE FUNCTION public.log_variant_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  pct numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.price IS NOT NULL AND NEW.price <> 0 THEN
      INSERT INTO public.product_price_history(
        product_id, variant_id, variant_name, old_price, new_price, percentage_change, change_source
      ) VALUES (
        NEW.product_id, NEW.id, NEW.variant_name, NULL, NEW.price, NULL, 'insert'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      IF OLD.price IS NULL OR OLD.price = 0 THEN
        pct := NULL;
      ELSE
        pct := ((NEW.price - OLD.price) / OLD.price) * 100;
      END IF;
      INSERT INTO public.product_price_history(
        product_id, variant_id, variant_name, old_price, new_price, percentage_change, change_source
      ) VALUES (
        NEW.product_id, NEW.id, NEW.variant_name, OLD.price, NEW.price, pct, 'update'
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_log_variant_price_change ON public.product_variants;
CREATE TRIGGER trg_log_variant_price_change
AFTER INSERT OR UPDATE OF price ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.log_variant_price_change();

-- 3) Fix broken preview_variant_replace: correct regex escaping using dollar quotes
CREATE OR REPLACE FUNCTION public.preview_variant_replace(
  p_old text, p_new text, p_case_sensitive boolean, p_scope_type text, p_scope_value text
)
RETURNS TABLE(variant_id uuid, product_id uuid, product_title text, old_name text, new_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_pattern text;
BEGIN
  IF p_old IS NULL OR p_old = '' THEN
    RETURN;
  END IF;

  -- Escape regex metacharacters in p_old so it matches as a literal substring
  v_pattern := regexp_replace(p_old, $re$([\\.^$|()\[\]{}*+?])$re$, $re$\\&$re$, 'g');

  RETURN QUERY
  SELECT
    v.id AS variant_id,
    p.id AS product_id,
    p.title AS product_title,
    v.variant_name AS old_name,
    CASE
      WHEN p_case_sensitive THEN replace(v.variant_name, p_old, p_new)
      ELSE regexp_replace(v.variant_name, v_pattern, p_new, 'gi')
    END AS new_name
  FROM public.product_variants v
  JOIN public.products p ON p.id = v.product_id
  WHERE
    (CASE
       WHEN p_case_sensitive THEN position(p_old in v.variant_name) > 0
       ELSE position(lower(p_old) in lower(v.variant_name)) > 0
     END)
    AND (
      p_scope_type = 'all'
      OR (p_scope_type = 'category' AND p.category = p_scope_value)
      OR (p_scope_type = 'product' AND p.id::text = p_scope_value)
    );
END;
$fn$;

-- 4) Fix broken apply_variant_replace with same escaping
CREATE OR REPLACE FUNCTION public.apply_variant_replace(
  p_old text, p_new text, p_case_sensitive boolean, p_scope_type text, p_scope_value text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_count integer;
  v_pattern text;
BEGIN
  IF p_old IS NULL OR p_old = '' THEN
    RETURN 0;
  END IF;

  v_pattern := regexp_replace(p_old, $re$([\\.^$|()\[\]{}*+?])$re$, $re$\\&$re$, 'g');

  WITH updated AS (
    UPDATE public.product_variants v
    SET variant_name = CASE
      WHEN p_case_sensitive THEN replace(v.variant_name, p_old, p_new)
      ELSE regexp_replace(v.variant_name, v_pattern, p_new, 'gi')
    END
    FROM public.products p
    WHERE v.product_id = p.id
      AND (CASE
             WHEN p_case_sensitive THEN position(p_old in v.variant_name) > 0
             ELSE position(lower(p_old) in lower(v.variant_name)) > 0
           END)
      AND (
        p_scope_type = 'all'
        OR (p_scope_type = 'category' AND p.category = p_scope_value)
        OR (p_scope_type = 'product' AND p.id = p_scope_value::uuid)
      )
    RETURNING v.id
  )
  SELECT count(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.preview_variant_replace(text,text,boolean,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_variant_replace(text,text,boolean,text,text) TO anon, authenticated, service_role;
