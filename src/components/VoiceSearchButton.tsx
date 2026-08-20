import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceSearchButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceSearchButton({
  isListening,
  isSupported,
  onStart,
  onStop,
  disabled = false,
}: VoiceSearchButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="default"
      size="icon"
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      className={cn(
        "h-12 w-12 shrink-0 bg-[hsl(270,60%,50%)] hover:bg-[hsl(270,60%,40%)] text-white transition-all",
        isListening && "animate-pulse bg-[hsl(270,60%,60%)] ring-2 ring-[hsl(270,60%,50%)] ring-offset-2"
      )}
      aria-label={isListening ? "Stop voice search" : "Start voice search"}
    >
      {isListening ? (
        <MicOff className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
