import nifty500Json from '../../data/nifty500.json';

export interface StockMaster {
  symbol: string;
  name: string;
  sector: string;
  nifty50: boolean;
  nifty100?: boolean;
}

export const INDIAN_INDICES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'BANK NIFTY' },
  { symbol: '^CNXIT', name: 'NIFTY IT' },
];

export const POPULAR_INDIAN_STOCKS: StockMaster[] = nifty500Json as StockMaster[];
