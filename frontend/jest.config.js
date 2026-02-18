/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  coverageReporters: ['html', 'text-summary'],
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.d.ts'],
  // Extend preset default to also transform uuid (ships as ESM)
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|uuid))'],
};
