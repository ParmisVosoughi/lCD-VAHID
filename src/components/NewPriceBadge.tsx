import React from 'react';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/** True when the given timestamp is within the last 3 days. */
export function isRecentlyUpdated(ts: string | null | undefined): boolean {
  if (!ts) return false;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= THREE_DAYS_MS;
}

/** Temporary NEW badge shown for 3 days after a price change. */
export function NewPriceBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex items-center rounded-full bg-[hsl(var(--primary))] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-[hsl(var(--primary-foreground))]"
      title="قیمت به‌تازگی به‌روزرسانی شده است"
    >
      NEW
    </span>
  );
}
