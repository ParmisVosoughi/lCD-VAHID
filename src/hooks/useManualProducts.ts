import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CategoryKey, DEFAULT_CATEGORY, isValidCategory } from '@/lib/categories';
import { CurrencyCode, isCurrencyCode } from '@/lib/currencies';

export interface VariantPurchaseInfo {
  purchaseCurrency: CurrencyCode | null;
  purchasePrice: number | null;
  purchaseExchangeRate: number | null;
  shippingCostRial: number | null;
  purchaseCalculatedAt: string | null;
}

export interface ManualVariant extends Partial<VariantPurchaseInfo> {
  id: string;
  name: string;
  price: number;
  color: string;
  textColor: string;
  display_order?: number;
  keyNumber?: number | null;
  /** Last time the price changed — powers the temporary NEW badge. */
  priceUpdatedAt?: string | null;
}

export interface ProductLinks {
  websiteProductUrl: string | null;
  thumbnailUrl: string | null;
  showThumbnail: boolean;
}

export interface ManualProduct extends ProductLinks {
  id: string;
  title: string;
  category: CategoryKey;
  variants: ManualVariant[];
  created_at: string;
  updated_at: string;
}

interface ProductRow {
  id: string;
  title: string;
  category: string | null;
  website_product_url: string | null;
  thumbnail_url: string | null;
  show_thumbnail: boolean | null;
  created_at: string;
  updated_at: string;
  product_variants: {
    id: string;
    variant_name: string;
    price: number;
    badge_color: string;
    text_color: string | null;
    display_order: number;
    key_number: number | null;
    purchase_currency: string | null;
    purchase_price: number | null;
    purchase_exchange_rate: number | null;
    shipping_cost_rial: number | null;
    purchase_calculated_at: string | null;
    price_updated_at: string | null;
  }[];
}

const QUERY_KEY = ['manual_products'] as const;

const VARIANT_COLUMNS =
  'id, variant_name, price, badge_color, text_color, display_order, key_number, purchase_currency, purchase_price, purchase_exchange_rate, shipping_cost_rial, purchase_calculated_at, price_updated_at';

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);

async function fetchManualProducts(): Promise<ManualProduct[]> {
  const { data, error } = await supabase
    .from('products')
    // `category` exists post-migration; cast keeps types happy until regenerated.
    .select(`id, title, category, website_product_url, thumbnail_url, show_thumbnail, created_at, updated_at, product_variants(${VARIANT_COLUMNS})` as never)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(p => ({
    id: p.id,
    title: p.title,
    category: isValidCategory(p.category ?? '') ? (p.category as CategoryKey) : DEFAULT_CATEGORY,
    websiteProductUrl: p.website_product_url ?? null,
    thumbnailUrl: p.thumbnail_url ?? null,
    showThumbnail: !!p.show_thumbnail,
    created_at: p.created_at,
    updated_at: p.updated_at,
    variants: [...p.product_variants]
      .sort((a, b) => a.display_order - b.display_order)
      .map(v => ({
        id: v.id,
        name: v.variant_name,
        price: Number(v.price),
        color: v.badge_color,
        textColor: v.text_color ?? '#ffffff',
        display_order: v.display_order,
        keyNumber: v.key_number ?? null,
        purchaseCurrency: isCurrencyCode(v.purchase_currency) ? v.purchase_currency : null,
        purchasePrice: num(v.purchase_price),
        purchaseExchangeRate: num(v.purchase_exchange_rate),
        shippingCostRial: num(v.shipping_cost_rial),
        purchaseCalculatedAt: v.purchase_calculated_at ?? null,
        priceUpdatedAt: v.price_updated_at ?? null,
      })),
  }));
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function insertVariants(productId: string, variants: ManualVariant[]) {
  if (!variants.length) return;
  const rows = variants.map((v, i) => ({
    product_id: productId,
    variant_name: v.name,
    price: v.price,
    badge_color: v.color,
    text_color: v.textColor,
    display_order: i,
  }));
  const { error } = await supabase.from('product_variants').insert(rows);
  if (error) throw error;
}

/**
 * Syncs variants without destroying existing rows: existing variants are updated
 * in place (so Key Number and purchase info survive), new ones inserted,
 * removed ones deleted.
 */
async function syncVariants(productId: string, variants: ManualVariant[]) {
  const { data: existing, error: exErr } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (exErr) throw exErr;
  const existingIds = new Set((existing ?? []).map(r => r.id as string));

  const keptIds: string[] = [];
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const payload = {
      variant_name: v.name,
      price: v.price,
      badge_color: v.color,
      text_color: v.textColor,
      display_order: i,
    };
    if (isUuid(v.id) && existingIds.has(v.id)) {
      keptIds.push(v.id);
      const { error } = await supabase.from('product_variants').update(payload).eq('id', v.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('product_variants')
        .insert({ product_id: productId, ...payload });
      if (error) throw error;
    }
  }

  const toDelete = [...existingIds].filter(id => !keptIds.includes(id));
  if (toDelete.length) {
    const { error } = await supabase.from('product_variants').delete().in('id', toDelete);
    if (error) throw error;
  }
}

export function useManualProducts() {
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchManualProducts,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: async ({
      title,
      category,
      variants,
      links,
    }: {
      title: string;
      category: CategoryKey;
      variants: ManualVariant[];
      links?: ProductLinks;
    }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          title,
          category,
          website_product_url: links?.websiteProductUrl ?? null,
          thumbnail_url: links?.thumbnailUrl ?? null,
          show_thumbnail: links?.showThumbnail ?? false,
        } as never)
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Insert failed');
      try {
        await insertVariants(data.id, variants);
      } catch (e) {
        await supabase.from('products').delete().eq('id', data.id);
        throw e;
      }
      return data.id;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      title,
      category,
      variants,
      links,
    }: {
      id: string;
      title: string;
      category: CategoryKey;
      variants: ManualVariant[];
      links?: ProductLinks;
    }) => {
      const { error: upErr } = await supabase
        .from('products')
        .update({
          title,
          category,
          website_product_url: links?.websiteProductUrl ?? null,
          thumbnail_url: links?.thumbnailUrl ?? null,
          show_thumbnail: links?.showThumbnail ?? false,
        } as never)
        .eq('id', id);
      if (upErr) throw upErr;
      await syncVariants(id, variants);
      return id;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
      if (error) throw error;
      return variantId;
    },
    onSuccess: invalidate,
  });

  const createProduct = useCallback(
    async (title: string, category: CategoryKey, variants: ManualVariant[], links?: ProductLinks) => {
      try {
        await createMutation.mutateAsync({ title, category, variants, links });
        return true;
      } catch {
        return false;
      }
    },
    [createMutation],
  );

  const updateProduct = useCallback(
    async (id: string, title: string, category: CategoryKey, variants: ManualVariant[], links?: ProductLinks) => {
      try {
        await updateMutation.mutateAsync({ id, title, category, variants, links });
        return true;
      } catch {
        return false;
      }
    },
    [updateMutation],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation],
  );

  const deleteVariant = useCallback(
    async (variantId: string) => {
      try {
        await deleteVariantMutation.mutateAsync(variantId);
        return true;
      } catch {
        return false;
      }
    },
    [deleteVariantMutation],
  );

  /**
   * Applies a converter result to ONE variant: sets the Rial price and stores the
   * purchase info used for the calculation. Price history is recorded by the DB trigger.
   */
  const applyVariantPurchase = useCallback(
    async (
      variantId: string,
      finalPrice: number,
      info: {
        currency: CurrencyCode;
        purchasePrice: number;
        exchangeRate: number;
        shippingCost: number;
      },
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!variantId) return { ok: false, error: 'ویژگی انتخاب نشده است.' };
      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        return { ok: false, error: 'مبلغ نهایی معتبر نیست.' };
      }
      const { data, error } = await supabase
        .from('product_variants')
        .update({
          price: finalPrice,
          purchase_currency: info.currency,
          purchase_price: info.purchasePrice,
          purchase_exchange_rate: info.exchangeRate,
          shipping_cost_rial: info.shippingCost,
          purchase_calculated_at: new Date().toISOString(),
        } as never)
        .eq('id', variantId)
        .select('id');
      if (error) return { ok: false, error: error.message };
      if (!data || data.length === 0) return { ok: false, error: 'ویژگی موردنظر یافت نشد.' };
      await invalidate();
      return { ok: true };
    },
    [qc],
  );

  /** Bulk percentage across ALL variants of a category (server-side, not just visible rows). */
  const applyPercentageToCategory = useCallback(
    async (
      category: string,
      direction: 'increase' | 'decrease',
      percent: number,
      roundUnit = 1000,
    ): Promise<{ ok: boolean; updated?: number; error?: string }> => {
      const { data, error } = await supabase.rpc('apply_percentage_to_category' as never, {
        p_category: category,
        p_direction: direction,
        p_percent: percent,
        p_round_unit: roundUnit,
      } as never);
      if (error) return { ok: false, error: error.message };
      await invalidate();
      return { ok: true, updated: Number(data ?? 0) };
    },
    [qc],
  );

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteVariant,
    applyVariantPurchase,
    applyPercentageToCategory,
  };
}
