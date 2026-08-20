import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getLastKnownUploadedAt,
  setLastKnownUploadedAt,
  isSaving,
} from '@/lib/excelSync';
import type { ExcelPageKey } from '@/lib/excelBackend';

interface ExcelFileState {
  file: File | null;
  fileName: string;
}

interface ExcelFileContextType {
  lcdFile: ExcelFileState;
  setLcdFile: (file: File) => void;
  clearLcdFile: () => void;

  miscFile: ExcelFileState;
  setMiscFile: (file: File) => void;
  clearMiscFile: () => void;

  goshiFile: ExcelFileState;
  setGoshiFile: (file: File) => void;
  clearGoshiFile: () => void;
}

const ExcelFileContext = createContext<ExcelFileContextType | null>(null);

const PAGE_KEYS: ExcelPageKey[] = ['lcd', 'misc', 'goshi'];
const POLL_INTERVAL_MS = 10_000;

export function ExcelFileProvider({ children }: { children: ReactNode }) {
  const [lcdFile, setLcdFileState] = useState<ExcelFileState>({ file: null, fileName: '' });
  const [miscFile, setMiscFileState] = useState<ExcelFileState>({ file: null, fileName: '' });
  const [goshiFile, setGoshiFileState] = useState<ExcelFileState>({ file: null, fileName: '' });

  const applyFile = useCallback((pageKey: ExcelPageKey, file: File, fileName: string) => {
    if (pageKey === 'lcd') setLcdFileState({ file, fileName });
    else if (pageKey === 'misc') setMiscFileState({ file, fileName });
    else if (pageKey === 'goshi') setGoshiFileState({ file, fileName });
  }, []);

  // Pull the active workbook for a given page from server storage.
  // If `force` is false, we only download when the server's uploaded_at is
  // newer than the timestamp we last applied locally.
  const syncFromServer = useCallback(
    async (pageKey: ExcelPageKey, opts: { force?: boolean } = {}) => {
      // Avoid clobbering an in-flight local save.
      if (!opts.force && isSaving(pageKey)) return;

      try {
        const { data: active, error } = await supabase
          .from('upload_logs')
          .select('file_name, storage_path, uploaded_at')
          .eq('page_key', pageKey)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !active) return;

        const lastKnown = getLastKnownUploadedAt(pageKey);
        if (!opts.force && lastKnown && active.uploaded_at && active.uploaded_at <= lastKnown) {
          return; // Nothing new on the server.
        }

        // Upload sets cacheControl: '0', so storage returns the freshest blob.
        const { data: blob, error: downloadError } = await supabase.storage
          .from('excel-files')
          .download(active.storage_path);

        if (downloadError || !blob) return;
        if (isSaving(pageKey)) return; // Recheck after async download.

        const downloadedFile = new File([blob], active.file_name, {
          type: blob.type || undefined,
        });

        setLastKnownUploadedAt(pageKey, active.uploaded_at ?? null);
        applyFile(pageKey, downloadedFile, active.file_name);
      } catch (e) {
        console.error(`Failed to sync ${pageKey} workbook:`, e);
      }
    },
    [applyFile],
  );

  // Initial load — force pull regardless of timestamps.
  useEffect(() => {
    PAGE_KEYS.forEach((k) => syncFromServer(k, { force: true }));
  }, [syncFromServer]);

  // Background polling + visibility/focus triggers so other devices see
  // updates without a manual refresh.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const checkAll = () => PAGE_KEYS.forEach((k) => syncFromServer(k));

    pollingRef.current = setInterval(checkAll, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAll();
    };
    window.addEventListener('focus', checkAll);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      window.removeEventListener('focus', checkAll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncFromServer]);

  const setLcdFile = useCallback((file: File) => {
    setLcdFileState({ file, fileName: file.name });
  }, []);
  const clearLcdFile = useCallback(() => {
    setLcdFileState({ file: null, fileName: '' });
  }, []);
  const setMiscFile = useCallback((file: File) => {
    setMiscFileState({ file, fileName: file.name });
  }, []);
  const clearMiscFile = useCallback(() => {
    setMiscFileState({ file: null, fileName: '' });
  }, []);
  const setGoshiFile = useCallback((file: File) => {
    setGoshiFileState({ file, fileName: file.name });
  }, []);
  const clearGoshiFile = useCallback(() => {
    setGoshiFileState({ file: null, fileName: '' });
  }, []);

  return (
    <ExcelFileContext.Provider
      value={{
        lcdFile,
        setLcdFile,
        clearLcdFile,
        miscFile,
        setMiscFile,
        clearMiscFile,
        goshiFile,
        setGoshiFile,
        clearGoshiFile,
      }}
    >
      {children}
    </ExcelFileContext.Provider>
  );
}

export function useExcelFile() {
  const context = useContext(ExcelFileContext);
  if (!context) {
    throw new Error('useExcelFile must be used within an ExcelFileProvider');
  }
  return context;
}
