import { AgentTool } from './types';

export interface CalculateRiskMetricsInput {
  symbol: string;
  price: number;
  stopLoss?: number;
  targetPrice?: number;
  accountSize?: number;
}

export interface CalculateRiskMetricsOutput {
  symbol: string;
  price: number;
  stopLoss: number;
  targetPrice: number;
  downsidePercent: number;
  upsidePercent: number;
  riskRewardRatio: string;
  recommendedMaxPositionPercent: number;
  recommendedMaxShares: number;
  riskRating: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Extreme Risk';
}

export const calculateRiskMetricsTool: AgentTool<CalculateRiskMetricsInput, CalculateRiskMetricsOutput> = {
  name: 'calculate_risk_metrics',
  description: 'Calculates risk parameters: stop-loss buffer %, upside ratio, recommended portfolio position sizing, and maximum share quantities.',
  parameters: {
    type: 'object',
    properties: {
      symbol: { type: 'string', description: 'Stock ticker' },
      price: { type: 'number', description: 'Current market price in ₹' },
      stopLoss: { type: 'number', description: 'Desired or calculated stop-loss price in ₹ (optional)' },
      targetPrice: { type: 'number', description: 'Target exit price in ₹ (optional)' },
      accountSize: { type: 'number', description: 'Portfolio capital in ₹. Default: ₹10,00,000.' },
    },
    required: ['symbol', 'price'],
  },
  validateInput: (args: any) => {
    if (!args || typeof args.symbol !== 'string' || typeof args.price !== 'number' || args.price <= 0) {
      return { valid: false, error: 'Parameters "symbol" (string) and "price" (positive number) are required.' };
    }
    const stopLoss = typeof args.stopLoss === 'number' && args.stopLoss > 0 ? args.stopLoss : Math.round(args.price * 0.94);
    const targetPrice = typeof args.targetPrice === 'number' && args.targetPrice > 0 ? args.targetPrice : Math.round(args.price * 1.15);
    const accountSize = typeof args.accountSize === 'number' && args.accountSize > 0 ? args.accountSize : 1000000;

    return {
      valid: true,
      data: {
        symbol: args.symbol.trim().toUpperCase(),
        price: args.price,
        stopLoss,
        targetPrice,
        accountSize,
      },
    };
  },
  execute: async (input: CalculateRiskMetricsInput): Promise<CalculateRiskMetricsOutput> => {
    const price = input.price;
    const stopLoss = input.stopLoss || Math.round(price * 0.94);
    const targetPrice = input.targetPrice || Math.round(price * 1.15);
    const accountSize = input.accountSize || 1000000;

    const downsidePercent = Math.round(((price - stopLoss) / price) * 1000) / 10;
    const upsidePercent = Math.round(((targetPrice - price) / price) * 1000) / 10;

    const ratio = downsidePercent > 0 ? Math.round((upsidePercent / downsidePercent) * 10) / 10 : 2.5;
    const riskRewardRatio = `1:${ratio}`;

    // Institutional rule: cap position size between 4% and 8%
    const recommendedMaxPositionPercent = downsidePercent > 8 ? 4 : downsidePercent > 5 ? 6 : 8;
    const maxCapital = (accountSize * recommendedMaxPositionPercent) / 100;
    const recommendedMaxShares = Math.floor(maxCapital / price);

    const riskRating = downsidePercent > 10 ? 'High Risk' : downsidePercent > 6 ? 'Moderate Risk' : 'Low Risk';

    return {
      symbol: input.symbol,
      price,
      stopLoss,
      targetPrice,
      downsidePercent,
      upsidePercent,
      riskRewardRatio,
      recommendedMaxPositionPercent,
      recommendedMaxShares,
      riskRating,
    };
  },
};
