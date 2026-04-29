import { describe, expect, it } from 'vitest';

import {
  decodeTerminalMessage,
  encodeTerminalMessage,
  terminalWsUrl,
} from './terminal-protocol';

describe('terminal-protocol', () => {
  it('encodes input messages', () => {
    expect(
      encodeTerminalMessage({ type: 'input', sessionId: 's1', data: 'ls\r' }),
    ).toBe('{"type":"input","sessionId":"s1","data":"ls\\r"}');
  });

  it('decodes output messages', () => {
    expect(
      decodeTerminalMessage('{"type":"output","sessionId":"s1","data":"ok"}'),
    ).toEqual({ type: 'output', sessionId: 's1', data: 'ok' });
  });

  it('builds websocket url from current origin', () => {
    expect(terminalWsUrl('abc', 'http://localhost:5173')).toBe(
      'ws://localhost:5173/api/system/terminal/connect?token=abc',
    );
  });
});
