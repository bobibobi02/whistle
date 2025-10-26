// constants/config.js
import Constants from 'expo-constants';

export function getApiUrl() {
  try {
    const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
    return extra.apiUrl || 'https://fallback-url.com';
  } catch (e) {
    console.warn('[config.js] Failed to load Constants.extra:', e);
    return 'https://fallback-url.com';
  }
}
