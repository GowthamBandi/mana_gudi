import { defineConfig } from "vitest/config";

// Security-rule tests share one emulator instance, so they must not run in
// parallel across files — a fileParallelism race shows up as flaky PERMISSION
// results that are very hard to read.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    pool: "forks",
  },
});
