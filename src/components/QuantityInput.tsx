import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuantityInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function QuantityInput({ 
  value, 
  onChange, 
  onIncrement, 
  onDecrement 
}: QuantityInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input
    if (inputValue === '') {
      onChange(undefined);
      return;
    }
    
    // Only allow numeric values
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent non-numeric keys except backspace, delete, arrows, tab
    if (
      !/[0-9]/.test(e.key) &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  return (
    <div 
      className="flex items-center gap-0.5 ml-2 flex-shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Decrement Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDecrement();
        }}
        className="w-5 h-6 flex items-center justify-center bg-background border border-destructive rounded-l text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Decrease quantity"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      
      {/* Quantity Input */}
      <input
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-8 h-6 text-center text-xs font-medium bg-background border-y border-destructive outline-none focus:ring-1 focus:ring-destructive text-foreground"
        placeholder=""
      />
      
      {/* Increment Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onIncrement();
        }}
        className="w-5 h-6 flex items-center justify-center bg-background border border-destructive rounded-r text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Increase quantity"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
