import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { baseRequestClient, requestClient } from '#/api/request';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

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

export interface AgentStreamHandlers {
  onStart?: (data: any) => void;
  onDelta?: (content: string, data: any) => void;
  onDone?: (data: any) => void;
  onError?: (error: Error, data?: any) => void;
}

export async function queryAgentStream(
  message: string,
  sessionId: string | undefined,
  handlers: AgentStreamHandlers,
  signal?: AbortSignal,
) {
  const headers = authHeaders();
  const streamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': headers['Accept-Language'],
  };
  if (headers.Authorization) {
    streamHeaders.Authorization = headers.Authorization;
  }

  const response = await fetch(`${apiURL}/system/agent/query/stream`, {
    method: 'POST',
    headers: streamHeaders,
    body: JSON.stringify({ message, sessionId }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Agent stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (block: string) => {
    const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() || 'message';
    const dataLine = block.match(/^data:\s*(.*)$/m)?.[1] || '{}';
    let data: any = {};
    try {
      data = JSON.parse(dataLine);
    } catch {
      data = { raw: dataLine };
    }

    if (event === 'start') handlers.onStart?.(data);
    else if (event === 'delta') handlers.onDelta?.(data.content || '', data);
    else if (event === 'done') handlers.onDone?.(data);
    else if (event === 'error') {
      handlers.onError?.(new Error(data.message || 'Agent stream error'), data);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    blocks.filter(Boolean).forEach(dispatch);
  }

  if (buffer.trim()) {
    dispatch(buffer);
  }
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

// ===== 内置工具管理 =====
export function listBuiltinTools() {
  return requestClient.get('/system/agent/builtin-tools/list');
}

export function toggleBuiltinTool(name: string) {
  return requestClient.put(`/system/agent/builtin-tools/${name}/toggle`);
}

// ===== Hub 插件管理 =====
export function listHubPlugins(params?: { page?: number; size?: number; search?: string; category?: string }) {
  return requestClient.get('/system/agent/hub/plugins/list', { params });
}

export function getHubPlugin(id: number) {
  return requestClient.get(`/system/agent/hub/plugins/${id}/detail`);
}

export function uploadPlugin(formData: FormData) {
  return requestClient.post('/system/agent/hub/plugins/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function installPlugin(id: number, config?: Record<string, any>) {
  return requestClient.post(`/system/agent/hub/plugins/${id}/install`, { config });
}

export function uninstallPlugin(id: number) {
  return requestClient.delete(`/system/agent/hub/plugins/${id}/uninstall`);
}

export function toggleHubPlugin(id: number) {
  return requestClient.put(`/system/agent/hub/plugins/${id}/toggle`);
}

// ===== 远程 MCP 管理 =====
export function listRemoteMCPs(params?: { page?: number; size?: number }) {
  return requestClient.get('/system/agent/remote-mcps/list', { params });
}

export function createRemoteMCP(data: any) {
  return requestClient.post('/system/agent/remote-mcps/create', data);
}

export function updateRemoteMCP(id: number, data: any) {
  return requestClient.put(`/system/agent/remote-mcps/${id}/update`, data);
}

export function deleteRemoteMCP(id: number) {
  return requestClient.delete(`/system/agent/remote-mcps/${id}/delete`);
}

export function toggleRemoteMCP(id: number) {
  return requestClient.put(`/system/agent/remote-mcps/${id}/toggle`);
}

export function testRemoteMCP(id: number) {
  return requestClient.post(`/system/agent/remote-mcps/${id}/test`);
}
