import { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveExcelFile, ExcelPageKey } from '@/lib/excelBackend';
import { supabase } from '@/integrations/supabase/client';
import {
  markSaveStart,
  markSaveEnd,
  setLastKnownUploadedAt,
} from '@/lib/excelSync';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useExcelAutosave(pageKey: ExcelPageKey) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ workbook: XLSX.WorkBook; fileName: string } | null>(null);
  const inflightRef = useRef<boolean>(false);

  const runSave = useCallback(async () => {
    if (inflightRef.current) return;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    inflightRef.current = true;
    markSaveStart(pageKey);
    setSaveStatus('saving');

    try {
      const out = XLSX.write(pending.workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const file = new File([blob], pending.fileName || 'edited.xlsx', { type: blob.type });
      const result = await saveExcelFile({ file, pageKey });
      if (result.ok) {
        // Record the server's new uploaded_at so the background refresh
        // doesn't try to re-download our own write as if it were remote.
        try {
          const { data } = await supabase
            .from('upload_logs')
            .select('uploaded_at')
            .eq('page_key', pageKey)
            .eq('is_active', true)
            .maybeSingle();
          if (data?.uploaded_at) setLastKnownUploadedAt(pageKey, data.uploaded_at);
        } catch {
          /* non-fatal */
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500);
      } else {
        console.error('Autosave failed:', (result as { ok: false; error: string }).error);
        setSaveStatus('error');
      }
    } catch (e) {
      console.error('Autosave exception:', e);
      setSaveStatus('error');
    } finally {
      inflightRef.current = false;
      markSaveEnd(pageKey);
      if (pendingRef.current) runSave();
    }
  }, [pageKey]);

  const scheduleSave = useCallback(
    (workbook: XLSX.WorkBook, fileName: string) => {
      pendingRef.current = { workbook, fileName };
      setSaveStatus('saving');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runSave, 500);
    },
    [runSave],
  );

  return { saveStatus, scheduleSave };
}
