import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRESET_SLUG = 'default';
const QUERY_KEY = ['variant_preset', PRESET_SLUG] as const;

export const DEFAULT_PRESET_BG = '#ffffff';
export const DEFAULT_PRESET_TEXT = '#000000';

export interface PresetItem {
  name: string;
  badgeColor: string;
  textColor: string;
}

function normalize(raw: unknown): PresetItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): PresetItem | null => {
      if (typeof item === 'string') {
        return { name: item, badgeColor: DEFAULT_PRESET_BG, textColor: DEFAULT_PRESET_TEXT };
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const name = typeof obj.name === 'string' ? obj.name : '';
        if (!name) return null;
        return {
          name,
          badgeColor: typeof obj.badge_color === 'string' ? obj.badge_color
            : typeof obj.badgeColor === 'string' ? obj.badgeColor
            : DEFAULT_PRESET_BG,
          textColor: typeof obj.text_color === 'string' ? obj.text_color
            : typeof obj.textColor === 'string' ? obj.textColor
            : DEFAULT_PRESET_TEXT,
        };
      }
      return null;
    })
    .filter((x): x is PresetItem => !!x);
}

async function fetchPreset(): Promise<PresetItem[]> {
  const { data, error } = await supabase
    .from('variant_presets' as never)
    .select('names')
    .eq('slug', PRESET_SLUG)
    .maybeSingle();
  if (error) throw error;
  return normalize((data as { names?: unknown } | null)?.names);
}

export function useVariantPreset() {
  const qc = useQueryClient();

  const { data: presets = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPreset,
    staleTime: 60_000,
  });

  const names = useMemo(() => presets.map(p => p.name), [presets]);

  const saveMutation = useMutation({
    mutationFn: async (next: PresetItem[]) => {
      const clean = next
        .map(p => ({
          name: p.name.trim(),
          badge_color: p.badgeColor || DEFAULT_PRESET_BG,
          text_color: p.textColor || DEFAULT_PRESET_TEXT,
        }))
        .filter(p => p.name);
      const { error } = await supabase
        .from('variant_presets' as never)
        .upsert({ slug: PRESET_SLUG, names: clean } as never, { onConflict: 'slug' });
      if (error) throw error;
      return clean;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const savePreset = useCallback(
    async (next: PresetItem[]) => {
      try {
        await saveMutation.mutateAsync(next);
        return true;
      } catch {
        return false;
      }
    },
    [saveMutation],
  );

  return { presets, names, isLoading, savePreset };
}
