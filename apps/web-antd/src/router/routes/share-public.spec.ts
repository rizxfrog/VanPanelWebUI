import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const routesDir = resolve(__dirname);

describe('public share route', () => {
  it('is registered as a core route before auth-only dynamic routes', () => {
    const coreRoutes = readFileSync(resolve(routesDir, 'core.ts'), 'utf8');
    const fileRoutes = readFileSync(
      resolve(routesDir, 'modules/files.ts'),
      'utf8',
    );

    expect(coreRoutes).toContain("name: 'ShareAccess'");
    expect(coreRoutes).toContain('ignoreAccess: true');
    expect(fileRoutes).not.toContain("name: 'ShareAccess'");
  });
});
