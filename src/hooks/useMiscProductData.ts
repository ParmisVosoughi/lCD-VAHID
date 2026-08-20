import { useBlockProductData } from './useBlockProductData';

export function useMiscProductData() {
  return useBlockProductData('misc', 'misc-product');
}
