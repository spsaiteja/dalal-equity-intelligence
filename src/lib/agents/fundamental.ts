import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockQuote } from '@/types/stock';
import { FundamentalReport } from '@/types/agent';
import { generateGeminiJson } from '../gemini-helper';
import { validateAndRepairFundamental } from './schema-validator';

export async function runFundamentalAgent(
  quote: StockQuote,
  client: GoogleGenerativeAI | null
): Promise<FundamentalReport> {
  const isCheap = (quote.peRatio ?? 30) < 25;
  const isDiscounted = quote.discountFromHigh > 15;

  const fallback: FundamentalReport = {
    agentName: 'Agent Fundamentalist (Valuation & Financials)',
    role: 'FUNDAMENTAL',
    stance: isDiscounted ? 'Strong Bullish' : isCheap ? 'Bullish' : 'Neutral',
    confidenceScore: 82,
    headlineTakeaway: isDiscounted
      ? `Valuation margin of safety has expanded significantly with the ${quote.discountFromHigh}% drop from recent peaks.`
      : `Fundamentals remain sound with stable operating profitability in the ${quote.sector || 'Indian'} sector.`,
    valuationStatus: isDiscounted ? 'Deeply Undervalued' : 'Fair Value',
    estimatedMarginOfSafetyPercent: isDiscounted ? 24 : 12,
    balanceSheetHealth: 'Robust',
    arguments: [
      `P/E Ratio currently sits at ${quote.peRatio ? quote.peRatio + 'x' : 'reasonable industry median'}.`,
      `Core business generates reliable free cash flows and maintains defensible competitive moats.`,
      `FII/DII institutional ownership provides long-term valuation anchor.`,
    ],
    isFallback: true,
    fallbackReason: !client ? 'Gemini API key not configured; using quantitative valuation model.' : 'LLM fundamental analysis timed out or exhausted retries.',
  };

  if (!client) return fallback;

  const prompt = `
You are AGENT FUNDAMENTALIST, an Indian equity analyst evaluating financials and margin of safety.
Stock: ${quote.name} (${quote.symbol}) | Sector: ${quote.sector || 'Equities'} | Price: ₹${quote.price} | P/E: ${quote.peRatio ?? 'N/A'} | Discount: ${quote.discountFromHigh}%

Evaluate valuation. Return valid JSON:
{
  "stance": "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish",
  "confidenceScore": number (0-100),
  "headlineTakeaway": "1 sentence on valuation & earnings quality",
  "valuationStatus": "Deeply Undervalued" | "Fair Value" | "Stretched Valuation" | "Overvalued",
  "estimatedMarginOfSafetyPercent": number,
  "balanceSheetHealth": "Robust" | "Moderate" | "Vulnerable",
  "arguments": ["point 1", "point 2", "point 3"]
}
`;

  const parsed = await generateGeminiJson(client, prompt, 8500);
  if (!parsed) return fallback;

  const validated = validateAndRepairFundamental(parsed);
  if (validated.success && validated.data) {
    return { ...validated.data, isFallback: false };
  }
  return fallback;
}
