export type CurrencyCode = 'USD' | 'AED' | 'CNY' | 'EUR';

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: 'USD', label: 'دلار' },
  { code: 'AED', label: 'درهم' },
  { code: 'CNY', label: 'یوان' },
  { code: 'EUR', label: 'یورو' },
];

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === 'string' && CURRENCIES.some(c => c.code === v);

export const getCurrencyLabel = (code: string | null | undefined): string =>
  CURRENCIES.find(c => c.code === code)?.label ?? String(code ?? '');

/** Ceiling rounding to a Rial unit (never lower than the calculated value). */
export function ceilToUnit(value: number, unit = 1000): number {
  // unit 0 (or invalid) means «no rounding».
  const u = Math.max(1, Math.floor(unit) || 1);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / u) * u;
}

export const ROUNDING_UNITS = [1000, 5000, 10000, 100, 1, 0];
