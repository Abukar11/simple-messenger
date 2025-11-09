import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENT_COLOR } from '../theme';
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
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState('main');
  const [isRegister, setIsRegister] = useState(false);

  const SERVER_URL = 'https://simple-messenger-7x2u.onrender.com';

  const handleAuth = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedRoom = room.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      Alert.alert('Ошибка', 'Имя должно быть от 3 до 50 символов');
      return;
    }
    if (trimmedPassword.length < 4 || trimmedPassword.length > 100) {
      Alert.alert('Ошибка', 'Пароль должен быть от 4 до 100 символов');
      return;
    }
    if (trimmedRoom.length === 0 || trimmedRoom.length > 100) {
      Alert.alert('Ошибка', 'Название комнаты обязательно и не должно превышать 100 символов');
      return;
    }
    try {
      const url = isRegister ? `${SERVER_URL}/api/register` : `${SERVER_URL}/api/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
      });
      const data = await res.json();
      if (!data.success || !data.token) {
        Alert.alert('Ошибка', data.error || 'Ошибка авторизации');
        return;
      }
      // Сохраняем токен
      await AsyncStorage.setItem('jwt', data.token);
      navigation.navigate('Chat', { username: trimmedUsername, room: trimmedRoom, token: data.token });
    } catch (e) {
      Alert.alert('Ошибка', 'Ошибка сети или сервера');
    }
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
          maxLength={50}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          maxLength={100}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Название комнаты (например, main, family, work...)"
          value={room}
          onChangeText={setRoom}
          maxLength={100}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="join"
          onSubmitEditing={handleJoinChat}
        />

        <TouchableOpacity
          style={[styles.button, (username.trim().length < 3 || password.trim().length < 4) && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={username.trim().length < 3 || password.trim().length < 4}
        >
          <Text style={styles.buttonText}>{isRegister ? 'Зарегистрироваться' : 'Войти'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#eee' }]}
          onPress={() => setIsRegister(!isRegister)}
        >
          <Text style={[styles.buttonText, { color: ACCENT_COLOR }]}>
            {isRegister ? 'У меня уже есть аккаунт' : 'Нет аккаунта? Зарегистрироваться'}
          </Text>
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
    color: ACCENT_COLOR,
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
    backgroundColor: ACCENT_COLOR,
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