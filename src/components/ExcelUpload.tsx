import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExcelUploadProps {
  onFileSelect: (file: File) => void;
  onClear?: () => void;
  isLoading: boolean;
  hasData: boolean;
  fileName?: string;
}

export function ExcelUpload({ onFileSelect, onClear, isLoading, hasData, fileName }: ExcelUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        className="hidden"
      />
      
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={hasData ? "secondary" : "default"}
        className="touch-button gap-2"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            <span>{hasData ? 'Update File' : 'Upload Excel'}</span>
          </>
        )}
      </Button>

      {hasData && fileName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileSpreadsheet className="h-4 w-4 text-success" />
          <span className="truncate max-w-[150px]">{fileName}</span>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
              title="Clear Excel file"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
