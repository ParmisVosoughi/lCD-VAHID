
-- 1) Invoice item category tag (optional, per-row)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS item_category text;

-- 2) Audit log for bulk variant name replacements
CREATE TABLE IF NOT EXISTS public.variant_replace_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_text text NOT NULL,
  new_text text NOT NULL,
  scope_type text NOT NULL DEFAULT 'all',
  scope_value text,
  case_sensitive boolean NOT NULL DEFAULT false,
  affected_count integer NOT NULL DEFAULT 0,
  admin_user text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.variant_replace_logs TO anon;
GRANT SELECT, INSERT ON public.variant_replace_logs TO authenticated;
GRANT ALL ON public.variant_replace_logs TO service_role;

ALTER TABLE public.variant_replace_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read replace logs"
  ON public.variant_replace_logs FOR SELECT
  USING (true);

CREATE POLICY "public insert replace logs"
  ON public.variant_replace_logs FOR INSERT
  WITH CHECK (true);

-- 3) Preview: return matching variants (name-only match) filtered by scope
CREATE OR REPLACE FUNCTION public.preview_variant_replace(
  p_old text,
  p_new text,
  p_case_sensitive boolean,
  p_scope_type text,
  p_scope_value text
)
RETURNS TABLE (
  variant_id uuid,
  product_id uuid,
  product_title text,
  old_name text,
  new_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_old IS NULL OR p_old = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v.id AS variant_id,
    p.id AS product_id,
    p.title AS product_title,
    v.variant_name AS old_name,
    CASE
      WHEN p_case_sensitive THEN replace(v.variant_name, p_old, p_new)
      ELSE regexp_replace(v.variant_name, regexp_replace(p_old, '([\\.^$|()\\[\\]{}*+?])', '\\\\\\1', 'g'), p_new, 'gi')
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
$$;

-- 4) Apply: perform the update and return affected count
CREATE OR REPLACE FUNCTION public.apply_variant_replace(
  p_old text,
  p_new text,
  p_case_sensitive boolean,
  p_scope_type text,
  p_scope_value text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_pattern text;
BEGIN
  IF p_old IS NULL OR p_old = '' THEN
    RETURN 0;
  END IF;

  v_pattern := regexp_replace(p_old, '([\\.^$|()\\[\\]{}*+?])', '\\\\\\1', 'g');

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
$$;

GRANT EXECUTE ON FUNCTION public.preview_variant_replace(text,text,boolean,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_variant_replace(text,text,boolean,text,text) TO anon, authenticated, service_role;
