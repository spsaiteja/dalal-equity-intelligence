export type CouncilRole =
  | 'SENTINEL'
  | 'FUNDAMENTALIST'
  | 'NEWS_SCOUT'
  | 'RISK_GUARDIAN'
  | 'CIO'
  | 'ALL';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  senderRole?: CouncilRole;
  senderName?: string;
  content: string;
  timestamp: string;
  inReplyTo?: string;
}

export interface CouncilChatSession {
  sessionId: string;
  runId: string;
  symbol: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

export interface InterrogationRequest {
  runId: string;
  symbol: string;
  stockPrice?: number;
  targetAgent: CouncilRole;
  userQuery: string;
  history?: ChatMessage[];
  consensusSummary?: string;
  cioVerdict?: string;
  cioDirective?: string;
  apiKey?: string;
}

export interface InterrogationResponse {
  message: ChatMessage;
  targetAgent: CouncilRole;
  complianceNotice?: string;
}

