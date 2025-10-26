import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../services/api'; // Using centralized API helper

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/api/feed').then(setPosts).catch((err) => {
      console.error('Failed to fetch posts:', err);
    });
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigation.navigate('Post', { id: item.id })}>
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
