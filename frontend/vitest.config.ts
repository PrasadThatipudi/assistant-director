import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      'react-native': path.join(root, 'vitest-shims/react-native.ts'),
      'react-native-safe-area-context': path.join(root, 'vitest-shims/react-native-safe-area-context.tsx'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    passWithNoTests: false,
    pool: 'forks',
    setupFiles: [path.join(root, 'vitest.setup.ts')],
  },
});
