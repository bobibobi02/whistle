import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import api from '../services/api';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async () => {
    // Placeholder: call your Next.js auth endpoint
    const res = await api.post('/api/auth/callback/credentials', { email, password });
    if (res.ok) {
      navigation.replace('Home');
    } else {
      alert('Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In to Whistle</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input}/>
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input}/>
      <Button title="Sign In" onPress={signIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:16 },
  title: { fontSize:24, marginBottom:16, textAlign:'center' },
  input: { borderWidth:1, borderColor:'#ccc', borderRadius:4, marginBottom:12, padding:8 }
});
