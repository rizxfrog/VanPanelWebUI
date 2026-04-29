import { describe, expect, it } from 'vitest';

import { normalizeTerminalResponse } from './terminal';

describe('terminal api helpers', () => {
  it('unwraps standard backend envelopes', () => {
    expect(
      normalizeTerminalResponse({
        code: 0,
        data: [{ id: 'local', name: 'Local Shell', type: 'local' }],
        message: 'ok',
      }),
    ).toEqual([{ id: 'local', name: 'Local Shell', type: 'local' }]);
  });

  it('accepts legacy raw payloads', () => {
    expect(
      normalizeTerminalResponse([
        { id: 'local', name: 'Local Shell', type: 'local' },
      ]),
    ).toEqual([{ id: 'local', name: 'Local Shell', type: 'local' }]);
  });

  it('throws backend error messages', () => {
    expect(() =>
      normalizeTerminalResponse({
        code: 1,
        data: {},
        message: 'terminal service unavailable',
      }),
    ).toThrow('terminal service unavailable');
  });
});
