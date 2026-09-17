import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 4000,
  timeoutMs: 8500,
};

/**
 * Checks if an error is transient and retryable (rate limits, timeouts, server overloads)
 */
export function isRetryableError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || '').toLowerCase();
  const status = Number(err?.status || err?.statusCode || 0);

  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }
  return false;
}

/**
 * Calculates exponential backoff with full jitter to avoid synchronization stamps
 */
export function calculateBackoff(attempt: number, initialDelayMs: number = 500, maxDelayMs: number = 4000): number {
  const base = Math.min(maxDelayMs, initialDelayMs * Math.pow(2, attempt));
  // Add 0% to 30% full jitter
  const jitter = Math.random() * (base * 0.3);
  return Math.round(base + jitter);
}

/**
 * Utility delay promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a Gemini request with automatic model failover, exponential backoff retry, and timeout protection.
 * If all retries fail or an unrecoverable error occurs, returns null cleanly without crashing callers.
 */
export async function generateGeminiJson(
  client: GoogleGenerativeAI | null,
  prompt: string,
  timeoutMsOrOptions?: number | RetryOptions
): Promise<any | null> {
  if (!client) return null;

  const options: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...(typeof timeoutMsOrOptions === 'number'
      ? { timeoutMs: timeoutMsOrOptions }
      : timeoutMsOrOptions || {}),
  };

  const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const modelName of modelsToTry) {
    let attempt = 0;

    while (attempt <= options.maxRetries) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${options.timeoutMs}ms for ${modelName}`)), options.timeoutMs)
        );

        const contentPromise = model.generateContent(prompt).then((res) => res.response.text());

        const text = await Promise.race([contentPromise, timeoutPromise]);
        const parsed = JSON.parse(text);
        return parsed;
      } catch (err: any) {
        // If 404 (model not available for API key), fail over to next model immediately
        if (err?.message?.includes('404') || err?.status === 404) {
          break; // move to next model in modelsToTry
        }

        const retryable = isRetryableError(err);
        if (retryable && attempt < options.maxRetries) {
          const delay = calculateBackoff(attempt, options.initialDelayMs, options.maxDelayMs);
          console.warn(
            `[Gemini-Retry] ${modelName} encountered retryable error (attempt ${attempt + 1}/${options.maxRetries}). Retrying in ${delay}ms...`,
            err?.message || err
          );
          await sleep(delay);
          attempt++;
          continue;
        }

        // Non-retryable error or retries exhausted for this model
        console.warn(`[Gemini-Helper] Call failed for ${modelName} after ${attempt} retries:`, err?.message || err);
        break;
      }
    }
  }

  return null;
}

/**
 * Executes a Gemini plain-text request with model failover, exponential backoff, and timeout protection.
 */
export async function generateGeminiText(
  client: GoogleGenerativeAI | null,
  prompt: string,
  timeoutMsOrOptions?: number | RetryOptions
): Promise<string | null> {
  if (!client) return null;

  const options: Required<RetryOptions> = {
    ...DEFAULT_RETRY_OPTIONS,
    ...(typeof timeoutMsOrOptions === 'number'
      ? { timeoutMs: timeoutMsOrOptions }
      : timeoutMsOrOptions || {}),
  };

  const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const modelName of modelsToTry) {
    let attempt = 0;

    while (attempt <= options.maxRetries) {
      try {
        const model = client.getGenerativeModel({ model: modelName });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${options.timeoutMs}ms for ${modelName}`)), options.timeoutMs)
        );

        const contentPromise = model.generateContent(prompt).then((res) => res.response.text());
        const text = await Promise.race([contentPromise, timeoutPromise]);
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (err: any) {
        if (err?.message?.includes('404') || err?.status === 404) {
          break;
        }

        const retryable = isRetryableError(err);
        if (retryable && attempt < options.maxRetries) {
          const delay = calculateBackoff(attempt, options.initialDelayMs, options.maxDelayMs);
          await sleep(delay);
          attempt++;
          continue;
        }

        console.warn(`[Gemini-Text] Call failed for ${modelName} after ${attempt} retries:`, err?.message || err);
        break;
      }
    }
  }

  return null;
}
