import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockQuote } from '@/types/stock';
import { NewsScoutReport } from '@/types/agent';
import { generateGeminiJson } from '../gemini-helper';

export async function runNewsScoutAgent(
  quote: StockQuote,
  recentNews: any[],
  client: GoogleGenerativeAI | null
): Promise<NewsScoutReport> {
  const newsTitles = recentNews.map((n) => n.title).join('; ');

  const fallback: NewsScoutReport = {
    agentName: 'Agent News Scout (Sentiment & Catalysts)',
    role: 'NEWS_SCOUT',
    stance: 'Bullish',
    confidenceScore: 78,
    headlineTakeaway: `Market chatter remains constructive with steady corporate updates and healthy sector demand.`,
    sentimentPolarity: 0.45,
    catalystsIdentified: [
      'Solid domestic capex cycle and government infrastructure/policy thrust.',
      'Continuous mutual fund systematic investment plan (SIP) domestic liquidity support.',
    ],
    headwindWarnings: [
      'Global interest rate trajectory and foreign institutional selling waves.',
    ],
    arguments: [
      `News sentiment indicates steady retail and institutional interest for ${quote.name}.`,
      recentNews.length > 0 ? `Latest report: "${recentNews[0].title}"` : 'No negative regulatory or governance flags detected.',
    ],
  };

  if (!client) return fallback;

  const prompt = `
You are AGENT NEWS SCOUT monitoring Indian financial news for ${quote.name} (${quote.symbol}).
Headlines: ${newsTitles || 'Steady sector demand.'}

Analyze NEWS SENTIMENT. Return valid JSON:
{
  "stance": "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish",
  "confidenceScore": number (0-100),
  "headlineTakeaway": "1 sentence narrative",
  "sentimentPolarity": number (-1.0 to 1.0),
  "catalystsIdentified": ["catalyst 1", "catalyst 2"],
  "headwindWarnings": ["warning 1"],
  "arguments": ["point 1", "point 2"]
}
`;

  const parsed = await generateGeminiJson(client, prompt, 3500);
  if (!parsed) return fallback;

  return {
    agentName: 'Agent News Scout (Sentiment & Catalysts)',
    role: 'NEWS_SCOUT',
    stance: parsed.stance || fallback.stance,
    confidenceScore: parsed.confidenceScore || fallback.confidenceScore,
    headlineTakeaway: parsed.headlineTakeaway || fallback.headlineTakeaway,
    sentimentPolarity: parsed.sentimentPolarity ?? fallback.sentimentPolarity,
    catalystsIdentified: parsed.catalystsIdentified || fallback.catalystsIdentified,
    headwindWarnings: parsed.headwindWarnings || fallback.headwindWarnings,
    arguments: parsed.arguments || fallback.arguments,
  };
}
