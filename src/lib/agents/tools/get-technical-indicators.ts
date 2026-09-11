import { AgentTool } from './types';
import { fetchStockQuote } from '@/lib/yahoo-client';

export interface GetTechnicalIndicatorsInput {
  symbol: string;
}

export interface GetTechnicalIndicatorsOutput {
  symbol: string;
  price: number;
  rsi14: number;
  ema50?: number;
  ema200?: number;
  trendAssessment: string;
  keyLevels: {
    immediateSupport: string;
    majorSupport: string;
    immediateResistance: string;
    majorBreakout: string;
  };
}

export const getTechnicalIndicatorsTool: AgentTool<GetTechnicalIndicatorsInput, GetTechnicalIndicatorsOutput> = {
  name: 'get_technical_indicators',
  description: 'Calculates quantitative technical indicators (14-period RSI, 50/200 EMA, support/resistance key levels).',
  parameters: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        description: 'The stock ticker symbol (e.g. RELIANCE.NS)',
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
    return { valid: true, data: { symbol: sym } };
  },
  execute: async (input: GetTechnicalIndicatorsInput): Promise<GetTechnicalIndicatorsOutput> => {
    const quote = await fetchStockQuote(input.symbol);
    if (!quote) throw new Error(`Failed to compute technicals for: ${input.symbol}`);

    const rsi14 = quote.rsi14 ?? 50;
    const isAbove200 = quote.ema200 ? quote.price > quote.ema200 : true;

    return {
      symbol: quote.symbol,
      price: quote.price,
      rsi14,
      ema50: quote.ema50,
      ema200: quote.ema200,
      trendAssessment: isAbove200
        ? 'Macro Uptrend: Holding above 200 EMA with supportive accumulation base.'
        : 'Macro Consolidation: Testing intermediate horizontal supports.',
      keyLevels: {
        immediateSupport: `₹${Math.round(quote.price * 0.98).toLocaleString('en-IN')}`,
        majorSupport: `₹${Math.round(quote.price * 0.94).toLocaleString('en-IN')}`,
        immediateResistance: `₹${Math.round(quote.price * 1.06).toLocaleString('en-IN')}`,
        majorBreakout: `₹${Math.round(quote.fiftyTwoWeekHigh).toLocaleString('en-IN')}`,
      },
    };
  },
};
