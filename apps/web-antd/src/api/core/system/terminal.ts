import { requestClient } from '#/api/request';

import type { TerminalTarget } from '#/views/system/terminal-protocol';

export async function getTerminalTargets() {
  return requestClient.get<TerminalTarget[]>('/system/terminal/targets');
}

export async function getTerminalSessions() {
  return requestClient.get('/system/terminal/sessions');
}

export async function closeTerminalSession(id: string) {
  return requestClient.post(`/system/terminal/sessions/${id}/close`);
}
