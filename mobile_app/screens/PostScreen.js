import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { apiUrl } from '../constants/config';
import { colors, fonts, spacing } from '../constants/theme';

export default function PostScreen({ route }) {
  const { id } = route.params || {};

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    if (!id) {
      Toast.show({
        type: 'error',
        text1: 'No post ID provided',
      });
      setLoadingPost(false);
      return;
    }

    console.log('[PostScreen] route.params:', route.params);

    const loadPost = async () => {
      try {
        const res = await api.get(`/api/post/${id}`);
        setPost(res);
      } catch (err) {
        console.warn('Failed to fetch post:', err);
        Toast.show({
          type: 'error',
          text1: 'Failed to load post',
        });
      } finally {
        setLoadingPost(false);
      }
    };

    const loadComments = async () => {
      try {
        const res = await api.get(`/api/post/${id}/comments`);
        setComments(res || []);
      } catch (err) {
        console.warn('Failed to fetch comments:', err);
        Toast.show({
          type: 'error',
          text1: 'Could not load comments',
        });
      } finally {
        setLoadingComments(false);
      }
    };

    loadPost();
    loadComments();
  }, [id]);

  if (loadingPost) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load post.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.meta}>Post ID: {id}</Text>
      <Text style={styles.meta}>by {post.user?.email ?? 'Unknown'}</Text>
      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.commentsSection}>
        <Text style={styles.sectionTitle}>Comments</Text>

        {loadingComments ? (
          <ActivityIndicator size="small" color={colors.teal} />
        ) : comments.length === 0 ? (
          <Text style={styles.noComments}>No comments yet.</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.id} style={styles.comment}>
              <Text style={styles.commentAuthor}>u/{comment.user?.username ?? 'anon'}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: 12,
    color: '#666',
    fontFamily: fonts.regular,
    marginBottom: spacing.sm,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.regular,
    color: colors.orange,
    fontSize: 16,
  },
  commentsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginBottom: spacing.sm,
    color: colors.teal,
  },
  noComments: {
    fontFamily: fonts.regular,
    color: '#999',
  },
  comment: {
    backgroundColor: '#fff',
    padding: spacing.sm,
    borderRadius: 8,
    borderColor: colors.teal,
    borderWidth: 1,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  commentAuthor: {
    fontFamily: fonts.bold,
    fontSize: 14,
    marginBottom: 4,
    color: colors.text,
  },
  commentText: {
    fontFamily: fonts.regular,
    color: colors.text,
  },
});
