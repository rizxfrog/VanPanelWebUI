import { describe, expect, it } from 'vitest';

import { canEditFile, formatFileSize, joinPath } from './file-manager-utils';

describe('file-manager-utils', () => {
  it('formats file sizes', () => {
    expect(formatFileSize(12)).toBe('12 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('guards edit mode', () => {
    expect(canEditFile(null)).toBe(false);
    expect(
      canEditFile({ editable: true, is_dir: true, previewable: true } as any),
    ).toBe(false);
    expect(
      canEditFile({ editable: true, is_dir: false, previewable: true } as any),
    ).toBe(true);
  });

  it('joins paths without duplicate separators', () => {
    expect(joinPath('/tmp/', 'a.txt')).toBe('/tmp/a.txt');
  });
});
