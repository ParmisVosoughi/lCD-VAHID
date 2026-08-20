import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { SaveStatus } from '@/hooks/useExcelAutosave';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="w-3 h-3" />
      Save failed
    </span>
  );
}
