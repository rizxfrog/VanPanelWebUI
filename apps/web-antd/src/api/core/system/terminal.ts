import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { baseRequestClient } from '#/api/request';

import type { TerminalTarget } from '#/views/system/terminal-protocol';

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
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

export function normalizeTerminalResponse<T>(payload: ApiEnvelope<T> | T): T {
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
    throw new Error(envelope.message || 'Terminal API request failed');
  }
  return payload as T;
}

export async function getTerminalTargets() {
  const response = await baseRequestClient.get<any>('/system/terminal/targets', {
    headers: authHeaders(),
  });
  return normalizeTerminalResponse<TerminalTarget[]>(response.data);
}

export async function getTerminalSessions() {
  const response = await baseRequestClient.get<any>('/system/terminal/sessions', {
    headers: authHeaders(),
  });
  return normalizeTerminalResponse(response.data);
}

export async function closeTerminalSession(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/terminal/sessions/${id}/close`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeTerminalResponse(response.data);
}
