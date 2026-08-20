import React, { useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import { useVoiceSearch, normalizeVoiceInput } from '@/hooks/useVoiceSearch';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onDualSearch?: (rawText: string, normalizedText: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchBar({ 
  value, 
  onChange, 
  onSearch,
  onDualSearch,
  placeholder = "Search products...",
  disabled = false 
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleVoiceResult = useCallback((rawText: string, normalizedText: string) => {
    // Always set the normalized text in the input for user visibility
    onChange(normalizedText);
    
    // If dual search handler exists, use it for better matching
    if (onDualSearch) {
      onDualSearch(rawText, normalizedText);
    } else {
      // Fallback: trigger search with normalized text
      // Small delay to ensure state update
      setTimeout(() => onSearch(), 50);
    }
  }, [onChange, onDualSearch, onSearch]);

  const { isListening, isSupported, startListening, stopListening, error } = useVoiceSearch(handleVoiceResult);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 h-12 text-base"
          />
        </div>
        <VoiceSearchButton
          isListening={isListening}
          isSupported={isSupported}
          onStart={startListening}
          onStop={stopListening}
          disabled={disabled}
        />
      </div>
      {isListening && (
        <p className="text-sm text-[hsl(270,60%,50%)] animate-pulse">🎤 Listening...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
