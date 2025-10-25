import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';
import { colors, fonts, spacing } from '../constants/theme';

export default function EditProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await api.get('/api/user/me');
        setUsername(user.username || '');
        setBio(user.bio || '');
      } catch (err) {
        Alert.alert('Error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    if (!username.trim()) {
      return Alert.alert('Missing Username', 'Username cannot be empty.');
    }

    setSubmitting(true);
    try {
      await api.put('/api/user/me', { username, bio });
      Alert.alert('Success', 'Profile updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSubmitting(false);
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
      <Text style={styles.header}>Edit Profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Bio (optional)"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      {submitting ? (
        <ActivityIndicator color={colors.teal} />
      ) : (
        <Button title="Save Changes" color={colors.orange} onPress={handleSave} />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
    color: colors.teal,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
