import React from 'react';
import { Package } from 'lucide-react';
import { MiscProduct, MiscProductData, MiscSearchResult } from '@/types/misc-product';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getColorStyles } from '@/utils/colorUtils';
import { QuantityInput } from '@/components/QuantityInput';
import { EditablePrice } from '@/components/EditablePrice';
import { useQuantityStore } from '@/hooks/useQuantityStore';
import { ProductThumbnail } from '@/components/ProductThumbnail';
import { useManualProducts } from '@/hooks/useManualProducts';
import { NewPriceBadge, isRecentlyUpdated } from '@/components/NewPriceBadge';

interface MiscProductListProps {
  productData: MiscProductData | null;
  searchResults: MiscSearchResult[];
  isSearchActive: boolean;
  onProductSelect?: (product: MiscProduct) => void;
  onUpdatePrice?: (rowIndex: number, colIndex: number, newPrice: number) => void;
  manualColorMap?: Record<string, string>;
  manualTextColorMap?: Record<string, string>;
  manualThumbMap?: Record<string, string>;
  manualVariantIdMap?: Record<string, string>;
}

export function MiscProductList({ 
  productData, 
  searchResults, 
  isSearchActive,
  onProductSelect,
  onUpdatePrice,
  manualColorMap,
  manualTextColorMap,
  manualThumbMap,
  manualVariantIdMap,
}: MiscProductListProps) {
  const { getQuantity, setQuantity, incrementQuantity, decrementQuantity } = useQuantityStore();
  const { products: manualProducts } = useManualProducts();

  /** variantId -> last price update timestamp (drives the 3-day NEW badge). */
  const priceUpdatedByVariant = React.useMemo(() => {
    const map: Record<string, string | null> = {};
    manualProducts.forEach(p =>
      p.variants.forEach(v => { map[v.id] = v.priceUpdatedAt ?? null; }),
    );
    return map;
  }, [manualProducts]);

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

  const getMatchScore = (product: MiscProduct): number => {
    const result = searchResults.find(r => r.product.id === product.id);
    return result ? result.score : 0;
  };

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y divide-border">
        {displayProducts.map((product) => {
          const isHighlighted = isSearchActive && searchResults.some(r => r.product.id === product.id);
          const matchScore = getMatchScore(product);

          return (
            <div
              key={product.id}
              className={`product-row cursor-pointer ${isHighlighted ? 'highlighted' : ''}`}
              onClick={() => onProductSelect?.(product)}
            >
              {/* Model Name Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="key-badge text-sm font-bold">
                  {product.model}
                </span>
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
                  const featureNameLower = feature.featureName.toLowerCase().trim();
                  const isBT = featureNameLower === 'bt';
                  const isFrame = featureNameLower === 'frame';
                  const dynamicColor = getColorStyles(feature.featureName);
                  // Manual products (from Supabase) carry their own picked colors
                  const manualKey = `${product.id}::${feature.featureName}`;
                  const manualBg = manualColorMap?.[manualKey];
                  const manualText = manualTextColorMap?.[manualKey];
                  const hasManualColor = !!manualBg;
                  const manualVariantId = manualVariantIdMap?.[manualKey];


                  const getInlineStyles = (): React.CSSProperties | undefined => {
                    if (hasManualColor) {
                      return { backgroundColor: manualBg, color: manualText };
                    }
                    if (isBT || isFrame || !dynamicColor) return undefined;
                    return {
                      backgroundColor: dynamicColor.backgroundColor,
                      color: dynamicColor.textColor,
                      border: dynamicColor.border,
                    };
                  };

                  const getRowClasses = () => {
                    if (hasManualColor) return '';
                    if (isBT) return 'bg-[hsl(var(--bt-bg))] text-[hsl(var(--bt-text))]';
                    if (isFrame) return 'bg-[hsl(var(--frame-bg))] text-[hsl(var(--frame-text))]';
                    if (dynamicColor) return '';
                    return 'bg-muted/30';
                  };
                  const getTextClasses = () => {
                    if (hasManualColor) return '';
                    if (isBT) return 'text-[hsl(var(--bt-text))]';
                    if (isFrame) return 'text-[hsl(var(--frame-text))]';
                    if (dynamicColor) return '';
                    return 'text-muted-foreground';
                  };
                  const getPriceClasses = () => {
                    if (hasManualColor) return '';
                    if (isBT) return 'text-[hsl(var(--bt-text))]';
                    if (isFrame) return 'text-[hsl(var(--frame-text))]';
                    if (dynamicColor) return '';
                    return 'text-primary';
                  };

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-sm rounded-md px-3 py-1.5 ${getRowClasses()}`}
                      style={getInlineStyles()}
                    >
                      <span className={`font-medium ${getTextClasses()}`}>
                        {feature.featureName}:
                      </span>
                      <div className="flex items-center gap-1">
                        {manualVariantId && (
                          <NewPriceBadge show={isRecentlyUpdated(priceUpdatedByVariant[manualVariantId])} />
                        )}

                        <EditablePrice
                          value={feature.price}
                          className={`font-mono font-semibold ${getPriceClasses()}`}
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
                        <QuantityInput
                          value={getQuantity(product.model, feature.featureName)}
                          onChange={(val) => setQuantity(product.model, feature.featureName, val)}
                          onIncrement={() => incrementQuantity(product.model, feature.featureName)}
                          onDecrement={() => decrementQuantity(product.model, feature.featureName)}
                        />
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
  );
}
