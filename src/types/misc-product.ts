export interface MiscProduct {
  id: string;
  model: string;
  features: MiscFeaturePrice[];
  blockIndex: number;
}

export interface MiscFeaturePrice {
  featureName: string;
  price: number;
  sheetName?: string;
  rowIndex?: number;
  colIndex?: number;
}

export interface MiscProductData {
  products: MiscProduct[];
  blocks: DetectedBlock[];
}

export interface DetectedBlock {
  modelColumnIndex: number;
  featureColumnIndices: number[];
  startRow: number;
}

export interface MiscSearchResult {
  product: MiscProduct;
  score: number;
}

export interface ParsingReport {
  columnIndex: number;
  columnLetter: string;
  reason: string;
  timestamp: Date;
}
