import React, { useState } from 'react';
import { Package, Pencil, Trash2 } from 'lucide-react';
import { Product, ProductData, SearchResult } from '@/types/product';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuantityInput } from '@/components/QuantityInput';
import { EditablePrice } from '@/components/EditablePrice';
import { useQuantityStore } from '@/hooks/useQuantityStore';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useManualEdit } from '@/contexts/ManualEditContext';
import { useManualProducts } from '@/hooks/useManualProducts';
import { toast } from 'sonner';
import { ProductThumbnail } from '@/components/ProductThumbnail';
import { useCurrencyRates } from '@/hooks/useCurrencyRates';
import { PriceComparison, computeVariantComparison, VariantComparison } from '@/components/PriceComparison';
import { NewPriceBadge, isRecentlyUpdated } from '@/components/NewPriceBadge';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProductListProps {
  productData: ProductData | null;
  searchResults: SearchResult[];
  isSearchActive: boolean;
  onProductSelect?: (product: Product) => void;
  onUpdatePrice?: (rowIndex: number, colIndex: number, newPrice: number) => void;
  manualColorMap?: Record<string, string>;
  manualTextColorMap?: Record<string, string>;
  manualVariantIdMap?: Record<string, string>;
  manualProductIdMap?: Record<string, string>;
  manualThumbMap?: Record<string, string>;
}

export function ProductList({
  productData,
  searchResults,
  isSearchActive,
  onProductSelect,
  onUpdatePrice,
  manualColorMap,
  manualTextColorMap,
  manualVariantIdMap,
  manualProductIdMap,
  manualThumbMap,
}: ProductListProps) {
  const { getQuantity, setQuantity, incrementQuantity, decrementQuantity } = useQuantityStore();
  const { isAdmin } = useAdminAuth();
  const { openEdit } = useManualEdit();
  const { deleteVariant, products: manualProducts } = useManualProducts();
  const { getCurrentRate } = useCurrencyRates();

  /** variantId -> currency-based comparison (only for variants that have saved purchase data). */
  const comparisonByVariant = React.useMemo(() => {
    const map: Record<string, VariantComparison> = {};
    manualProducts.forEach(p =>
      p.variants.forEach(v => {
        const c = computeVariantComparison(v, getCurrentRate(v.purchaseCurrency ?? null));
        if (c) map[v.id] = c;
      }),
    );
    return map;
  }, [manualProducts, getCurrentRate]);

  /** variantId -> last price update timestamp (drives the 3-day NEW badge). */
  const priceUpdatedByVariant = React.useMemo(() => {
    const map: Record<string, string | null> = {};
    manualProducts.forEach(p =>
      p.variants.forEach(v => { map[v.id] = v.priceUpdatedAt ?? null; }),
    );
    return map;
  }, [manualProducts]);

  const [pendingDelete, setPendingDelete] = useState<{ variantId: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteVariant = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await deleteVariant(pendingDelete.variantId);
    setDeleting(false);
    if (ok) toast.success('مدل با موفقیت حذف شد.');
    else toast.error('خطا در حذف مدل.');
    setPendingDelete(null);
  };

  if (!productData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Products Loaded</p>
          <p className="text-sm mt-1">Upload an Excel file to get started</p>
        </div>
      </div>
    );
  }

  const displayProducts = isSearchActive
    ? searchResults.map(r => r.product)
    : productData.products;

  if (isSearchActive && searchResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No Results Found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      </div>
    );
  }

  const getMatchScore = (product: Product): number => {
    const result = searchResults.find(r => r.product.id === product.id);
    return result ? result.score : 0;
  };

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {displayProducts.map((product) => {
            const isHighlighted = isSearchActive && searchResults.some(r => r.product.id === product.id);
            const matchScore = getMatchScore(product);
            const manualProductId = manualProductIdMap?.[product.id];
            const isManualProduct = !!manualProductId;

            return (
              <div
                key={product.id}
                className={`product-row cursor-pointer ${isHighlighted ? 'highlighted' : ''}`}
                onClick={() => onProductSelect?.(product)}
              >
                {/* Model Name Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="key-badge text-sm font-bold">
                      {product.model}
                    </span>
                    {isAdmin && isManualProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(manualProductId!);
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                        title="Edit product"
                        aria-label="Edit product"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {isHighlighted && (
                    <span className="text-xs font-medium text-primary">
                      {Math.round(matchScore * 100)}% match
                    </span>
                  )}
                </div>

                {/* Feature-Price Pairs */}
                <div className="flex items-start gap-2" dir="rtl">
                  <ProductThumbnail src={manualThumbMap?.[product.id]} />
                  <div className="flex-1 min-w-0 space-y-2" dir="ltr">

                  {product.features.map((feature, idx) => {
                    const featureNameLower = feature.featureName.toLowerCase();
                    const isBT = featureNameLower === 'bt';
                    const isFrame = featureNameLower === 'frame';
                    const manualKey = `${product.id}::${feature.featureName}`;
                    const manualColor = manualColorMap?.[manualKey];
                    const manualTextColor = manualTextColorMap?.[manualKey];
                    const variantId = manualVariantIdMap?.[manualKey];
                    const isManual = !!manualColor;

                    const getRowStyles = () => {
                      if (isManual) return '';
                      if (isBT) return 'bg-[hsl(var(--bt-bg))] text-[hsl(var(--bt-text))]';
                      if (isFrame) return 'bg-[hsl(var(--frame-bg))] text-[hsl(var(--frame-text))]';
                      return 'bg-muted/30';
                    };

                    const getTextStyles = () => {
                      if (isManual) return '';
                      if (isBT) return 'text-[hsl(var(--bt-text))]';
                      if (isFrame) return 'text-[hsl(var(--frame-text))]';
                      return 'text-muted-foreground';
                    };

                    const getPriceStyles = () => {
                      if (isManual) return 'font-mono font-semibold';
                      if (isBT) return 'font-mono font-semibold text-[hsl(var(--bt-text))]';
                      if (isFrame) return 'font-mono font-semibold text-[hsl(var(--frame-text))]';
                      return 'font-mono font-semibold text-primary';
                    };

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between text-sm rounded-md px-3 py-1.5 ${getRowStyles()}`}
                        style={isManual ? { backgroundColor: manualColor, color: manualTextColor || '#fff' } : undefined}
                      >
                        <span
                          className={`font-medium ${getTextStyles()}`}
                          style={isManual ? { color: manualTextColor || '#fff' } : undefined}
                        >
                          {feature.featureName}:
                        </span>
                        <div className="flex items-center gap-1">
                          {variantId && (
                            <NewPriceBadge show={isRecentlyUpdated(priceUpdatedByVariant[variantId])} />
                          )}
                          <div className="flex flex-col items-end min-w-0">

                            <EditablePrice
                              value={feature.price}
                              className={getPriceStyles()}
                              editable={!isManual}
                              onSave={(newPrice) => {
                                if (
                                  feature.rowIndex !== undefined &&
                                  feature.colIndex !== undefined &&
                                  onUpdatePrice
                                ) {
                                  onUpdatePrice(feature.rowIndex, feature.colIndex, newPrice);
                                }
                              }}
                            />
                            {variantId && <PriceComparison comparison={comparisonByVariant[variantId] ?? null} />}
                          </div>
                          <QuantityInput
                            value={getQuantity(product.model, feature.featureName)}
                            onChange={(val) => setQuantity(product.model, feature.featureName, val)}
                            onIncrement={() => incrementQuantity(product.model, feature.featureName)}
                            onDecrement={() => decrementQuantity(product.model, feature.featureName)}
                          />
                          {isAdmin && isManual && variantId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDelete({
                                  variantId,
                                  label: `${product.model} — ${feature.featureName}`,
                                });
                              }}
                              className="ml-1 p-1 rounded hover:bg-black/10 shrink-0"
                              style={{ color: manualTextColor || '#fff' }}
                              title="حذف مدل"
                              aria-label="حذف مدل"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && !deleting && setPendingDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف مدل</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              آیا مطمئن هستید که می‌خواهید این مدل را حذف کنید؟
              {pendingDelete && (
                <span className="block mt-2 text-xs opacity-70">{pendingDelete.label}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse sm:justify-start gap-2">
            <AlertDialogAction
              onClick={confirmDeleteVariant}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              بله، حذف شود
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleting}>خیر</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
