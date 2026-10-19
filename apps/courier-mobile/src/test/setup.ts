// Screen tests render real navigation; native-only modules get their official Jest mocks.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
