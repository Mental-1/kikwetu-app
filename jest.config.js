const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: [
    '/node_modules/(?!(@supabase|node-fetch)/)',
  ],
  transform: {
    '^.+\.(ts|tsx|js|jsx)$': 'babel-jest',
    '^.+\.mjs$': 'babel-jest',
    'node_modules/isows/(.*)': 'babel-jest',
  },
};

module.exports = createJestConfig(customJestConfig);