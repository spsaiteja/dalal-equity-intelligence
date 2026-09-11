import { AgentTool } from './types';
import { fetchStockQuote } from '@/lib/yahoo-client';
import { StockQuote } from '@/types/stock';

export interface GetStockQuoteInput {
  symbol: string;
}

export interface GetStockQuoteOutput {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  discountFromHigh: number;
  distanceFromLow: number;
  volume: number;
  sector?: string;
}

export const getStockQuoteTool: AgentTool<GetStockQuoteInput, GetStockQuoteOutput> = {
  name: 'get_stock_quote',
  description: 'Fetches real-time price, 52-week extremes, day range, volume, and discount from peak for an Indian equity (NSE/BSE).',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'The stock ticker symbol (e.g., RELIANCE.NS, TCS.NS, INFY.NS).',
      },
    },
    required: ['symbol'],
  },
  validateInput: (args: any) => {
    if (!args || typeof args.symbol !== 'string' || !args.symbol.trim()) {
      return { valid: false, error: 'Parameter "symbol" is required and must be a non-empty string.' };
    }
    let sym = args.symbol.trim().toUpperCase();
    if (!sym.includes('.')) {
      sym = `${sym}.NS`;
    }
    return { valid: true, data: { symbol: sym } };
  },
  execute: async (input: GetStockQuoteInput): Promise<GetStockQuoteOutput> => {
    const quote: StockQuote | null = await fetchStockQuote(input.symbol);
    if (!quote) {
      throw new Error(`Market quote not found for ticker: ${input.symbol}`);
    }
    return {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      discountFromHigh: quote.discountFromHigh,
      distanceFromLow: quote.distanceFromLow,
      volume: quote.volume,
      sector: quote.sector,
    };
  },
};
