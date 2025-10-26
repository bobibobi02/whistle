import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';
import { apiUrl } from '../constants/config';
import { colors, fonts, spacing } from '../constants/theme';

const SUBFORUMS = ['tech', 'gaming', 'news', 'funny', 'ask'];

export default function SubmitScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subforum, setSubforum] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !subforum.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Please fill out title, content and select a subforum.',
      });
    }

    try {
      setLoading(true);

      const res = await api.post('/api/post', {
        title: title.trim(),
        content: content.trim(),
        subforum,
      });

      if (res?.ok || res?.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Post submitted!',
        });
        setTitle('');
        setContent('');
        setSubforum('');
        navigation.navigate('Feed');
      } else {
        const text = await res.text?.();
        console.error('[Submit Error]', text);
        Toast.show({
          type: 'error',
          text1: 'Submit failed',
          text2: text || 'An unknown error occurred.',
        });
      }
    } catch (err) {
      console.error('Submit exception:', err);
      Toast.show({
        type: 'error',
        text1: 'Network error',
        text2: 'Please try again when online.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Create a Post</Text>

      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />

      <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
        <Text style={{ color: subforum ? colors.text : '#999', fontFamily: fonts.regular }}>
          {subforum ? `r/${subforum}` : 'Select a Subforum'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Content"
        value={content}
        onChangeText={setContent}
        multiline
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} />
      ) : (
        <Button title="Submit Post" color={colors.orange} onPress={handleSubmit} />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Subforum</Text>
            {SUBFORUMS.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.subforumItem}
                onPress={() => {
                  setSubforum(item);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.subforumText}>r/{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 20,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
    color: colors.teal,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
    color: colors.teal,
  },
  subforumItem: {
    paddingVertical: spacing.sm,
  },
  subforumText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  modalCancel: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.orange,
    textAlign: 'center',
    fontFamily: fonts.bold,
  },
});
