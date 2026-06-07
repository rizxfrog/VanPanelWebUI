import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { baseRequestClient } from '#/api/request';
import { normalizeResponse } from '#/api/core/utils';

import type { TerminalTarget } from '#/views/system/terminal-protocol';

function authHeaders() {
  const accessStore = useAccessStore();
  return {
    'Accept-Language': preferences.app.locale,
    Authorization: accessStore.accessToken
      ? `Bearer ${accessStore.accessToken}`
      : undefined,
  };
}

export async function getTerminalTargets() {
  const response = await baseRequestClient.get<any>('/system/terminal/targets', {
    headers: authHeaders(),
  });
  return normalizeResponse<TerminalTarget[]>(response.data, 'Terminal');
}

