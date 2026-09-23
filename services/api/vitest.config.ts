import 'dotenv/config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
    // Integration scenarios that materialize tournament matches can exceed
    // Vitest's 5s default while still completing successfully on the shared
    // test database.
    testTimeout: 15_000,
    hookTimeout: 30_000,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
