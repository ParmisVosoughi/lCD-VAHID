import React, { useMemo } from 'react';
import { ManualVariant } from '@/hooks/useManualProducts';

export interface VariantComparison {
  /** Calculated equivalent current value in Rial. */
  value: number;
  direction: 'up' | 'down';
}

/**
 * Computes the currency-based comparison for a variant using its OWN saved
 * purchase currency + the current daily rate of that currency.
 * Returns null when the variant lacks reliable data (never invents a value).
 */
export function computeVariantComparison(
  v: Pick<ManualVariant, 'price' | 'purchaseCurrency' | 'purchasePrice' | 'purchaseExchangeRate' | 'shippingCostRial'>,
  currentRate: number | null,
): VariantComparison | null {
  if (!v.purchaseCurrency) return null;
  if (!currentRate || currentRate <= 0) return null;
  const purchase = Number(v.purchasePrice ?? 0);
  const oldRate = Number(v.purchaseExchangeRate ?? 0);
  if (!(purchase > 0) || !(oldRate > 0)) return null;
  const shipping = Number(v.shippingCostRial ?? 0);
  const value = Math.round(purchase * currentRate + shipping);
  if (!Number.isFinite(value) || value <= 0) return null;
  const current = Number(v.price ?? 0);
  if (value === current) return null;
  return { value, direction: value > current ? 'up' : 'down' };
}

/** Compact, secondary comparison badge shown next to / below the real price. */
export function PriceComparison({ comparison }: { comparison: VariantComparison | null }) {
  const label = useMemo(
    () => (comparison ? comparison.value.toLocaleString('en-US') : ''),
    [comparison],
  );
  if (!comparison) return null;
  const up = comparison.direction === 'up';
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-mono leading-none whitespace-nowrap max-w-full overflow-hidden ${
        up
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-700 dark:text-red-400'
      }`}
      title={up ? 'ارزش محاسبه‌شده بالاتر از قیمت ذخیره‌شده' : 'ارزش محاسبه‌شده پایین‌تر از قیمت ذخیره‌شده'}
    >
      {label} {up ? '↑' : '↓'}
    </span>
  );
}
