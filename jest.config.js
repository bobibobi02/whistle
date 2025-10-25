// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFiles: [], // important: disables broken inherited config
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation)/)'
  ]
};
