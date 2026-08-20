import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deleteExcelLog, uploadExcelFile } from '@/lib/excelBackend';

export interface UploadLog {
  id: string;
  file_name: string;
  storage_path: string;
  page_key: 'lcd' | 'misc' | 'goshi';
  note: string;
  is_active: boolean;
  uploaded_at: string;
}

export function useUploadLogs() {
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all logs
      const { data, error: fetchError } = await supabase
        .from('upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLogs((data as UploadLog[]) || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch upload logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActiveFile = useCallback(async (pageKey: 'lcd' | 'misc' | 'goshi'): Promise<UploadLog | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('upload_logs')
        .select('*')
        .eq('page_key', pageKey)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      return data as UploadLog | null;
    } catch (err) {
      console.error('Error fetching active file:', err);
      return null;
    }
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    pageKey: 'lcd' | 'misc' | 'goshi',
    note: string = ''
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadExcelFile({ file, pageKey, note });
      if (result.ok === false) {
        throw new Error(result.error);
      }

      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLogs]);
 
   const updateNote = useCallback(async (logId: string, note: string): Promise<boolean> => {
     try {
       const { error: updateError } = await supabase
         .from('upload_logs')
         .update({ note })
         .eq('id', logId);
 
       if (updateError) throw updateError;
       
       setLogs(prev => prev.map(log => 
         log.id === logId ? { ...log, note } : log
       ));
       return true;
     } catch (err) {
       console.error('Error updating note:', err);
       return false;
     }
   }, []);
 
   const setActiveFile = useCallback(async (logId: string, pageKey: 'lcd' | 'misc' | 'goshi'): Promise<boolean> => {
     try {
       // Deactivate all files for this page
       await supabase
         .from('upload_logs')
         .update({ is_active: false })
         .eq('page_key', pageKey);

       // Activate selected file
       const { error: updateError } = await supabase
         .from('upload_logs')
         .update({ is_active: true })
         .eq('id', logId);

       if (updateError) throw updateError;
       
       await fetchLogs();
       return true;
     } catch (err) {
       console.error('Error setting active file:', err);
       return false;
     }
   }, [fetchLogs]);
 
  const getDownloadUrl = useCallback((storagePath: string): string => {
    const { data } = supabase.storage
      .from('excel-files')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }, []);

  const deleteLog = useCallback(async (logId: string, _storagePath: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteExcelLog({ logId });
      if (result.ok === false) {
        throw new Error(result.error);
      }

      await fetchLogs();
      return true;
    } catch (err) {
      console.error('Error deleting log:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchLogs]);
  
    useEffect(() => {
      fetchLogs();
    }, [fetchLogs]);
  
    return {
      logs,
      isLoading,
      error,
      fetchLogs,
      getActiveFile,
      uploadFile,
      updateNote,
      setActiveFile,
      getDownloadUrl,
      deleteLog,
    };
  }