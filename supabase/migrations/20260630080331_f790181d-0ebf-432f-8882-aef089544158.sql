CREATE TABLE public.variant_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  names jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.variant_presets TO anon, authenticated;
GRANT ALL ON public.variant_presets TO service_role;

ALTER TABLE public.variant_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read presets" ON public.variant_presets FOR SELECT USING (true);
CREATE POLICY "Public insert presets" ON public.variant_presets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update presets" ON public.variant_presets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete presets" ON public.variant_presets FOR DELETE USING (true);

CREATE TRIGGER trg_variant_presets_updated_at
  BEFORE UPDATE ON public.variant_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_products_updated_at();

INSERT INTO public.variant_presets (slug, names)
VALUES ('default', '["TFT","Mechanic","Oled N/F","Oled W/F","Pack N/F","Pack W/F","Org 100%"]'::jsonb);
