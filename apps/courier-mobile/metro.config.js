// Expo's default config already understands pnpm workspaces (watch folders and symlinks).
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
