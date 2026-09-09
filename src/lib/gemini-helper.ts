import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Executes a Gemini request with automatic model fallback and a strict timeout.
 * If Gemini takes longer than timeoutMs or fails, returns null so the quantitative engine responds instantly.
 */
export async function generateGeminiJson(
  client: GoogleGenerativeAI | null,
  prompt: string,
  timeoutMs: number = 4000
): Promise<any | null> {
  if (!client) return null;

  const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro'];

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      const contentPromise = model.generateContent(prompt).then((res) => res.response.text());

      const text = await Promise.race([contentPromise, timeoutPromise]);
      const parsed = JSON.parse(text);
      return parsed;
    } catch (err: any) {
      // If model not found (404), try next model in list
      if (err?.message?.includes('404') || err?.status === 404) {
        continue;
      }
      // For timeouts or network blocks, break out quickly to avoid latency
      break;
    }
  }

  return null;
}

