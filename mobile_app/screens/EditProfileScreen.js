// screens/EditProfileScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { colors, fonts, spacing } from '../constants/theme';
import api from '../services/api';

export default function EditProfileScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      return Toast.show({
        type: 'error',
        text1: 'Missing Field',
        text2: 'Username cannot be empty.',
      });
    }

    try {
      setLoading(true);
      const res = await api.post('/api/user/update', { username });

      if (res.ok) {
        Toast.show({
          type: 'success',
          text1: 'Profile Updated',
          text2: `Username changed to ${username}`,
        });
        navigation.goBack();
      } else {
        const text = await res.text?.();
        Toast.show({
          type: 'error',
          text1: 'Update failed',
          text2: text || 'Something went wrong.',
        });
      }
    } catch (err) {
      console.warn('Update error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Edit Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Enter new username"
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} />
      ) : (
        <Button title="Save Changes" onPress={handleSave} color={colors.teal} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: 8,
    padding: spacing.sm,
    fontFamily: fonts.regular,
    backgroundColor: '#fff',
    marginBottom: spacing.md,
  },
});
