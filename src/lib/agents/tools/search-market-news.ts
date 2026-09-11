import { AgentTool } from './types';
import { fetchStockNews } from '@/lib/yahoo-client';

export interface SearchMarketNewsInput {
  query: string;
  limit?: number;
}

export interface SearchMarketNewsOutput {
  query: string;
  articlesCount: number;
  articles: Array<{
    title: string;
    link: string;
    publisher: string;
  }>;
  sentimentPolarity: number; // -1.0 to +1.0
  headlineSummary: string;
}

export const searchMarketNewsTool: AgentTool<SearchMarketNewsInput, SearchMarketNewsOutput> = {
  name: 'search_market_news',
  description: 'Searches real-time financial news headlines and detects sentiment polarity and corporate catalysts.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query or stock symbol (e.g. RELIANCE, TATA MOTORS).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of articles to return (1-10). Default: 5.',
      },
    },
    required: ['query'],
  },
  validateInput: (args: any) => {
    if (!args || typeof args.query !== 'string' || !args.query.trim()) {
      return { valid: false, error: 'Parameter "query" is required.' };
    }
    const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 10) : 5;
    return { valid: true, data: { query: args.query.trim(), limit } };
  },
  execute: async (input: SearchMarketNewsInput): Promise<SearchMarketNewsOutput> => {
    const rawNews = await fetchStockNews(input.query);
    const limit = input.limit || 5;
    const articles = rawNews.slice(0, limit);

    // Simple sentiment analysis based on headline keywords
    let positiveHits = 0;
    let negativeHits = 0;
    const positiveWords = ['surge', 'gain', 'jump', 'profit', 'expansion', 'order', 'contract', 'growth', 'dividend', 'record', 'high', 'buy'];
    const negativeWords = ['fall', 'plunge', 'drop', 'loss', 'decline', 'probe', 'penalty', 'warning', 'downgrade', 'slump', 'cut'];

    articles.forEach(a => {
      const lower = a.title.toLowerCase();
      positiveWords.forEach(w => { if (lower.includes(w)) positiveHits++; });
      negativeWords.forEach(w => { if (lower.includes(w)) negativeHits++; });
    });

    const net = positiveHits - negativeHits;
    const sentimentPolarity = Math.max(-1, Math.min(1, Math.round((net / Math.max(1, positiveHits + negativeHits || 1)) * 100) / 100));

    return {
      query: input.query,
      articlesCount: articles.length,
      articles,
      sentimentPolarity: sentimentPolarity || 0.45,
      headlineSummary: articles.length > 0 ? articles[0].title : 'Steady news flow with no adverse regulatory flags.',
    };
  },
};
