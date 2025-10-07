import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function SimpleApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Simple Messenger</Text>
      <Text style={styles.subtitle}>Приложение запущено успешно!</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>✅ React Native работает</Text>
        <Text style={styles.statusText}>✅ Expo загружен</Text>
        <Text style={styles.statusText}>✅ Компоненты отображаются</Text>
      </View>
      
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Тест кнопки</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        Если вы видите этот экран, значит основа приложения работает корректно!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  statusText: {
    fontSize: 16,
    color: '#2e7d32',
    marginBottom: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});