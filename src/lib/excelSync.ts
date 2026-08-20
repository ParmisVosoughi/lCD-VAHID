import type { ExcelPageKey } from './excelBackend';

// Shared, module-level sync state used to coordinate autosave with the
// background refresh loop so that:
//  - we don't clobber the user's in-flight edits with a stale server copy
//  - we don't trigger an unnecessary reload right after our own save
const lastKnownUploadedAt: Record<ExcelPageKey, string | null> = {
  lcd: null,
  misc: null,
  goshi: null,
};

const inflightSaves: Record<ExcelPageKey, number> = {
  lcd: 0,
  misc: 0,
  goshi: 0,
};

export function getLastKnownUploadedAt(pageKey: ExcelPageKey): string | null {
  return lastKnownUploadedAt[pageKey];
}

export function setLastKnownUploadedAt(pageKey: ExcelPageKey, ts: string | null) {
  lastKnownUploadedAt[pageKey] = ts;
}

export function markSaveStart(pageKey: ExcelPageKey) {
  inflightSaves[pageKey] = (inflightSaves[pageKey] || 0) + 1;
}

export function markSaveEnd(pageKey: ExcelPageKey) {
  inflightSaves[pageKey] = Math.max(0, (inflightSaves[pageKey] || 0) - 1);
}

export function isSaving(pageKey: ExcelPageKey): boolean {
  return (inflightSaves[pageKey] || 0) > 0;
}
