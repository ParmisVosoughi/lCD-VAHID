import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { Product, ProductData, SearchResult, FeaturePrice } from '@/types/product';
import { useManualProducts, ManualProduct } from '@/hooks/useManualProducts';

const MANUAL_BLOCK_INDEX = 99;
const MANUAL_BLOCK_NAME = 'Manual';

function manualToProduct(mp: ManualProduct): Product {
  const features: FeaturePrice[] = mp.variants.map(v => ({
    featureName: v.name,
    price: v.price,
    // No excel cell coords — used as marker that it's manual (non-editable inline).
  }));
  return {
    id: `manual-${mp.id}`,
    model: mp.title,
    features,
    rawRow: [],
    groupIndex: MANUAL_BLOCK_INDEX,
    blockName: MANUAL_BLOCK_NAME,
  };
}

export interface MergedProductData extends ProductData {
  manualColorMap: Record<string, string>;
  manualTextColorMap: Record<string, string>;
  manualVariantIdMap: Record<string, string>;
  manualProductIdMap: Record<string, string>;
  manualThumbMap: Record<string, string>;
}

/**
 * Merges Excel-derived ProductData with Supabase-backed Manual products
 * into a single unified ProductData + Fuse search.
 */
export function useMergedProductData(excelData: ProductData | null, categoryFilter?: string) {
  const { products: allManualProducts } = useManualProducts();

  const merged = useMemo<MergedProductData | null>(() => {
    const manualProducts = categoryFilter
      ? allManualProducts.filter(mp => mp.category === categoryFilter)
      : allManualProducts;
    const manualAsProducts = manualProducts.map(manualToProduct);
    const manualColorMap: Record<string, string> = {};
    const manualTextColorMap: Record<string, string> = {};
    const manualVariantIdMap: Record<string, string> = {};
    const manualProductIdMap: Record<string, string> = {};
    const manualThumbMap: Record<string, string> = {};
    manualProducts.forEach(mp => {
      manualProductIdMap[`manual-${mp.id}`] = mp.id;
      if (mp.showThumbnail && mp.thumbnailUrl) {
        manualThumbMap[`manual-${mp.id}`] = mp.thumbnailUrl;
      }
      mp.variants.forEach(v => {
        manualColorMap[`manual-${mp.id}::${v.name}`] = v.color;
        manualTextColorMap[`manual-${mp.id}::${v.name}`] = v.textColor;
        manualVariantIdMap[`manual-${mp.id}::${v.name}`] = v.id;
      });
    });

    if (!excelData && manualAsProducts.length === 0) return null;

    if (!excelData) {
      return {
        headers: [],
        products: manualAsProducts,
        featureHeaders: [],
        manualColorMap,
        manualTextColorMap,
        manualVariantIdMap,
        manualProductIdMap,
        manualThumbMap,
      };
    }

    return {
      ...excelData,
      products: [...manualAsProducts, ...excelData.products],
      manualColorMap,
      manualTextColorMap,
      manualVariantIdMap,
      manualProductIdMap,
      manualThumbMap,
    };
  }, [excelData, allManualProducts, categoryFilter]);

  const fuse = useMemo(() => {
    if (!merged) return null;
    return new Fuse(merged.products, {
      keys: ['model'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 1,
      shouldSort: true,
      findAllMatches: true,
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          return value.replace(/[-._]/g, ' ').trim().toLowerCase();
        }
        return value;
      },
    });
  }, [merged]);

  const searchProducts = useMemo(
    () =>
      (query: string): SearchResult[] => {
        if (!fuse || !query.trim()) return [];
        const normalized = query.replace(/[-._]/g, ' ').trim().toLowerCase();
        return fuse
          .search(normalized)
          .slice(0, 20)
          .map(r => ({ product: r.item, score: 1 - (r.score || 0) }));
      },
    [fuse],
  );

  return {
    mergedData: merged,
    searchProducts,
    hasAnyData: !!merged,
  };
}
