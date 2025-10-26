import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { colors, fonts, spacing } from '../constants/theme';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (!isRefreshing) setIsLoading(true);
      const userRes = await api.get('/api/user/me');
      const postsRes = await api.get('/api/user/posts');

      setUser(userRes || null);
      setPosts(postsRes || []);
    } catch (err) {
      console.error('Failed to load profile:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to load profile',
        text2: 'Check your connection and try again.',
      });
    } finally {
      if (!isRefreshing) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Logout failed',
        text2: 'Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Profile</Text>

      {user && (
        <>
          <View style={styles.userBox}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>u/{user.username}</Text>

            <Text style={styles.label}>Karma</Text>
            <Text style={styles.value}>{user.karma}</Text>

            <Text style={styles.label}>Joined</Text>
            <Text style={styles.value}>{user.joined}</Text>
          </View>

          <Text style={styles.sectionTitle}>Your Posts</Text>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchData();
            }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.content}>
                  {item.content}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.noPosts}>No posts yet.</Text>}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={handleEditProfile}>
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.logout]} onPress={handleLogout}>
              <Text style={[styles.buttonText, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 22,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
    color: colors.teal,
  },
  userBox: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.teal,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.teal,
  },
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderColor: colors.teal,
    borderWidth: 2,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: 4,
    color: colors.text,
  },
  content: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
  noPosts: {
    textAlign: 'center',
    color: '#999',
    fontFamily: fonts.regular,
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.lg,
  },
  button: {
    backgroundColor: colors.teal,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  logout: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.teal,
  },
  logoutText: {
    color: colors.teal,
  },
});
