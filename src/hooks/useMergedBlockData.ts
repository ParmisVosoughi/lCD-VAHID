import { useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import {
  MiscProduct,
  MiscProductData,
  MiscFeaturePrice,
  MiscSearchResult,
} from '@/types/misc-product';
import { useManualProducts, ManualProduct } from '@/hooks/useManualProducts';
import { CategoryKey } from '@/lib/categories';

const MANUAL_BLOCK_INDEX = 99;

function toMisc(mp: ManualProduct): MiscProduct {
  const features: MiscFeaturePrice[] = mp.variants.map(v => ({
    featureName: v.name,
    price: v.price,
    // No sheet/row/col coords — marks as non-editable manual entry.
  }));
  return {
    id: `manual-${mp.id}`,
    model: mp.title,
    features,
    blockIndex: MANUAL_BLOCK_INDEX,
  };
}

export interface MergedBlockData {
  mergedData: MiscProductData | null;
  searchProducts: (q: string) => MiscSearchResult[];
  hasAnyData: boolean;
  manualColorMap: Record<string, string>;
  manualTextColorMap: Record<string, string>;
  manualVariantIdMap: Record<string, string>;
  manualProductIdMap: Record<string, string>;
  manualThumbMap: Record<string, string>;
}

/**
 * Merges block-style Excel data (Misc / Goshi pages) with Supabase manual
 * products belonging to `category`, returning a single MiscProductData and a
 * unified Fuse-powered search.
 */
export function useMergedBlockData(
  blockData: MiscProductData | null,
  blockSearch: (q: string) => MiscSearchResult[],
  category: CategoryKey,
): MergedBlockData {
  const { products: allManualProducts } = useManualProducts();

  const manualProducts = useMemo(
    () => allManualProducts.filter(mp => mp.category === category),
    [allManualProducts, category],
  );

  const { manualAsMisc, manualColorMap, manualTextColorMap, manualVariantIdMap, manualProductIdMap, manualThumbMap } =
    useMemo(() => {
      const colorMap: Record<string, string> = {};
      const textColorMap: Record<string, string> = {};
      const variantIdMap: Record<string, string> = {};
      const productIdMap: Record<string, string> = {};
      const thumbMap: Record<string, string> = {};
      manualProducts.forEach(mp => {
        productIdMap[`manual-${mp.id}`] = mp.id;
        if (mp.showThumbnail && mp.thumbnailUrl) {
          thumbMap[`manual-${mp.id}`] = mp.thumbnailUrl;
        }
        mp.variants.forEach(v => {
          colorMap[`manual-${mp.id}::${v.name}`] = v.color;
          textColorMap[`manual-${mp.id}::${v.name}`] = v.textColor;
          variantIdMap[`manual-${mp.id}::${v.name}`] = v.id;
        });
      });
      return {
        manualAsMisc: manualProducts.map(toMisc),
        manualColorMap: colorMap,
        manualTextColorMap: textColorMap,
        manualVariantIdMap: variantIdMap,
        manualProductIdMap: productIdMap,
        manualThumbMap: thumbMap,
      };
    }, [manualProducts]);

  const fuse = useMemo(
    () =>
      new Fuse(manualAsMisc, {
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
      }),
    [manualAsMisc],
  );

  const mergedData = useMemo<MiscProductData | null>(() => {
    if (!blockData && manualAsMisc.length === 0) return null;
    if (!blockData) return { products: manualAsMisc, blocks: [] };
    return { ...blockData, products: [...manualAsMisc, ...blockData.products] };
  }, [blockData, manualAsMisc]);

  const searchProducts = useCallback(
    (q: string): MiscSearchResult[] => {
      const excel = blockData ? blockSearch(q) : [];
      if (!q.trim()) return excel;
      const normalized = q.replace(/[-._]/g, ' ').trim().toLowerCase();
      const manual = fuse
        .search(normalized)
        .slice(0, 20)
        .map(r => ({ product: r.item, score: 1 - (r.score || 0) }));
      return [...manual, ...excel];
    },
    [blockData, blockSearch, fuse],
  );

  return {
    mergedData,
    searchProducts,
    hasAnyData: !!mergedData,
    manualColorMap,
    manualTextColorMap,
    manualVariantIdMap,
    manualProductIdMap,
    manualThumbMap,
  };
}
