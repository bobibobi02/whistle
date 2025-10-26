import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { apiUrl } from '../constants/config';
import { colors, fonts, spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SavedPostsScreen({ navigation }) {
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSavedPosts = async () => {
    const cacheKey = 'cachedSavedPosts';
    try {
      const res = await api.get('/api/user/saved');
      const posts = res?.posts || [];
      setSavedPosts(posts);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(posts));
    } catch (err) {
      console.warn('[SavedPosts] API failed, loading from cache...', err);
      const fallback = await AsyncStorage.getItem(cacheKey);
      setSavedPosts(fallback ? JSON.parse(fallback) : []);
      Toast.show({
        type: 'error',
        text1: 'Offline mode',
        text2: 'Loaded saved posts from cache.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSavedPosts();
  }, []);

  const removeFromSaved = async (postId) => {
    try {
      await api.delete(`/api/user/saved/${postId}`);
      const updated = savedPosts.filter((p) => p.id !== postId);
      setSavedPosts(updated);
      await AsyncStorage.setItem('cachedSavedPosts', JSON.stringify(updated));
      Toast.show({
        type: 'success',
        text1: 'Removed from saved',
      });
    } catch (err) {
      console.error('[SavedPosts] Failed to remove:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove post.',
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Saved Posts</Text>

      <FlatList
        data={savedPosts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No saved posts yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Post', { id: item.id })}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.content}>
                {item.content}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => removeFromSaved(item.id)}>
              <Ionicons name="bookmark-outline" size={24} color={colors.orange} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.teal,
    marginBottom: spacing.md,
  },
  cardWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderColor: colors.teal,
    borderWidth: 1,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  card: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  content: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontFamily: fonts.regular,
    color: '#999',
  },
});
