import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import api from '../services/api';
import { colors, fonts, spacing } from '../constants/theme';

export default function PostScreen({ route }) {
  const { id } = route.params;
  const [post, setPost] = useState(null);

  useEffect(() => {
    api.get(`/api/post/${id}`).then(setPost);
  }, [id]);

  if (!post) return <Text style={styles.loading}>Loading...</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>by {post.user.email}</Text>

      {post.mediaUrl && (
        <Image
          source={{ uri: post.mediaUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <Text style={styles.content}>{post.content}</Text>

      <Text style={styles.sectionTitle}>Comments</Text>
      {post.comments?.length > 0 ? (
        post.comments.map((c, i) => (
          <View key={i} style={styles.comment}>
            <Text style={styles.commentAuthor}>{c.user.email}</Text>
            <Text style={styles.commentText}>{c.text}</Text>
          </View>
        ))
      ) : (
        <Text>No comments yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  loading: {
    padding: spacing.md,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.teal,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  content: {
    fontSize: 16,
    fontFamily: fonts.regular,
    lineHeight: 24,
    marginBottom: spacing.lg,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
    color: colors.teal,
  },
  comment: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: colors.orange,
    marginBottom: 4,
    fontFamily: fonts.bold,
  },
  commentText: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
});
