import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Email and password are required.',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/api/auth/callback/credentials', {
        email,
        password,
      });

      // Handle if response body is HTML instead of JSON
      const contentType = response.headers.get('content-type') || '';
      const isJSON = contentType.includes('application/json');

      if (!response.ok) {
        const text = isJSON ? await response.json() : await response.text();
        const message = isJSON ? text?.message || 'Invalid credentials' : text;
        Toast.show({
          type: 'error',
          text1: 'Login failed',
          text2: message,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Login successful',
      });
      navigation.replace('Home');
    } catch (err) {
      console.error('Login exception:', err);
      Toast.show({
        type: 'error',
        text1: 'Network error',
        text2: 'Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In to Whistle</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#ff8c00" />
      ) : (
        <Button title="Sign In" onPress={signIn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginBottom: 12,
    padding: 8,
  },
});
