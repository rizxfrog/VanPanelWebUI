import { describe, expect, it } from 'vitest';

import { normalizeContainerResponse } from './container';

describe('container api', () => {
  it('unwraps standard response envelopes', () => {
    expect(
      normalizeContainerResponse({ code: 0, data: [{ name: 'web' }] }),
    ).toEqual([{ name: 'web' }]);
  });

  it('throws backend messages from failed envelopes', () => {
    expect(() =>
      normalizeContainerResponse({
        code: 500,
        data: null,
        message: 'Docker unavailable',
      }),
    ).toThrow('Docker unavailable');
  });
});
