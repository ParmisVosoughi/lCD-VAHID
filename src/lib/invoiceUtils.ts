import * as jalaali from 'jalaali-js';

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, d => FA_DIGITS[Number(d)]);
}

export function formatMoney(n: number): string {
  const rounded = Math.round(Number(n) || 0);
  const withSep = rounded.toLocaleString('en-US');
  return toFaDigits(withSep);
}

/** Get current date/time in Asia/Tehran. */
export function nowInTehran(): Date {
  // Use Intl to get the parts, then reconstruct a Date representing those local Tehran values.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  // Store Tehran wall-clock values inside a UTC Date for convenience.
  return new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour === '24' ? '00' : parts.hour), Number(parts.minute), Number(parts.second)
  ));
}

export function gregorianISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function toJalali(d: Date): string {
  const j = jalaali.toJalaali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  const m = String(j.jm).padStart(2, '0');
  const day = String(j.jd).padStart(2, '0');
  return `${j.jy}/${m}/${day}`;
}

/** Generate a random invoice number like INV-YYYYMMDD-XXXX */
export function generateInvoiceNumber(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${day}-${rand}`;
}
