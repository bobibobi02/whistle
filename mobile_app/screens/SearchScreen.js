import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { apiUrl } from '../constants/config';
import { colors, fonts, spacing } from '../constants/theme';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const search = async () => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return;

    Keyboard.dismiss();
    setSearched(true);
    setIsLoading(true);

    const cacheKey = `search:${trimmedQuery}`;

    try {
      const res = await api.get(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
      const posts = res?.posts || [];
      setResults(posts);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(posts));
    } catch (err) {
      console.warn('API failed, loading from cache...', err);
      Toast.show({
        type: 'error',
        text1: 'Could not reach server',
        text2: 'Loaded from cache instead.',
      });
      const fallback = await AsyncStorage.getItem(cacheKey);
      setResults(fallback ? JSON.parse(fallback) : []);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search Posts</Text>

      <TextInput
        placeholder="Search by title or content..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
        style={styles.input}
        returnKeyType="search"
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: spacing.md }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={search}
          ListEmptyComponent={
            searched ? <Text style={styles.noResults}>No results found.</Text> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('Post', { id: item.id })}>
              <View style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.content}>
                  {item.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
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
  header: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.teal,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: 8,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    backgroundColor: '#fff',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderColor: colors.teal,
    borderWidth: 1,
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
  noResults: {
    textAlign: 'center',
    color: '#999',
    fontFamily: fonts.regular,
    marginTop: spacing.md,
  },
});
