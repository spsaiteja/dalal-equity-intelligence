export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  parameters: ToolParameters;
  validateInput: (args: any) => { valid: boolean; error?: string; data?: TInput };
  execute: (input: TInput) => Promise<TOutput>;
}

export interface ToolCallResult<T = any> {
  toolName: string;
  durationMs: number;
  status: 'success' | 'error';
  input: any;
  output?: T;
  error?: string;
}
