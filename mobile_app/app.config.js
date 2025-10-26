// app.config.js
import 'dotenv/config';
import { version } from './package.json';

export default {
  expo: {
    name: "Whistle",
    slug: "whistle",
    version,
    orientation: "portrait",
    platforms: ["ios", "android"],
    scheme: "whistleapp",
    entryPoint: "./AppEntry.js",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.bobi02.whistle",
      permissions: ["NOTIFICATIONS"]
    },
    ios: {
      bundleIdentifier: "com.bobi02.whistle",
      supportsTablet: true,
      buildNumber: "3",
      infoPlist: {
        NSNotificationsUsageDescription: "This app uses push notifications to keep you updated.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    extra: {
      // ✅ Expo public env var for API URL
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "https://whistle-api.bobi02.com",
      environment: process.env.APP_ENV || "production",
      version,
      eas: {
        projectId: "1c9b1e72-7b52-4f51-81f2-0567af3dd9b7"
      }
    },
    plugins: [
      "expo-font",
      "expo-notifications"
    ],
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: ["**/*"],
    runtimeVersion: {
      policy: "sdkVersion"
    }
  }
};
