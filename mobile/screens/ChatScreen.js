import React, { useState, useEffect, useRef } from 'react';
import { ACCENT_COLOR } from '../theme';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import io from 'socket.io-client';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Определяем адрес сервера - ТОЛЬКО продакшн для глобального доступа
const getServerUrl = () => {
  // ВСЕГДА используем продакшн сервер для доступа с любой сети
  const prodUrl = 'https://simple-messenger-7x2u.onrender.com';
  console.log('🌐 Подключение к глобальному серверу:', prodUrl);
  return prodUrl;
};

const SERVER_URL = getServerUrl();
console.log('🚀 SERVER_URL установлен:', SERVER_URL);

export default function ChatScreen({ route }) {
  const { username, room = 'main' } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true); // По умолчанию тёмная тема

  // State для голосовых сообщений
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState(null);
  const [playingSound, setPlayingSound] = useState(null);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Список популярных эмодзи
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😢', '🤔', '🤗', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '💪', '🦾', '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👯', '🧗', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '💢', '💨', '💤', '🕳️', '🎉', '🎊', '🙈', '🙉', '🙊', '💯', '💫', '⚡', '🔥', '💝', '🎁', '🎈', '🎀', '🎊', '🎉'];

  // Функция переключения темы
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  useEffect(() => {
    console.log('🔄 Начинаем подключение к серверу:', SERVER_URL);

    let connectionTimeout;
    let maxRetries = 3;
    let retryCount = 0;

    const connectWithRetry = () => {
      if (retryCount >= maxRetries) {
        setErrorMessage('Не удалось подключиться к серверу после нескольких попыток');
        return;
      }

      // Подключаемся к серверу
      socketRef.current = io(SERVER_URL, {
        timeout: 15000, // 15 секунд таймаут
        transports: ['websocket', 'polling'], // Разрешаем разные транспорты
        forceNew: true // Принудительно создаём новое соединение
      });

      // Таймаут для подключения
      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          console.log('⏰ Таймаут подключения, повторная попытка...');
          retryCount++;
          setErrorMessage(`Попытка подключения ${retryCount}/${maxRetries}...`);
          socketRef.current.disconnect();
          connectWithRetry();
        }
      }, 20000); // 20 секунд на подключение

      // Обработка подключения
      socketRef.current.on('connect', () => {
        console.log('✅ Подключен к серверу');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setErrorMessage(''); // Очищаем ошибки
        retryCount = 0; // Сбрасываем счётчик

        // Сообщаем серверу о входе в комнату
        socketRef.current.emit('joinRoom', { username, room });
      });

      // Обработка ошибок подключения
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Ошибка подключения:', error);
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        retryCount++;

        if (retryCount < maxRetries) {
          setErrorMessage(`Ошибка подключения. Попытка ${retryCount}/${maxRetries}...`);
          setTimeout(connectWithRetry, 3000); // Повторяем через 3 сек
        } else {
          setErrorMessage('Не удалось подключиться к серверу. Проверьте интернет.');
        }
      });

      // Обработка отключения
      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Отключен от сервера. Причина:', reason);
        setIsConnected(false);
        setErrorMessage('Соединение потеряно');

        // Автоматическое переподключение через 5 секунд
        setTimeout(() => {
          if (!isConnected) {
            console.log('🔄 Пытаемся переподключиться...');
            retryCount = 0;
            connectWithRetry();
          }
        }, 5000);
      });
    };

    // Начинаем подключение
    connectWithRetry();

    // Получение истории сообщений
    socketRef.current.on('messageHistory', (history) => {
      setMessages(history);
    });

    // Получение нового сообщения
    socketRef.current.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      // Можно добавить звуковое уведомление здесь для мобильных
    });

    // Обработка индикатора печати
    socketRef.current.on('userTyping', (data) => {
      setTypingUsers(prev => {
        if (!prev.includes(data.username) && data.username !== username) {
          return [...prev, data.username];
        }
        return prev;
      });
    });

    socketRef.current.on('userStoppedTyping', (data) => {
      setTypingUsers(prev => prev.filter(user => user !== data.username));
    });

    // Уведомления о пользователях
    socketRef.current.on('userJoined', (data) => {
      setUserCount(data.userCount);
    });

    socketRef.current.on('userLeft', (data) => {
      setUserCount(data.userCount);
    });

    socketRef.current.on('joinSuccess', (data) => {
      setUserCount(data.userCount);
    });

    // Обработка ошибок
    socketRef.current.on('error', (errorData) => {
      console.error('Ошибка Socket.io:', errorData);
      const message = errorData.message || 'Ошибка соединения';

      // Показываем ошибку пользователю
      setErrorMessage(message);

      // Для rate limit показываем дольше
      const timeout = errorData.type === 'rate_limit' ? 10000 : 5000;
      setTimeout(() => {
        setErrorMessage('');
      }, timeout);

      // Дополнительное уведомление для rate limit
      if (errorData.type === 'rate_limit') {
        Alert.alert(
          '⚠️ Лимит сообщений',
          `Слишком много сообщений! Попробуйте через ${errorData.resetIn} секунд.`,
          [{ text: 'OK' }]
        );
      }
    });

    // Очистка при размонтировании
    return () => {
      // Очищаем все таймеры
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }

      // Отключаем сокет
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username, room]);

  // Автоскролл к последнему сообщению (более консервативный)
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Простой scrollToEnd без лишних настроек
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim() || !isConnected) return;

    const currentTime = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Отправляем сообщение на сервер
    try {
      const res = await fetch(`${SERVER_URL}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ room, text: messageText.trim(), type: 'text' })
      });
      const data = await res.json();
      if (data.success) {
        setMessageText('');
        // После отправки — обновляем историю
        const res2 = await fetch(`${SERVER_URL}/api/messages?room=${room}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data2 = await res2.json();
        if (data2.success && Array.isArray(data2.messages)) {
          setMessages(data2.messages);
        }
      } else {
        Alert.alert('Ошибка', data.error || 'Ошибка отправки сообщения');
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Ошибка сети или сервера');
    }

    setMessageText('');

    // Останавливаем индикатор печати при отправке сообщения
    socketRef.current.emit('stopTyping', { username: username });
  };

  // Функция принудительного переподключения
  const forceReconnect = () => {
    console.log('🔄 Принудительное переподключение...');
    setErrorMessage('Переподключение...');
    setIsConnected(false);

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Небольшая задержка перед переподключением
    setTimeout(() => {
      // Пересоздаём подключение
      socketRef.current = io(SERVER_URL, {
        timeout: 15000,
        transports: ['websocket', 'polling'],
        forceNew: true
      });

      // Обработчики событий (копируем основные)
      socketRef.current.on('connect', () => {
        console.log('✅ Переподключен к серверу');
        setIsConnected(true);
        setErrorMessage('');
        socketRef.current.emit('userJoin', username);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Ошибка переподключения:', error);
        setErrorMessage('Не удалось переподключиться');
      });

      // Добавляем остальные обработчики
      socketRef.current.on('messageHistory', (history) => {
        setMessages(history);
      });

      socketRef.current.on('newMessage', (message) => {
        setMessages(prev => [...prev, message]);
      });

      socketRef.current.on('userJoined', (data) => {
        setUserCount(data.userCount);
      });

      socketRef.current.on('userLeft', (data) => {
        setUserCount(data.userCount);
      });
    }, 1000);
  };

  // Функции для голосовых сообщений (минимальная реализация воспроизведения)
  const startRecording = async () => {
    Alert.alert('Голосовые сообщения', 'Функция записи пока не реализована в мобильном клиенте');
  };

  const stopRecording = async () => {
    Alert.alert('Голосовые сообщения', 'Функция записи пока не реализована в мобильном клиенте');
  };

  const sendVoiceMessage = async (audioUri) => {
    Alert.alert('Голосовые сообщения', 'Отправка голосовых сообщений с клиента в разработке');
  };

  const cancelRecording = async () => {
    Alert.alert('Голосовые сообщения', 'Отмена записи');
  };

  const playVoiceMessage = async (audioUrlOrData) => {
    try {
      // Если уже играет звук — остановим и освободим
      if (playingSound) {
        await playingSound.unloadAsync();
        setPlayingSound(null);
        // Если кликнули повторно на тот же файл — просто остановим
        return;
      }

      // Создаём новый Sound объект
      const { sound } = await Audio.Sound.createAsync(
        // Если пришла data: URI (base64), нужно сначала записать в файл
        (async () => {
          if (typeof audioUrlOrData === 'string' && audioUrlOrData.startsWith('data:')) {
            // Запишем в cacheDirectory
            const extension = audioUrlOrData.match(/data:audio\/(\w+);base64,/)?.[1] || 'webm';
            const filename = `${FileSystem.cacheDirectory}voice_${Date.now()}.${extension}`;
            // Извлекаем только base64 часть
            const base64 = audioUrlOrData.split(',')[1] || '';
            await FileSystem.writeAsStringAsync(filename, base64, { encoding: FileSystem.EncodingType.Base64 });
            return { uri: filename };
          }
          // Обычный URL
          return { uri: audioUrlOrData };
        })()
      );

      setPlayingSound(sound);
      await sound.playAsync();

      // Освобождение после окончания
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch (e) {
            // ignore
          }
          setPlayingSound(null);
        }
      });
    } catch (error) {
      console.error('Ошибка воспроизведения голосового сообщения в мобильном клиенте:', error);
      Alert.alert('Ошибка', 'Не удалось воспроизвести голосовое сообщение');
      try {
        if (playingSound) {
          await playingSound.unloadAsync();
        }
      } catch (e) {
        // ignore
      }
      setPlayingSound(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextChange = (text) => {
    setMessageText(text);

    // Отправляем событие начала печати
    if (text.trim() && isConnected) {
      socketRef.current.emit('typing', { username: username });

      // Очищаем предыдущий таймер
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Устанавливаем новый таймер для остановки печати
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stopTyping', { username: username });
      }, 1000); // Останавливаем через 1 секунду бездействия
    } else {
      // Если поле пустое, останавливаем печать
      socketRef.current.emit('stopTyping', { username: username });
    }
  };

  // Функции для работы с эмодзи
  const toggleEmojiPanel = () => {
    setShowEmojiPanel(!showEmojiPanel);
  };

  const addEmoji = (emoji) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPanel(false); // Закрываем панель после выбора
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.username === username;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        {!isMyMessage && (
          <Text style={styles.messageUsername}>{item.username}</Text>
        )}

        {/* Обычное текстовое сообщение */}
        {item.type !== 'voice' && (
          <Text style={styles.messageText}>{item.text}</Text>
        )}

        {/* Голосовое сообщение */}
        {item.type === 'voice' && item.audioUrl && (
          <View style={styles.voiceMessage}>
            <TouchableOpacity
              style={styles.voicePlayButton}
              onPress={() => playVoiceMessage(item.audioUrl)}
            >
              <Text style={styles.voicePlayIcon}>▶️</Text>
            </TouchableOpacity>
            <View style={styles.voiceWaveform}>
              <Text style={styles.voiceText}>🎤 Голосовое сообщение</Text>
            </View>
          </View>
        )}

        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    );
  };

  return (
    <View style={isDarkTheme ? styles.containerDark : styles.container}>
      {/* Статус подключения */}
      <View style={isDarkTheme ? styles.statusBarDark : styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected
            ? `🟢 Онлайн • ${userCount} чел.`
            : errorMessage
              ? '🔴 Ошибка подключения'
              : '🟡 Подключение...'}
        </Text>
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleText}>
            {isDarkTheme ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Отладочная информация */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>🌐 Глобальный сервер: {SERVER_URL}</Text>
        <Text style={styles.debugText}>📡 Работает с любой Wi-Fi сети</Text>
      </View>

      {/* Сообщение об ошибке */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={forceReconnect}
          >
            <Text style={styles.retryButtonText}>🔄 Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Основной контент */}
      <View style={{ flex: 1 }}>
        {/* Список сообщений */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Индикатор печати */}
        {typingUsers.length > 0 && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {typingUsers.length === 1
                ? `${typingUsers[0]} печатает...`
                : `${typingUsers.length} пользователей печатают...`
              }
            </Text>
          </View>
        )}
      </View>

      {/* Поле ввода - ВСЕГДА ВИДИМОЕ */}
      <View style={styles.inputContainer}>
        {/* Панель записи голосового сообщения */}
        {isRecording && (
          <View style={styles.voiceRecordingPanel}>
            <Text style={styles.voiceRecordingText}>🎤 Запись... {formatTime(recordingTime)}</Text>
            <View style={styles.voiceControls}>
              <TouchableOpacity
                style={styles.voiceControlButton}
                onPress={stopRecording}
              >
                <Text style={styles.voiceControlText}>Отправить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voiceControlButton, styles.voiceCancelButton]}
                onPress={cancelRecording}
              >
                <Text style={styles.voiceControlText}>Отменить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Эмодзи панель */}
        {showEmojiPanel && (
          <View style={styles.emojiPanel}>
            <FlatList
              data={emojis}
              numColumns={8}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiButton}
                  onPress={() => addEmoji(item)}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.emojiGrid}
            />
          </View>
        )}

        {/* Строка ввода */}
        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.emojiToggle}
            onPress={toggleEmojiPanel}
          >
            <Text style={styles.emojiToggleText}>😀</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Введите сообщение..."
            value={messageText}
            onChangeText={handleTextChange}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[
              styles.voiceButton,
              isRecording && styles.voiceButtonRecording
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.voiceButtonText}>🎤</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || !isConnected) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || !isConnected}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Отладочная информация */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Поле ввода: '{messageText}' | Подключен: {isConnected ? 'Да' : 'Нет'} | Можно отправить: {messageText.trim() && isConnected ? 'Да' : 'Нет'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT_COLOR,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageUsername: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  // ПРОСТОЕ поле ввода
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20, // Отступ снизу для безопасной зоны
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  emojiToggle: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 22.5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emojiToggleText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 45,
  },
  sendButton: {
    width: 45,
    height: 45,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderTopWidth: 1,
    borderTopColor: ACCENT_COLOR,
  },
  debugText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
  },
  typingIndicator: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginBottom: 5,
    borderRadius: 15,
  },
  typingText: {
    color: '#1976d2',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Стили для эмодзи панели
  emojiPanel: {
    backgroundColor: '#f9f9f9',
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 10,
  },
  emojiGrid: {
    paddingHorizontal: 10,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emojiToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  emojiToggleText: {
    fontSize: 20,
  },
  // Темная тема
  containerDark: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  statusBarDark: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themeToggleText: {
    color: '#fff',
    fontSize: 16,
  },
  messageContainerDark: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  myMessageDark: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
  },
  otherMessageDark: {
    alignSelf: 'flex-start',
    backgroundColor: '#424242',
    borderWidth: 1,
    borderColor: '#555',
  },
  messageUsernameDark: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b0b0b0',
    marginBottom: 4,
  },
  messageTextDark: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 20,
  },
  messageTimeDark: {
    fontSize: 11,
    color: '#b0b0b0',
    marginTop: 4,
    textAlign: 'right',
  },

  // Стили для голосовых сообщений
  voiceRecordingPanel: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceRecordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  voiceControls: {
    flexDirection: 'row',
    gap: 10,
  },
  voiceControlButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  voiceCancelButton: {
    backgroundColor: '#dc3545',
  },
  voiceControlText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceButton: {
    backgroundColor: '#4CAF50',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  voiceButtonRecording: {
    backgroundColor: '#f44336',
  },
  voiceButtonText: {
    fontSize: 18,
  },
  voiceMessage: {
    backgroundColor: '#e9f3ea',
    borderColor: ACCENT_COLOR,
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  voicePlayButton: {
    backgroundColor: ACCENT_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voicePlayIcon: {
    fontSize: 16,
  },
  voiceWaveform: {
    flex: 1,
  },
  voiceText: {
    fontSize: 14,
    color: ACCENT_COLOR,
  },
});