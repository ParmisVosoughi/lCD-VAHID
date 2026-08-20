import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import {
  MiscProduct,
  MiscProductData,
  MiscSearchResult,
  MiscFeaturePrice,
  DetectedBlock,
  ParsingReport,
} from '@/types/misc-product';
import { useExcelAutosave } from '@/hooks/useExcelAutosave';
import { ExcelPageKey } from '@/lib/excelBackend';

function columnIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function isNumericValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return !isNaN(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return false;
    const num = parseFloat(trimmed.replace(/,/g, ''));
    return !isNaN(num) && isFinite(num);
  }
  return false;
}

function isTextLike(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const str = String(val).trim();
  if (str === '') return false;
  return /[a-zA-Z\u0600-\u06FF]/.test(str) || /^[a-zA-Z0-9\s\-._]+$/.test(str);
}

function parseNumericValue(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.trim().replace(/,/g, '')) || 0;
  return 0;
}

interface ColumnAnalysis {
  index: number;
  headerValue: string;
  isModelColumn: boolean;
  isFeatureColumn: boolean;
  textCount: number;
  numericCount: number;
  emptyCount: number;
  uniqueValues: Set<string>;
  reason?: string;
}

export function useBlockProductData(pageKey: ExcelPageKey, idPrefix: string) {
  const [productData, setProductData] = useState<MiscProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fuse, setFuse] = useState<Fuse<MiscProduct> | null>(null);
  const [parsingReports, setParsingReports] = useState<ParsingReport[]>([]);

  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const sheetNameRef = useRef<string>('');
  const fileNameRef = useRef<string>('');

  const { saveStatus, scheduleSave } = useExcelAutosave(pageKey);

  const parseExcelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParsingReports([]);

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

      const reports: ParsingReport[] = [];
      const headers = jsonData[0] || [];
      const dataRows = jsonData.slice(1);
      const maxCols = Math.max(headers.length, ...dataRows.map((r) => (r ? r.length : 0)));

      const columnAnalyses: ColumnAnalysis[] = [];

      for (let colIdx = 0; colIdx < maxCols; colIdx++) {
        const headerValue = String(headers[colIdx] || '').trim();
        const analysis: ColumnAnalysis = {
          index: colIdx,
          headerValue,
          isModelColumn: false,
          isFeatureColumn: false,
          textCount: 0,
          numericCount: 0,
          emptyCount: 0,
          uniqueValues: new Set(),
        };

        for (const row of dataRows) {
          const cellValue = row ? row[colIdx] : undefined;
          if (cellValue === null || cellValue === undefined || cellValue === '') {
            analysis.emptyCount++;
          } else if (isNumericValue(cellValue)) {
            analysis.numericCount++;
          } else if (isTextLike(cellValue)) {
            analysis.textCount++;
            analysis.uniqueValues.add(String(cellValue).trim().toLowerCase());
          }
        }

        const totalNonEmpty = analysis.textCount + analysis.numericCount;
        if (totalNonEmpty === 0) continue;

        const numericRatio = analysis.numericCount / totalNonEmpty;
        const textRatio = analysis.textCount / totalNonEmpty;
        const uniquenessRatio = analysis.uniqueValues.size / Math.max(analysis.textCount, 1);

        if (headerValue && numericRatio >= 0.6) {
          analysis.isFeatureColumn = true;
        } else if (textRatio >= 0.5 && uniquenessRatio >= 0.3) {
          analysis.isModelColumn = true;
        } else if (totalNonEmpty > 0) {
          let reason = 'Unable to classify as Model or Feature';
          if (numericRatio > 0.3 && numericRatio < 0.6) {
            reason = 'Mixed numeric/text content, unclear classification';
          } else if (textRatio >= 0.5 && uniquenessRatio < 0.3) {
            reason = 'Text column but values are not unique enough for Model';
          } else if (!headerValue && numericRatio >= 0.6) {
            reason = 'Numeric column without header name';
          }
          analysis.reason = reason;
          reports.push({
            columnIndex: colIdx,
            columnLetter: columnIndexToLetter(colIdx),
            reason,
            timestamp: new Date(),
          });
        }

        columnAnalyses.push(analysis);
      }

      const modelColumns = columnAnalyses
        .filter((a) => a.isModelColumn)
        .sort((a, b) => a.index - b.index);

      const blocks: DetectedBlock[] = [];
      for (let i = 0; i < modelColumns.length; i++) {
        const modelCol = modelColumns[i];
        const nextModelColIndex = i < modelColumns.length - 1 ? modelColumns[i + 1].index : maxCols;
        const featureCols = columnAnalyses
          .filter(
            (a) => a.isFeatureColumn && a.index > modelCol.index && a.index < nextModelColIndex,
          )
          .map((a) => a.index);
        if (featureCols.length > 0) {
          blocks.push({
            modelColumnIndex: modelCol.index,
            featureColumnIndices: featureCols,
            startRow: 1,
          });
        }
      }

      const products: MiscProduct[] = [];
      let productId = 0;

      for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
        const block = blocks[blockIdx];
        for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
          const row = dataRows[rowIdx];
          if (!row) continue;

          const modelValue = row[block.modelColumnIndex];
          const modelName = String(modelValue || '').trim();
          if (!modelName || isNumericValue(modelValue)) continue;

          const features: MiscFeaturePrice[] = [];
          for (const featureColIdx of block.featureColumnIndices) {
            const featureHeader = columnAnalyses.find((a) => a.index === featureColIdx);
            const featureName = featureHeader?.headerValue || `Feature ${featureColIdx}`;
            const cellValue = row[featureColIdx];
            if (isNumericValue(cellValue)) {
              const price = parseNumericValue(cellValue);
              if (price > 0) {
                features.push({
                  featureName,
                  price,
                  sheetName,
                  // dataRows is jsonData.slice(1), so actual sheet row = rowIdx + 1
                  rowIndex: rowIdx + 1,
                  colIndex: featureColIdx,
                });
              }
            }
          }

          if (features.length > 0) {
            products.push({
              id: `${idPrefix}-${productId++}`,
              model: modelName,
              features,
              blockIndex: blockIdx,
            });
          }
        }
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

      setProductData({ products, blocks });
      setFuse(fuseInstance);
      setParsingReports(reports);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
      setIsLoading(false);
    }
  }, [idPrefix]);

  const searchProducts = useCallback(
    (query: string): MiscSearchResult[] => {
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
    setParsingReports([]);
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

      const range = ws['!ref']
        ? XLSX.utils.decode_range(ws['!ref'])
        : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
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
              f.rowIndex === rowIndex && f.colIndex === colIndex
                ? { ...f, price: newPrice }
                : f,
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
    parsingReports,
    updateCellPrice,
    saveStatus,
  };
}
