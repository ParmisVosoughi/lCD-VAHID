// Centralized category definitions.
// Stored as plain text so new categories can be added later without DB schema changes.
export const CATEGORIES = [
  { key: 'lcd', label: 'LCD' },
  { key: 'mobile', label: 'Mobile Phone' },
  { key: 'misc', label: 'Miscellaneous' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export const DEFAULT_CATEGORY: CategoryKey = 'lcd';

export const getCategoryLabel = (k: string): string =>
  CATEGORIES.find(c => c.key === k)?.label || k;

export const isValidCategory = (k: string): k is CategoryKey =>
  CATEGORIES.some(c => c.key === k);
