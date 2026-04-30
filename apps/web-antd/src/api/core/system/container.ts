import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { baseRequestClient } from '#/api/request';

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
}

export interface ContainerItem {
  id: string;
  shortId: string;
  name: string;
  image: string;
  imageId: string;
  state: string;
  status: string;
  createdAt: string;
  ports: string[];
  ips: string[];
  labels: Record<string, string>;
  isCompose: boolean;
}

export interface ContainerListResult {
  items: ContainerItem[];
  total: number;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  readAt: string;
}

export interface ContainerListParams {
  name?: string;
  page?: number;
  pageSize?: number;
  state?: string;
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

export function normalizeContainerResponse<T>(payload: ApiEnvelope<T> | T): T {
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
    throw new Error(envelope.message || 'Container API request failed');
  }
  return payload as T;
}

export async function getContainers(params: ContainerListParams = {}) {
  const response = await baseRequestClient.get<any>('/system/containers', {
    headers: authHeaders(),
    params,
  });
  return normalizeContainerResponse<ContainerListResult>(response.data);
}

export async function startContainer(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/containers/${id}/start`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeContainerResponse(response.data);
}

export async function stopContainer(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/containers/${id}/stop`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeContainerResponse(response.data);
}

export async function restartContainer(id: string) {
  const response = await baseRequestClient.post<any>(
    `/system/containers/${id}/restart`,
    undefined,
    { headers: authHeaders() },
  );
  return normalizeContainerResponse(response.data);
}

export async function deleteContainer(id: string) {
  const response = await baseRequestClient.delete<any>(
    `/system/containers/${id}`,
    { headers: authHeaders() },
  );
  return normalizeContainerResponse(response.data);
}

export async function getContainerStats(id: string) {
  const response = await baseRequestClient.get<any>(
    `/system/containers/${id}/stats`,
    { headers: authHeaders() },
  );
  return normalizeContainerResponse<ContainerStats>(response.data);
}

export async function getContainerLogs(id: string, tail = '200') {
  const response = await baseRequestClient.get<string>(
    `/system/containers/${id}/logs`,
    {
      headers: authHeaders(),
      params: { tail },
      responseType: 'text',
    },
  );
  return response.data;
}
