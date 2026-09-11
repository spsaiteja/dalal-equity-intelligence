import { AgentTool } from './types';
import { fetchStockHistory } from '@/lib/yahoo-client';
import { HistoricalBar } from '@/types/stock';

export interface GetHistoricalCandlesInput {
  symbol: string;
  days?: number;
}

export interface GetHistoricalCandlesOutput {
  symbol: string;
  days: number;
  barsCount: number;
  bars: HistoricalBar[];
}

export const getHistoricalCandlesTool: AgentTool<GetHistoricalCandlesInput, GetHistoricalCandlesOutput> = {
  name: 'get_historical_candles',
  description: 'Retrieves historical daily OHLCV candlestick bars for technical chart pattern and trend analysis.',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'Stock symbol (e.g. RELIANCE.NS, TCS.NS)',
      },
      days: {
        type: 'number',
        description: 'Number of historical trading days to look back (e.g. 30, 90, 180). Default: 90.',
      },
    },
    required: ['symbol'],
  },
  validateInput: (args: any) => {
    if (!args || typeof args.symbol !== 'string' || !args.symbol.trim()) {
      return { valid: false, error: 'Parameter "symbol" is required.' };
    }
    let sym = args.symbol.trim().toUpperCase();
    if (!sym.includes('.')) sym = `${sym}.NS`;
    const days = typeof args.days === 'number' && args.days > 0 ? Math.min(args.days, 365) : 90;
    return { valid: true, data: { symbol: sym, days } };
  },
  execute: async (input: GetHistoricalCandlesInput): Promise<GetHistoricalCandlesOutput> => {
    const days = input.days || 90;
    const bars = await fetchStockHistory(input.symbol, days);
    return {
      symbol: input.symbol,
      days,
      barsCount: bars.length,
      bars,
    };
  },
};
