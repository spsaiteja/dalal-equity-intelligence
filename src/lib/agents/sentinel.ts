import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockQuote } from '@/types/stock';
import { SentinelReport } from '@/types/agent';
import { generateGeminiJson } from '../gemini-helper';
import { validateAndRepairSentinel } from './schema-validator';

export async function runSentinelAgent(
  quote: StockQuote,
  client: GoogleGenerativeAI | null
): Promise<SentinelReport> {
  const isOversold = (quote.rsi14 ?? 50) < 40;
  const isAbove200 = quote.ema200 ? quote.price > quote.ema200 : true;

  const fallback: SentinelReport = {
    agentName: 'Agent Sentinel (Technicals & Momentum)',
    role: 'SENTINEL',
    stance: isOversold ? 'Strong Bullish' : isAbove200 ? 'Bullish' : 'Neutral',
    confidenceScore: isOversold ? 86 : 76,
    headlineTakeaway: isOversold
      ? `RSI at ${quote.rsi14 ?? 'oversold'} with price ${quote.discountFromHigh}% off peak signals prime mean-reversion opportunity.`
      : `Price action is consolidating in a supportive band relative to short-term moving averages.`,
    trendAssessment: isAbove200
      ? 'Macro Uptrend: Holding above 200 EMA with solid structural base.'
      : 'Macro Consolidation: Testing intermediate horizontal supports.',
    keyLevels: {
      immediateSupport: `₹${Math.round(quote.price * 0.98).toLocaleString('en-IN')}`,
      majorSupport: `₹${Math.round(quote.price * 0.94).toLocaleString('en-IN')}`,
      immediateResistance: `₹${Math.round(quote.price * 1.06).toLocaleString('en-IN')}`,
      majorBreakout: `₹${Math.round(quote.fiftyTwoWeekHigh).toLocaleString('en-IN')}`,
    },
    arguments: [
      `52-Week distance: Currently ${quote.discountFromHigh}% below peak and ${quote.distanceFromLow}% above annual low.`,
      `14-Day RSI is hovering at ${quote.rsi14 ?? 'N/A'}, reflecting healthy accumulation.`,
      quote.ema50 ? `Price is within ${Math.abs(quote.price - quote.ema50).toFixed(1)} pts of the 50-day EMA.` : 'Consolidation channel.',
    ],
    isFallback: true,
    fallbackReason: !client ? 'Gemini API key not configured; using quantitative rule engine.' : 'LLM deliberation timed out or exhausted retries.',
  };

  if (!client) return fallback;

  const prompt = `
You are AGENT SENTINEL, a veteran technical analyst specializing in NSE/BSE Indian equities.
Stock: ${quote.name} (${quote.symbol}) | Price: ₹${quote.price} | 52W High: ₹${quote.fiftyTwoWeekHigh} (Discount: ${quote.discountFromHigh}%) | RSI: ${quote.rsi14 ?? 'N/A'}

Analyze TECHNICAL momentum. Return valid JSON:
{
  "stance": "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish",
  "confidenceScore": number (0-100),
  "headlineTakeaway": "1 sentence technical takeaway",
  "trendAssessment": "Macro & micro trend summary",
  "keyLevels": {
    "immediateSupport": "₹ level",
    "majorSupport": "₹ level",
    "immediateResistance": "₹ level",
    "majorBreakout": "₹ level"
  },
  "arguments": ["point 1", "point 2", "point 3"]
}
`;

  const parsed = await generateGeminiJson(client, prompt, 8500);
  if (!parsed) return fallback;

  const validated = validateAndRepairSentinel(parsed);
  if (validated.success && validated.data) {
    return { ...validated.data, isFallback: false };
  }
  return fallback;
}
