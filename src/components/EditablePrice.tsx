import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { formatWithCommas, stripFormatting, parseFormattedNumber } from '@/lib/numberFormat';


interface EditablePriceProps {
  value: number;
  className?: string;
  onSave: (newValue: number) => void;
  editable?: boolean;
}

export function EditablePrice({ value, className, onSave, editable = true }: EditablePriceProps) {
  const { isAdmin } = useAdminAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(String(value ?? ''));
      // Focus and select after mount
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      setIsEditing(false);
      return;
    }
    const num = parseFormattedNumber(trimmed);
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num);
    }
    setIsEditing(false);
  };


  const cancel = () => setIsEditing(false);

  if (isEditing) {
    return (
      <span
        className="inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={formatWithCommas(draft)}
          onChange={(e) => setDraft(stripFormatting(e.target.value))}

          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={commit}
          className="w-24 h-6 px-1 text-right text-xs font-mono font-semibold bg-background text-foreground border border-primary rounded outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            commit();
          }}
          className="text-primary hover:text-primary/80"
          aria-label="Save price"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            cancel();
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cancel edit"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className={className}>{value.toLocaleString()}</span>
      {isAdmin && editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="ml-1 p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label="Edit price"
          title="Edit price"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
