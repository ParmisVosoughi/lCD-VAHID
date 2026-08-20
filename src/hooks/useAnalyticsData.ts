import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceHistoryRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  variant_name: string;
  old_price: number | null;
  new_price: number;
  percentage_change: number | null;
  changed_at: string;
}

export interface VariantRow {
  id: string;
  product_id: string;
  variant_name: string;
  price: number;
  display_order: number;
}

export interface ProductRow {
  id: string;
  title: string;
  category: string;
  created_at: string;
}

export function useAnalyticsData() {
  const products = useQuery({
    queryKey: ['analytics', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, category, created_at');
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    refetchInterval: 15000,
  });

  const variants = useQuery({
    queryKey: ['analytics', 'variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, variant_name, price, display_order');
      if (error) throw error;
      return (data ?? []) as VariantRow[];
    },
    refetchInterval: 15000,
  });

  const history = useQuery({
    queryKey: ['analytics', 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_price_history')
        .select('id, product_id, variant_id, variant_name, old_price, new_price, percentage_change, changed_at')
        .order('changed_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as PriceHistoryRow[];
    },
    refetchInterval: 15000,
  });

  return {
    products: products.data ?? [],
    variants: variants.data ?? [],
    history: history.data ?? [],
    isLoading: products.isLoading || variants.isLoading || history.isLoading,
    error: products.error || variants.error || history.error,
  };
}
