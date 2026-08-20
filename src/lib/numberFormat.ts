/**
 * Shared numeric input helpers.
 * Display/input formatting only — stored values stay plain numbers.
 */

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Convert Persian/Arabic digits to latin ones. */
export function toLatinDigits(input: string): string {
  return String(input ?? '').replace(/[۰-۹٠-٩]/g, (d) => {
    const p = PERSIAN_DIGITS.indexOf(d);
    if (p > -1) return String(p);
    return String(ARABIC_DIGITS.indexOf(d));
  });
}

/** Strip everything that is not a digit / dot / leading minus. */
export function stripFormatting(input: string): string {
  const latin = toLatinDigits(input);
  const negative = latin.trim().startsWith('-');
  const cleaned = latin.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  return negative ? `-${normalized}` : normalized;
}

/** Parse a possibly comma-formatted string into a number (0 when invalid). */
export function parseFormattedNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  const n = Number(stripFormatting(String(input ?? '')));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Group the integer part in threes while typing.
 * Keeps a trailing dot / decimals intact so editing stays natural.
 */
export function formatWithCommas(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  const raw = stripFormatting(String(input));
  if (raw === '' || raw === '-') return raw;
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const [intPart, ...rest] = body.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const hasDot = body.includes('.');
  const decimals = rest.join('');
  const out = hasDot ? `${grouped}.${decimals}` : grouped;
  return negative ? `-${out}` : out;
}

/** Format a number for read-only display (no decimals). */
export function formatRial(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '';
  return Math.round(Number(n)).toLocaleString('en-US');
}
