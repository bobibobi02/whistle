import Constants from 'expo-constants';

const API_URL = Constants.manifest.extra.apiUrl;

export default {
  get: async (path) => {
    const res = await fetch(`${API_URL}${path}`, { credentials: 'include' });
    return res.json();
  },
  post: async (path, body) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return res;
  }
};
