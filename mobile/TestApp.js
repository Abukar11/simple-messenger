import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACCENT_COLOR } from './theme';

export default function TestApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Тестовое приложение работает!</Text>
      <Text style={styles.subtext}>Если вы видите этот текст, значит React Native запускается</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ACCENT_COLOR,
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});