import { AgentTool, ToolCallResult } from './types';
import { getStockQuoteTool } from './get-stock-quote';
import { getHistoricalCandlesTool } from './get-historical-candles';
import { getTechnicalIndicatorsTool } from './get-technical-indicators';
import { getCompanyFinancialsTool } from './get-company-financials';
import { searchMarketNewsTool } from './search-market-news';
import { calculateRiskMetricsTool } from './calculate-risk-metrics';

export * from './types';
export * from './get-stock-quote';
export * from './get-historical-candles';
export * from './get-technical-indicators';
export * from './get-company-financials';
export * from './search-market-news';
export * from './calculate-risk-metrics';

export const toolRegistry: Record<string, AgentTool<any, any>> = {
  [getStockQuoteTool.name]: getStockQuoteTool,
  [getHistoricalCandlesTool.name]: getHistoricalCandlesTool,
  [getTechnicalIndicatorsTool.name]: getTechnicalIndicatorsTool,
  [getCompanyFinancialsTool.name]: getCompanyFinancialsTool,
  [searchMarketNewsTool.name]: searchMarketNewsTool,
  [calculateRiskMetricsTool.name]: calculateRiskMetricsTool,
};

/**
 * Dispatcher to execute any registered tool with latency tracking, input validation, and fail-soft error isolation
 */
export async function executeTool<T = any>(toolName: string, rawInput: any): Promise<ToolCallResult<T>> {
  const t0 = performance.now();
  const tool = toolRegistry[toolName];

  if (!tool) {
    const durationMs = Math.round(performance.now() - t0);
    return {
      toolName,
      status: 'error',
      input: rawInput,
      error: `Tool "${toolName}" is not registered in the toolRegistry.`,
      durationMs,
    };
  }

  const validation = tool.validateInput(rawInput);
  if (!validation.valid) {
    const durationMs = Math.round(performance.now() - t0);
    return {
      toolName,
      status: 'error',
      input: rawInput,
      error: validation.error || 'Input validation failed.',
      durationMs,
    };
  }

  try {
    const output = await tool.execute(validation.data);
    const durationMs = Math.round(performance.now() - t0);
    return {
      toolName,
      status: 'success',
      input: validation.data,
      output,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - t0);
    return {
      toolName,
      status: 'error',
      input: validation.data,
      error: err?.message || 'Tool execution encountered an unexpected error.',
      durationMs,
    };
  }
}

/**
 * Returns Gemini function declarations formatted for Google Generative AI tools API
 */
export function getGeminiToolDeclarations() {
  return [
    {
      functionDeclarations: Object.values(toolRegistry).map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    },
  ];
}

/**
 * Returns catalog list of all registered tools
 */
export function listAvailableTools() {
  return Object.values(toolRegistry).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
