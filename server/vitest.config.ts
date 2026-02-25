import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude compiled dist output — these are duplicates of src tests
    // and cause inflated failure counts in the sequential (Tier-B) run.
    // GATE-TEST-001: exclude dist from test discovery.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'dist/**',
    ],
  },
});
