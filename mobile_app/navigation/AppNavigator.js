// navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import SubmitScreen from '../screens/SubmitScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import PostScreen from '../screens/PostScreen';
import SavedPostsScreen from '../screens/SavedPostsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ✅ Deep linking config
const linking = {
  prefixes: ['whistleapp://'],
  config: {
    screens: {
      Auth: 'auth',
      Main: {
        screens: {
          Feed: '',
          Submit: 'submit',
          Search: 'search',
          Profile: 'profile/u/:username',
        },
      },
      Post: 'post/:id',
      Saved: 'saved',
      EditProfile: 'edit-profile',
    },
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Feed':
              iconName = 'home';
              break;
            case 'Submit':
              iconName = 'add-circle';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF8C00',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feed" component={HomeScreen} />
      <Tab.Screen name="Submit" component={SubmitScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="Post" component={PostScreen} />
        <Stack.Screen name="Saved" component={SavedPostsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
