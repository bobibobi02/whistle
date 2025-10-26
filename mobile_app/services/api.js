// services/api.js
import Constants from 'expo-constants';

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl;

if (!API_URL) {
  throw new Error('❌ Missing apiUrl in app.config.js → extra.apiUrl');
}

const headers = {
  'Content-Type': 'application/json',
};

export default {
  get: async (path) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GET ${path} failed:\n${text}`);
    }

    return response.json();
  },

  post: async (path, body) => {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('Content-Type');

    if (!response.ok) {
      const errorText = contentType?.includes('application/json')
        ? JSON.stringify(await response.json(), null, 2)
        : await response.text();
      throw new Error(`POST ${path} failed:\n${errorText}`);
    }

    return response.json(); // Expecting JSON response from API
  },
};
