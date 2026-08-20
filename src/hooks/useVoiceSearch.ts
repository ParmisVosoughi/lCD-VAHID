import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventMap {
  'audioend': Event;
  'audiostart': Event;
  'end': Event;
  'error': SpeechRecognitionErrorEventType;
  'nomatch': SpeechRecognitionEventType;
  'result': SpeechRecognitionEventType;
  'soundend': Event;
  'soundstart': Event;
  'speechend': Event;
  'speechstart': Event;
  'start': Event;
}

interface SpeechRecognitionEventType extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEventType extends Event {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEventType) => void) | null;
  onnomatch: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventType) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventType) => void) | null;
  onsoundend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceSearchResult {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

// Persian digit mapping
const persianDigits: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

// Spoken Persian numbers to digits
const spokenNumbers: Record<string, string> = {
  'صفر': '0', 'یک': '1', 'دو': '2', 'سه': '3', 'چهار': '4',
  'پنج': '5', 'شش': '6', 'هفت': '7', 'هشت': '8', 'نه': '9',
  'ده': '10', 'یازده': '11', 'دوازده': '12', 'سیزده': '13',
  'چهارده': '14', 'پانزده': '15', 'شانزده': '16', 'هفده': '17',
  'هجده': '18', 'نوزده': '19', 'بیست': '20', 'سی': '30',
  'چهل': '40', 'پنجاه': '50', 'شصت': '60', 'هفتاد': '70',
  'هشتاد': '80', 'نود': '90', 'صد': '100',
  // Additional spoken forms
  'اول': '1', 'دوم': '2', 'سوم': '3',
};

// Brand and model word aliases (Persian → English)
const wordAliases: Record<string, string> = {
  // Brands
  'سامسونگ': 'Samsung',
  'آیفون': 'iPhone',
  'اپل': 'Apple',
  'ردمی': 'Redmi',
  'شیائومی': 'Xiaomi',
  'شیاومی': 'Xiaomi',
  'گلکسی': 'Galaxy',
  'نوکیا': 'Nokia',
  'هواوی': 'Huawei',
  'هوآوی': 'Huawei',
  'اوپو': 'Oppo',
  'ویوو': 'Vivo',
  'ریلمی': 'Realme',
  'ال جی': 'LG',
  'الجی': 'LG',
  'سونی': 'Sony',
  'موتورولا': 'Motorola',
  'وان پلاس': 'OnePlus',
  'وان‌پلاس': 'OnePlus',
  'آنر': 'Honor',
  'هانر': 'Honor',
  'اینفینیکس': 'Infinix',
  'تکنو': 'Tecno',
  'پوکو': 'Poco',
  'زد تی ای': 'ZTE',
  'لنوو': 'Lenovo',
  'ایسوس': 'Asus',
  'راگ': 'ROG',
  'بلک شارک': 'Black Shark',
  'گوگل': 'Google',
  'پیکسل': 'Pixel',
  'نکسوس': 'Nexus',
  'اچ تی سی': 'HTC',
  
  // Model words
  'نوت': 'Note',
  'پرو': 'Pro',
  'پلاس': 'Plus',
  'مکس': 'Max',
  'اولترا': 'Ultra',
  'لایت': 'Lite',
  'مینی': 'Mini',
  'اس': 'S',
  'ای': 'A',
  'ام': 'M',
  'جی': 'G',
  'سی': 'C',
  'اف': 'F',
  'کا': 'K',
  'تی': 'T',
  'ایکس': 'X',
  'وای': 'Y',
  'زد': 'Z',
  'آر': 'R',
  'کیو': 'Q',
  'پی': 'P',
  'یو': 'U',
  'وی': 'V',
  'دبلیو': 'W',
  'اج': 'Edge',
  'فولد': 'Fold',
  'فلیپ': 'Flip',
  'زد فولد': 'Z Fold',
  'زد فلیپ': 'Z Flip',
  'نئو': 'Neo',
  'فن ادیشن': 'Fan Edition',
  'اف ای': 'FE',
  'اند': 'and',
  'جی تی': 'GT',
  'پاور': 'Power',
  'پلی': 'Play',
  'پرایم': 'Prime',
  'استاندارد': 'Standard',
  'تربو': 'Turbo',
  'رنو': 'Reno',
  'فایند': 'Find',
  'نوا': 'Nova',
  'میت': 'Mate',
  'پی اسمارت': 'P Smart',
  'هات': 'Hot',
  'اسمارت': 'Smart',
  'پاپ': 'Pop',
  'کامون': 'Camon',
  'اسپارک': 'Spark',
};

// Convert Persian digits to Latin
function convertPersianDigits(text: string): string {
  return text.replace(/[۰-۹]/g, (char) => persianDigits[char] || char);
}

// Convert spoken Persian numbers to digits
function convertSpokenNumbers(text: string): string {
  let result = text;
  
  // Handle compound numbers like "بیست و سه" → "23"
  const compoundPattern = /(بیست|سی|چهل|پنجاه|شصت|هفتاد|هشتاد|نود)\s*و\s*(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه)/g;
  result = result.replace(compoundPattern, (_, tens, ones) => {
    const tensValue = parseInt(spokenNumbers[tens] || '0');
    const onesValue = parseInt(spokenNumbers[ones] || '0');
    return String(tensValue + onesValue);
  });
  
  // Handle sequential digits like "صفر یک" → "01"
  const sequentialPattern = /(صفر|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه)\s+(صفر|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه)/g;
  result = result.replace(sequentialPattern, (_, first, second) => {
    return (spokenNumbers[first] || first) + (spokenNumbers[second] || second);
  });
  
  // Handle standalone spoken numbers (sorted by length to match longer ones first)
  const sortedNumbers = Object.entries(spokenNumbers).sort((a, b) => b[0].length - a[0].length);
  for (const [persian, digit] of sortedNumbers) {
    const regex = new RegExp(`\\b${persian}\\b`, 'g');
    result = result.replace(regex, digit);
  }
  
  return result;
}

// Apply word aliases (brands + model words)
function applyWordAliases(text: string): string {
  let result = text;
  // Sort by length descending to match longer phrases first (e.g., "زد فولد" before "زد")
  const sortedAliases = Object.entries(wordAliases).sort((a, b) => b[0].length - a[0].length);
  for (const [persian, english] of sortedAliases) {
    const regex = new RegExp(persian, 'gi');
    result = result.replace(regex, english);
  }
  return result;
}

// Normalize whitespace
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

// Full normalization pipeline
export function normalizeVoiceInput(text: string): string {
  let result = text;
  
  // Step 1: Whitespace normalization
  result = normalizeWhitespace(result);
  
  // Step 2: Persian digit conversion
  result = convertPersianDigits(result);
  
  // Step 3: Spoken number conversion
  result = convertSpokenNumbers(result);
  
  // Step 4: Brand aliases
  result = applyWordAliases(result);
  
  // Final whitespace cleanup
  result = normalizeWhitespace(result);
  
  return result;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export function useVoiceSearch(
  onResult: (rawText: string, normalizedText: string) => void
): UseVoiceSearchResult {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  
  // Keep callback ref updated
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  
  // Check browser support - include iOS Safari detection
  const isIOS = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  const SpeechRecognitionClass = typeof window !== 'undefined' 
    ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
    : null;
  
  const isSupported = !!SpeechRecognitionClass;

  // Initialize recognition instance
  useEffect(() => {
    if (!SpeechRecognitionClass) return;
    
    const recognition = new SpeechRecognitionClass();
    
    // iOS Safari specific settings
    recognition.continuous = false;
    recognition.interimResults = !isIOS; // iOS handles interim results poorly
    recognition.lang = 'fa-IR'; // Persian language
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Try again.');
          break;
        case 'not-allowed':
        case 'permission-denied':
          setError('Microphone access denied. Please enable in settings.');
          break;
        case 'network':
          setError('Network error. Check your connection.');
          break;
        case 'audio-capture':
          setError('No microphone found.');
          break;
        case 'aborted':
          // User cancelled, no error needed
          break;
        default:
          setError(`Voice error: ${event.error}`);
      }
    };
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];
      
      // For iOS, process any result; for others, wait for final
      if (result.isFinal || isIOS) {
        const rawText = result[0].transcript;
        const normalizedText = normalizeVoiceInput(rawText);
        onResultRef.current(rawText, normalizedText);
        
        // iOS may not auto-stop, so force stop after result
        if (isIOS) {
          try { recognition.stop(); } catch { /* ignore */ }
        }
      }
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, [SpeechRecognitionClass, isIOS]);
  
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    setError(null);
    try {
      recognitionRef.current.start();
    } catch (err) {
      // On iOS, may need to recreate recognition instance
      if (isIOS && SpeechRecognitionClass) {
        try {
          recognitionRef.current.abort();
          const newRecognition = new SpeechRecognitionClass();
          newRecognition.continuous = false;
          newRecognition.interimResults = false;
          newRecognition.lang = 'fa-IR';
          newRecognition.maxAlternatives = 1;
          
          newRecognition.onstart = recognitionRef.current.onstart;
          newRecognition.onend = recognitionRef.current.onend;
          newRecognition.onerror = recognitionRef.current.onerror;
          newRecognition.onresult = recognitionRef.current.onresult;
          
          recognitionRef.current = newRecognition;
          newRecognition.start();
        } catch {
          setError('Voice recognition failed. Please try again.');
        }
      } else {
        console.error('Failed to start recognition:', err);
      }
    }
  }, [isListening, isIOS, SpeechRecognitionClass]);
  
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch { /* ignore */ }
  }, []);
  
  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
}
