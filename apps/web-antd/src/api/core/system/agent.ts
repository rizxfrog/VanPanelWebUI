import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { baseRequestClient } from '#/api/request';

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
}

export type AgentRisk = 'high' | 'low' | 'safe';

export interface AgentToolCall {
  id: string;
  name: string;
  args?: Record<string, any>;
  status: string;
  result?: Record<string, any>;
  error?: string;
}

export interface AgentApproval {
  id: string;
  sessionId: string;
  toolCall: AgentToolCall;
  status: string;
  createdAt: string;
}

export interface AgentMessage {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
}

export interface AgentQueryResponse {
  sessionId: string;
  message: AgentMessage;
  intent: string;
  risk: AgentRisk;
  toolCalls: AgentToolCall[];
  approvals?: AgentApproval[];
}

export interface AgentTool {
  name: string;
  description: string;
}

function authHeaders() {
  const accessStore = useAccessStore();
  return {
    'Accept-Language': preferences.app.locale,
    Authorization: accessStore.accessToken
      ? `Bearer ${accessStore.accessToken}`
      : undefined,
  };
}

export function normalizeAgentResponse<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'data' in payload
  ) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.code === 0) {
      return envelope.data;
    }
    throw new Error(envelope.message || 'Agent API request failed');
  }
  return payload as T;
}

export async function getAgentTools() {
  const response = await baseRequestClient.get<any>('/system/agent/tools', {
    headers: authHeaders(),
  });
  return normalizeAgentResponse<AgentTool[]>(response.data);
}

export async function queryAgent(message: string, sessionId?: string) {
  const response = await baseRequestClient.post<any>(
    '/system/agent/query',
    { message, sessionId },
    { headers: authHeaders() },
  );
  return normalizeAgentResponse<AgentQueryResponse>(response.data);
}

export async function confirmAgentApproval(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/agent/approvals/${id}/confirm`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeAgentResponse(response.data);
}

export async function rejectAgentApproval(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/agent/approvals/${id}/reject`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeAgentResponse(response.data);
}
