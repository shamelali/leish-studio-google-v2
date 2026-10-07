import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'leish-studio-google/**'],
    // The suite boots the Express app and bcrypt seed hashes; give it room.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
