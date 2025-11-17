import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme';

const API_URL = 'http://192.168.0.30:3000'; // Замените на ваш IP

export default function PhoneAuthScreen({ navigation }) {
  const { theme } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('+7');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' или 'code'
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Шаг 1: Отправка кода на телефон
  const handleSendCode = async () => {
    if (phoneNumber.length < 11) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Код отправлен', 
          data.devCode 
            ? `Ваш код: ${data.devCode}\n(В разработке код показывается здесь)` 
            : 'SMS с кодом отправлен на ваш телефон'
        );
        setStep('code');
      } else {
        Alert.alert('Ошибка', data.error || 'Не удалось отправить код');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Шаг 2: Проверка кода
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6-значный код');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber, 
          code,
          username: username || phoneNumber.slice(-4) // Используем последние 4 цифры если имя не указано
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Сохраняем токен
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('username', data.username);

        // Переходим в чат
        navigation.replace('Chat', { username: data.username });
      } else {
        Alert.alert('Ошибка', data.error || 'Неверный код');
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 30,
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
      fontWeight: '600',
    },
    input: {
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    codeInput: {
      fontSize: 24,
      letterSpacing: 10,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    backButtonText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    hint: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        {step === 'phone' ? (
          // Шаг 1: Ввод номера телефона
          <>
            <Text style={styles.title}>📱 Вход по телефону</Text>
            <Text style={styles.subtitle}>
              Введите номер телефона для получения кода
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Номер телефона</Text>
              <TextInput
                style={styles.input}
                placeholder="+7 999 123 45 67"
                placeholderTextColor={theme.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoFocus
              />
              <Text style={styles.hint}>
                Формат: +7XXXXXXXXXX (с кодом страны)
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Получить код</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>
                ← Вернуться к обычному входу
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // Шаг 2: Ввод кода подтверждения
          <>
            <Text style={styles.title}>🔐 Подтверждение</Text>
            <Text style={styles.subtitle}>
              Введите код из SMS, отправленного на {phoneNumber}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Код из SMS</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ваше имя (опционально)</Text>
              <TextInput
                style={styles.input}
                placeholder="Как вас зовут?"
                placeholderTextColor={theme.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="words"
              />
              <Text style={styles.hint}>
                Если не указать, будет использован номер телефона
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Подтвердить</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setStep('phone');
                setCode('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
