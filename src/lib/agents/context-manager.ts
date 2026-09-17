import { DeliberationMemoryEntry } from './memory';

/**
 * Heuristic token estimator for prompt budgeting.
 * On average in LLM tokenizers (BPE / SentencePiece), 1 token ≈ 4 characters of English text.
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculates human-readable relative time difference from an ISO timestamp.
 */
export function formatRelativeTime(isoTimestamp: string): string {
  try {
    const then = new Date(isoTimestamp).getTime();
    const now = Date.now();
    const diffMs = now - then;

    if (isNaN(diffMs) || diffMs < 0) return 'recently';

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;

    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } catch {
    return 'previously';
  }
}

/**
 * Prunes and token-bounds news headlines to prevent context window bloat.
 * Defaults to a maximum budget of 400 tokens (~1,600 characters).
 */
export function pruneNewsContext(
  news: any[],
  maxTokens: number = 400
): { prunedNews: any[]; estimatedTokens: number } {
  if (!Array.isArray(news) || news.length === 0) {
    return { prunedNews: [], estimatedTokens: 0 };
  }

  const maxChars = maxTokens * 4;
  let currentChars = 0;
  const pruned: any[] = [];

  for (const item of news) {
    const title = (item.title || '').trim().slice(0, 150);
    const publisher = (item.publisher || 'Market Wire').trim().slice(0, 40);
    const approxItemLength = title.length + publisher.length + 10;

    if (currentChars + approxItemLength > maxChars && pruned.length >= 2) {
      break;
    }

    pruned.push({
      ...item,
      title,
      publisher,
    });
    currentChars += approxItemLength;
  }

  return {
    prunedNews: pruned,
    estimatedTokens: estimateTokens(JSON.stringify(pruned)),
  };
}

/**
 * Formats historical deliberation trajectory for injection into the CIO synthesis prompt.
 */
export function formatHistoricalContext(
  previousRun: DeliberationMemoryEntry | null,
  currentPrice: number
): {
  promptContext: string;
  metadata?: {
    runId: string;
    timestamp: string;
    price: number;
    cioVerdict: string;
    cioScore: number;
    priceDeltaPercent: number;
    elapsedTimeText: string;
  };
} {
  if (!previousRun || !previousRun.price || previousRun.price <= 0) {
    return { promptContext: '' };
  }

  const priceDelta = currentPrice - previousRun.price;
  const priceDeltaPercent = Number(((priceDelta / previousRun.price) * 100).toFixed(2));
  const sign = priceDeltaPercent >= 0 ? '+' : '';
  const elapsed = formatRelativeTime(previousRun.timestamp);

  const promptContext = `
PREVIOUS COMMITTEE DELIBERATION (${elapsed}):
- Prior CIO Verdict: ${previousRun.cioVerdict} (Score: ${previousRun.cioScore}/10) at ₹${previousRun.price.toLocaleString('en-IN')}
- Price Delta Since Review: ${sign}${priceDeltaPercent}% (Current: ₹${currentPrice.toLocaleString('en-IN')})
- Prior Directive: "${previousRun.cioExecutiveDirective || previousRun.debateSummary || 'N/A'}"
- Prior Targets: T1 ${previousRun.target1 || 'N/A'} | Stop-Loss ${previousRun.stopLoss || 'N/A'}
TASK NOTE: Explicitly address how the prior thesis has evolved. Has the target been approached, has momentum stalled, or does continuation upside remain?
`.trim();

  return {
    promptContext,
    metadata: {
      runId: previousRun.runId,
      timestamp: previousRun.timestamp,
      price: previousRun.price,
      cioVerdict: previousRun.cioVerdict,
      cioScore: previousRun.cioScore,
      priceDeltaPercent,
      elapsedTimeText: elapsed,
    },
  };
}

/**
 * Formats market regime context from recent committee deliberations on other stocks.
 */
export function formatMarketRegimeContext(recentDeliberations: DeliberationMemoryEntry[]): string {
  if (!Array.isArray(recentDeliberations) || recentDeliberations.length === 0) {
    return '';
  }

  const summaries = recentDeliberations.slice(0, 3).map(
    (d) => `${d.symbol}: ${d.cioVerdict} (${d.cioScore}/10)`
  );

  return `RECENT COMMITTEE BENCHMARKS: [${summaries.join(', ')}]`;
}

