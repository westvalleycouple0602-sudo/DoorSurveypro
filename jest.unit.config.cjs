const manifest = require('./tests/test-manifest.json');
const common = {
  roots: ['<rootDir>/server', '<rootDir>/shared', '<rootDir>/client/src', '<rootDir>/tests'],
  modulePathIgnorePatterns: ['<rootDir>/generated-artifacts/', '<rootDir>/.cache/',
    '<rootDir>/backups/', '<rootDir>/artifacts/', '<rootDir>/dist/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Type checking is a separate, mandatory CI gate (npm run check).
      tsconfig: { module: 'CommonJS', jsx: 'react-jsx', isolatedModules: true, esModuleInterop: true },
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFiles: ['<rootDir>/tests/setup/unit-env.cjs'],
};
module.exports = {
  projects: [
    { ...common, displayName: 'server-unit', testEnvironment: 'node',
      testMatch: manifest.jestServer.map(file => '<rootDir>/' + file) },
    { ...common, displayName: 'ui-unit', testEnvironment: 'jsdom',
      testMatch: manifest.jestBrowser.map(file => '<rootDir>/' + file),
      setupFilesAfterEnv: ['<rootDir>/client/src/tests/setup.ts'] },
  ],
};
