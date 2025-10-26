import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export async function loadSession() {
  try {
    const session = await AsyncStorage.getItem('session');

    if (!session) {
      console.log('[loadSession] No session found in storage.');
      return;
    }

    const parsed = JSON.parse(session);
    console.log('[loadSession] Session loaded from storage:', parsed);

    const response = await api.get('/api/user/me');

    if (response?.username) {
      console.log('[loadSession] Session valid for user:', response.username);
      return response;
    } else {
      console.warn('[loadSession] Invalid session, removing...');
      await AsyncStorage.removeItem('session');
    }
  } catch (error) {
    console.warn('[loadSession] Error loading session:', error);
  }
}
