export type TerminalTargetType = 'local' | 'ssh';

export interface TerminalTarget {
  id: string;
  name: string;
  type: TerminalTargetType;
}

export type TerminalMessage =
  | {
      cols?: number;
      rows?: number;
      targetId: string;
      targetType: TerminalTargetType;
      type: 'connect';
    }
  | {
      sessionId: string;
      targetName: string;
      targetType: TerminalTargetType;
      type: 'connected';
    }
  | { data: string; sessionId: string; type: 'input' }
  | { data: string; sessionId: string; type: 'output' }
  | { cols: number; rows: number; sessionId: string; type: 'resize' }
  | { sessionId: string; type: 'ping' }
  | { sessionId: string; type: 'pong' }
  | { message: string; sessionId?: string; type: 'error' }
  | { reason: string; sessionId: string; type: 'close' }
  | { reason: string; sessionId: string; type: 'closed' };

export function encodeTerminalMessage(message: TerminalMessage): string {
  return JSON.stringify(message);
}

export function decodeTerminalMessage(raw: string): TerminalMessage {
  return JSON.parse(raw) as TerminalMessage;
}

export function terminalWsUrl(
  token: string,
  origin = window.location.origin,
): string {
  const url = new URL('/api/system/terminal/connect', origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
}
