import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'product-quantities';

interface QuantityStore {
  [modelKey: string]: {
    [featureKey: string]: number;
  };
}

export function useQuantityStore() {
  const [quantities, setQuantities] = useState<QuantityStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage whenever quantities change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch (err) {
      console.error('Failed to save quantities:', err);
    }
  }, [quantities]);

  const getQuantity = useCallback((model: string, featureName: string): number | undefined => {
    const key = model.toLowerCase().trim();
    const featureKey = featureName.toLowerCase().trim();
    return quantities[key]?.[featureKey];
  }, [quantities]);

  const setQuantity = useCallback((model: string, featureName: string, value: number | undefined) => {
    const key = model.toLowerCase().trim();
    const featureKey = featureName.toLowerCase().trim();
    
    setQuantities(prev => {
      const newState = { ...prev };
      
      if (value === undefined || value === 0) {
        // Remove the quantity entry if empty or zero
        if (newState[key]) {
          delete newState[key][featureKey];
          // Clean up empty model entries
          if (Object.keys(newState[key]).length === 0) {
            delete newState[key];
          }
        }
      } else {
        // Set the quantity
        if (!newState[key]) {
          newState[key] = {};
        }
        newState[key][featureKey] = value;
      }
      
      return newState;
    });
  }, []);

  const incrementQuantity = useCallback((model: string, featureName: string) => {
    const current = getQuantity(model, featureName);
    setQuantity(model, featureName, (current || 0) + 1);
  }, [getQuantity, setQuantity]);

  const decrementQuantity = useCallback((model: string, featureName: string) => {
    const current = getQuantity(model, featureName);
    if (current && current > 0) {
      setQuantity(model, featureName, current - 1);
    }
  }, [getQuantity, setQuantity]);

  return {
    getQuantity,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
  };
}
