import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { Product, ProductData, SearchResult, FeaturePrice } from '@/types/product';
import { useExcelAutosave } from '@/hooks/useExcelAutosave';

interface ProductBlock {
  name: string;
  modelColumn: number;
  featureColumns: number[];
  fixedFeatureNames?: string[];
}

const PRODUCT_BLOCKS: ProductBlock[] = [
  { name: 'Android', modelColumn: 0, featureColumns: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: 'Nokia', modelColumn: 9, featureColumns: [10, 11, 12], fixedFeatureNames: ['ORG', 'AAA', 'BT'] },
  { name: 'iPhone', modelColumn: 14, featureColumns: [15, 16, 17, 18, 19, 20] },
];

export function useProductData() {
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fuse, setFuse] = useState<Fuse<Product> | null>(null);

  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const sheetNameRef = useRef<string>('');
  const fileNameRef = useRef<string>('');

  const { saveStatus, scheduleSave } = useExcelAutosave('lcd');

  const parseExcelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, { header: 1 });

      workbookRef.current = workbook;
      sheetNameRef.current = sheetName;
      fileNameRef.current = file.name;

      if (jsonData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }

      const headers = jsonData[0].map((h) => String(h || ''));
      const featureHeaders: string[][] = PRODUCT_BLOCKS.map((block) => {
        if (block.fixedFeatureNames) return block.fixedFeatureNames;
        return block.featureColumns.map((colIdx) => headers[colIdx] || '');
      });

      const products: Product[] = [];
      let productId = 0;

      for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row || row.length === 0) continue;

        PRODUCT_BLOCKS.forEach((block, blockIndex) => {
          const modelName = String(row[block.modelColumn] || '').trim();
          if (!modelName) return;

          const features: FeaturePrice[] = [];
          const blockFeatureHeaders = featureHeaders[blockIndex];

          block.featureColumns.forEach((featureCol, featureIdx) => {
            const val = row[featureCol];
            const price = typeof val === 'number' ? val : parseFloat(String(val || '')) || 0;
            const featureName = blockFeatureHeaders[featureIdx] || '';
            if (price > 0 && featureName) {
              features.push({
                featureName,
                price,
                sheetName,
                rowIndex: rowIdx,
                colIndex: featureCol,
              });
            }
          });

          if (features.length > 0) {
            products.push({
              id: `product-${productId++}`,
              model: modelName,
              features,
              rawRow: row,
              groupIndex: blockIndex,
              blockName: block.name,
            });
          }
        });
      }

      const fuseInstance = new Fuse(products, {
        keys: ['model'],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 1,
        shouldSort: true,
        findAllMatches: true,
        getFn: (obj, path) => {
          const value = Fuse.config.getFn(obj, path);
          if (typeof value === 'string') {
            return value.replace(/[-._]/g, ' ').trim().toLowerCase();
          }
          return value;
        },
      });

      setProductData({ headers, products, featureHeaders });
      setFuse(fuseInstance);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
      setIsLoading(false);
    }
  }, []);

  const searchProducts = useCallback(
    (query: string): SearchResult[] => {
      if (!fuse || !query.trim()) return [];
      const normalizedQuery = query.replace(/[-._]/g, ' ').trim().toLowerCase();
      const results = fuse.search(normalizedQuery);
      return results.slice(0, 20).map((result) => ({
        product: result.item,
        score: 1 - (result.score || 0),
      }));
    },
    [fuse],
  );

  const clearData = useCallback(() => {
    setProductData(null);
    setFuse(null);
    setError(null);
    workbookRef.current = null;
    sheetNameRef.current = '';
    fileNameRef.current = '';
  }, []);

  const updateCellPrice = useCallback(
    (rowIndex: number, colIndex: number, newPrice: number) => {
      const wb = workbookRef.current;
      const sheetName = sheetNameRef.current;
      if (!wb || !sheetName) return;
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      ws[cellRef] = { t: 'n', v: newPrice, w: String(newPrice) };

      // Expand !ref if needed
      const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
      if (rowIndex > range.e.r) range.e.r = rowIndex;
      if (colIndex > range.e.c) range.e.c = colIndex;
      ws['!ref'] = XLSX.utils.encode_range(range);

      setProductData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map((p) => ({
            ...p,
            features: p.features.map((f) =>
              f.rowIndex === rowIndex && f.colIndex === colIndex ? { ...f, price: newPrice } : f,
            ),
          })),
        };
      });

      scheduleSave(wb, fileNameRef.current);
    },
    [scheduleSave],
  );

  return {
    productData,
    isLoading,
    error,
    parseExcelFile,
    searchProducts,
    clearData,
    hasData: !!productData,
    updateCellPrice,
    saveStatus,
  };
}
