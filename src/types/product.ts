export interface Product {
  id: string;
  model: string;
  features: FeaturePrice[];
  rawRow: (string | number)[];
  groupIndex: number; // Which block (0=Android, 1=Nokia, 2=iPhone)
  blockName: string; // Block name for display/filtering
}

export interface FeaturePrice {
  featureName: string;
  price: number;
  sheetName?: string;
  rowIndex?: number;
  colIndex?: number;
}

export interface ProductData {
  headers: string[];
  products: Product[];
  featureHeaders: string[][]; // Feature headers for each block
}

export interface SearchResult {
  product: Product;
  score: number;
}
