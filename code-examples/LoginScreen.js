// 🔐 ЭКРАН ВХОДА В МЕССЕНДЖЕР
// Файл: mobile/screens/LoginScreen.js
// Описание: Красивый экран для ввода имени пользователя

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');

  const handleJoinChat = () => {
    if (username.trim().length === 0) {
      Alert.alert('Ошибка', 'Пожалуйста, введите ваше имя');
      return;
    }

    if (username.trim().length < 2) {
      Alert.alert('Ошибка', 'Имя должно содержать минимум 2 символа');
      return;
    }

    // Переходим на экран чата
    navigation.navigate('Chat', { username: username.trim() });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Добро пожаловать!</Text>
        <Text style={styles.subtitle}>Как вас зовут?</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Введите ваше имя..."
          value={username}
          onChangeText={setUsername}
          maxLength={20}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="join"
          onSubmitEditing={handleJoinChat}
        />
        
        <TouchableOpacity 
          style={[styles.button, username.trim().length < 2 && styles.buttonDisabled]}
          onPress={handleJoinChat}
          disabled={username.trim().length < 2}
        >
          <Text style={styles.buttonText}>Войти в чат</Text>
        </TouchableOpacity>
        
        <Text style={styles.info}>
          Это простой мессенджер для общения{'\n'}
          Все сообщения видны всем участникам
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2196F3',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});