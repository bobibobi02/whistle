// services/notifications.js
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Notification handler setup (safe fallback for SDK 53+)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    // Reject registration on simulators or Expo Go
    if (!Constants.isDevice) {
      console.warn('[Notification] Must use physical device for push notifications.');
      alert('Must use physical device for Push Notifications');
      return null;
    }

    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification] Permissions not granted.');
      alert('Failed to get push token for push notification!');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData?.data;
    if (!token) {
      console.warn('[Notification] No token received.');
      return null;
    }

    console.log('[Notification] Expo push token:', token);

    // Android-specific config
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (err) {
    console.error('[Notification] Error registering for push notifications:', err);
    return null;
  }
}
