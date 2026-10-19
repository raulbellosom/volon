/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // pnpm keeps packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*))',
  ],
};
