import { describe, expect, it } from 'vitest';

import { formatBytes, formatPercent, stateTone } from './container-manager-utils';

describe('container-manager-utils', () => {
  it('formats bytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats percent', () => {
    expect(formatPercent(12.345)).toBe('12.35%');
  });

  it('maps state tone', () => {
    expect(stateTone('running')).toBe('success');
    expect(stateTone('exited')).toBe('default');
  });
});
