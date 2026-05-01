import { describe, expect, it } from 'vitest';

import { normalizeAgentResponse } from './agent';

describe('agent api helpers', () => {
  it('unwraps standard backend envelopes', () => {
    expect(
      normalizeAgentResponse({
        code: 0,
        data: { sessionId: 's1', intent: 'system_diagnosis' },
        message: 'ok',
      }),
    ).toEqual({ sessionId: 's1', intent: 'system_diagnosis' });
  });

  it('throws backend error messages', () => {
    expect(() =>
      normalizeAgentResponse({
        code: 1,
        data: {},
        message: 'agent planner is not configured',
      }),
    ).toThrow('agent planner is not configured');
  });
});
