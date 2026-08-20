import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useGoshiProductData } from '@/hooks/useGoshiProductData';
import { useMergedBlockData } from '@/hooks/useMergedBlockData';
import { useExcelFile } from '@/contexts/ExcelFileContext';
import { ExcelUpload } from '@/components/ExcelUpload';
import { SearchBar } from '@/components/SearchBar';
import { MiscProductList } from '@/components/MiscProductList';
import { ParsingReports } from '@/components/ParsingReports';
import { DownloadButton } from '@/components/DownloadButton';
import { SaveStatusIndicator } from '@/components/SaveStatusIndicator';
import { MiscSearchResult } from '@/types/misc-product';
import { Button } from '@/components/ui/button';
import vgtelLogo from '@/assets/vgtel-logo.svg';

const Goshi = () => {
  const navigate = useNavigate();
  const { goshiFile, setGoshiFile, clearGoshiFile } = useExcelFile();
  const {
    productData,
    isLoading,
    error,
    parseExcelFile,
    searchProducts: excelSearch,
    hasData,
    parsingReports,
    clearData,
    updateCellPrice,
    saveStatus,
  } = useGoshiProductData();
  const {
    mergedData,
    searchProducts,
    hasAnyData,
    manualColorMap,
    manualThumbMap,
    manualTextColorMap,
    manualVariantIdMap,
  } = useMergedBlockData(productData, excelSearch, 'mobile');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MiscSearchResult[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Parse file from global context when it changes
  useEffect(() => {
    if (goshiFile.file) {
      parseExcelFile(goshiFile.file);
    }
  }, [goshiFile.file, parseExcelFile]);

  const handleFileSelect = useCallback((file: File) => {
    setGoshiFile(file);
  }, [setGoshiFile]);

  const handleClearFile = useCallback(() => {
    clearGoshiFile();
    clearData();
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
  }, [clearGoshiFile, clearData]);

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    const results = searchProducts(searchQuery);
    setSearchResults(results);
    setIsSearchActive(true);
  }, [searchQuery, searchProducts]);

  // Dual-query search for voice input: search both raw and normalized text
  const handleDualSearch = useCallback((rawText: string, normalizedText: string) => {
    const normalizedResults = searchProducts(normalizedText);
    const rawResults = searchProducts(rawText);
    
    // Use whichever gives better results (more matches or higher scores)
    const bestResults = normalizedResults.length >= rawResults.length ? normalizedResults : rawResults;
    
    setSearchResults(bestResults);
    setIsSearchActive(true);
  }, [searchProducts]);

  // Clear search when query is emptied
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchActive(false);
    }
  }, [searchQuery]);

  return (
    <div className="h-dvh flex flex-col bg-card">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="mr-1"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <img src={vgtelLogo} alt="LCD-Vahid" className="h-8 w-auto" />
            <h1 className="text-lg font-bold">گوشی</h1>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={saveStatus} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ExcelUpload 
            onFileSelect={handleFileSelect}
            onClear={handleClearFile}
            isLoading={isLoading}
            hasData={hasData}
            fileName={goshiFile.fileName}
          />
          <DownloadButton pageKey="goshi" />
          <ParsingReports reports={parsingReports} />
        </div>
      </div>

      {/* Search */}
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

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border-b border-destructive/20">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Product List */}
      <MiscProductList
        productData={mergedData}
        searchResults={searchResults}
        isSearchActive={isSearchActive}
        onUpdatePrice={updateCellPrice}
        manualColorMap={manualColorMap}
        manualThumbMap={manualThumbMap}
        manualTextColorMap={manualTextColorMap}
        manualVariantIdMap={manualVariantIdMap}
      />
    </div>
  );
};

export default Goshi;
