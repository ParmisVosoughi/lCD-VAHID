import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductData } from '@/hooks/useProductData';
import { useMergedProductData } from '@/hooks/useMergedProductData';
import { useExcelFile } from '@/contexts/ExcelFileContext';
import { ExcelUpload } from '@/components/ExcelUpload';
import { SearchBar } from '@/components/SearchBar';
import { ProductList } from '@/components/ProductList';
import { AdminPanel } from '@/components/AdminPanel';
import { DownloadButton } from '@/components/DownloadButton';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { Button } from '@/components/ui/button';
import { ApplyPercentageButton } from '@/components/ApplyPercentageButton';
import { SearchResult } from '@/types/product';
import vgtelLogo from '@/assets/vgtel-logo.svg';

export function ProductLookup() {
  const navigate = useNavigate();
  const { lcdFile, setLcdFile, clearLcdFile } = useExcelFile();
  const {
    productData,
    isLoading,
    error,
    parseExcelFile,
    hasData,
    clearData,
    updateCellPrice,
    saveStatus,
  } = useProductData();

  const { mergedData, searchProducts, hasAnyData } = useMergedProductData(productData, 'lcd');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    if (lcdFile.file) parseExcelFile(lcdFile.file);
  }, [lcdFile.file, parseExcelFile]);

  const handleFileSelect = useCallback((file: File) => setLcdFile(file), [setLcdFile]);

  const handleClearFile = useCallback(() => {
    clearLcdFile();
    clearData();
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
  }, [clearLcdFile, clearData]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }
    setSearchResults(searchProducts(searchQuery));
    setIsSearchActive(true);
  }, [searchQuery, searchProducts]);

  const handleDualSearch = useCallback((rawText: string, normalizedText: string) => {
    const normalizedResults = searchProducts(normalizedText);
    const rawResults = searchProducts(rawText);
    const bestResults = normalizedResults.length >= rawResults.length ? normalizedResults : rawResults;
    setSearchResults(bestResults);
    setIsSearchActive(true);
  }, [searchProducts]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
    }
  }, [searchQuery]);

  return (
    <div className="h-dvh flex flex-col bg-card">
      <div className="panel-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={vgtelLogo} alt="LCD-Vahid" className="h-8 w-auto" />
            <h1 className="text-lg font-bold">LCD-Vahid</h1>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={saveStatus} />
            <AdminPanel />
          </div>
        </div>

        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
            <ExcelUpload
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              isLoading={isLoading}
              hasData={hasData}
              fileName={lcdFile.fileName}
            />
            <DownloadButton pageKey="lcd" />
            <Button variant="default" className="touch-button shrink-0" onClick={() => navigate('/goshi')}>گوشی</Button>
            <Button variant="default" className="touch-button shrink-0" onClick={() => navigate('/misc')}>متفرقه</Button>
            <Button variant="default" className="touch-button shrink-0" onClick={() => navigate('/invoice')}>چاپ فاکتور</Button>
            <Button variant="default" className="touch-button shrink-0" onClick={() => navigate('/market-rates')}>نرخ بازار</Button>
            <ApplyPercentageButton category="lcd" />
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onDualSearch={handleDualSearch}
          placeholder="Search by model..."
          disabled={!hasAnyData}
        />
        {isSearchActive && (
          <p className="mt-2 text-sm text-muted-foreground">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border-b border-destructive/20">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <ProductList
        productData={mergedData}
        searchResults={searchResults}
        isSearchActive={isSearchActive}
        onUpdatePrice={updateCellPrice}
        manualColorMap={mergedData?.manualColorMap}
        manualThumbMap={mergedData?.manualThumbMap}
        manualTextColorMap={mergedData?.manualTextColorMap}
        manualVariantIdMap={mergedData?.manualVariantIdMap}
        manualProductIdMap={mergedData?.manualProductIdMap}
      />

      <footer className="py-2 text-center text-[11px] text-muted-foreground">
        edit by Parmis Vosoughi
      </footer>
    </div>
  );
}
