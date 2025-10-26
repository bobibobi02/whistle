import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../constants/theme';

export default function OfflineNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ You’re offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fee',
    padding: spacing.sm,
    alignItems: 'center',
  },
  text: {
    color: colors.orange,
    fontFamily: fonts.bold,
  },
});
