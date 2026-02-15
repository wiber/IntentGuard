export default {
  test: {
    exclude: [
      'node_modules/**',
      'dist/**',
      'working-files/**',
    ],
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.{ts,js}',
    ],
    globals: true,
    testTimeout: 10000,
  },
};
