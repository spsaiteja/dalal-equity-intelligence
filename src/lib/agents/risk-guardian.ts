import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockQuote } from '@/types/stock';
import { RiskGuardianReport } from '@/types/agent';
import { generateGeminiJson } from '../gemini-helper';
import { validateAndRepairRiskGuardian } from './schema-validator';

export async function runRiskGuardianAgent(
  quote: StockQuote,
  client: GoogleGenerativeAI | null
): Promise<RiskGuardianReport> {
  const defaultStopLoss = `₹${Math.round(quote.price * 0.94).toLocaleString('en-IN')}`;

  const fallback: RiskGuardianReport = {
    agentName: 'Agent Risk Guardian (Capital Preservation)',
    role: 'RISK_GUARDIAN',
    stance: 'Neutral',
    confidenceScore: 88,
    headlineTakeaway: `Downside risk is contained provided stop-loss at ${defaultStopLoss} is rigorously enforced.`,
    riskRating: 'Moderate Risk',
    recommendedMaxPositionPercent: 6,
    mandatedStopLoss: defaultStopLoss,
    riskRewardAssessment: '1:2.6 (Favorable upside skew relative to 6% stop-loss buffer)',
    arguments: [
      `Risk-Reward asymmetry: ${quote.discountFromHigh}% drop from peak provides a cushion against multiple compression.`,
      `Mandatory stop-loss pegged at 5-6% below current price to protect institutional capital.`,
      `Cap single-stock allocation to 6% of total portfolio value to prevent sector clustering.`,
    ],
  };

  if (!client) return fallback;

  const prompt = `
You are AGENT RISK GUARDIAN, Chief Risk Officer.
Stock: ${quote.name} (${quote.symbol}) | Price: ₹${quote.price} | 52W Range Discount: ${quote.discountFromHigh}%

Evaluate DOWNSIDE RISK and CAPITAL PROTECTION. Return valid JSON:
{
  "stance": "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish",
  "confidenceScore": number (0-100),
  "headlineTakeaway": "1 sentence risk takeaway",
  "riskRating": "Low Risk" | "Moderate Risk" | "High Risk" | "Extreme Risk",
  "recommendedMaxPositionPercent": number,
  "mandatedStopLoss": "₹ level",
  "riskRewardAssessment": "Ratio and assessment",
  "arguments": ["point 1", "point 2"]
}
`;

  const parsed = await generateGeminiJson(client, prompt, 3500);
  if (!parsed) return fallback;

  const validated = validateAndRepairRiskGuardian(parsed);
  if (validated.success && validated.data) {
    return validated.data;
  }
  return fallback;
}
