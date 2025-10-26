import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';
import { loadSession } from './hooks/useSession';
import { registerForPushNotificationsAsync } from './services/notifications';
import { useFonts, NotoSans_400Regular } from '@expo-google-fonts/noto-sans';
import Toast from 'react-native-toast-message';
import { useOffline } from './hooks/useOffline';
import OfflineNotice from './components/OfflineNotice';

// Keep splash visible until the app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// Notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded] = useFonts({ NotoSans_400Regular });
  const isOffline = useOffline();

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await loadSession();
        await registerForPushNotificationsAsync();

        Notifications.addNotificationReceivedListener(notification => {
          const { title, body } = notification.request?.content ?? {};
          if (title || body) {
            alert(`📬 ${title ?? ''}\n\n${body ?? ''}`);
          }
        });
      } catch (err) {
        console.warn('❌ App initialization error:', err);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    prepareApp();
  }, []);

  if (!appIsReady || !fontsLoaded) return null;

  return (
    <>
      {isOffline && <OfflineNotice />}
      <AppNavigator />
      <Toast />
    </>
  );
}
