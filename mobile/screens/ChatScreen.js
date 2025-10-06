import React, { useState, useEffect, useRef } from 'react';
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
import io from 'socket.io-client';

// Определяем адрес сервера автоматически
const getServerUrl = () => {
  // Для веб-версии используем localhost или публичный URL
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    } else if (window.location.hostname.includes('render.com')) {
      return 'https://simple-messenger-7x2u.onrender.com'; // Render backend
    } else if (window.location.hostname.includes('serveo.net')) {
      return 'https://8f2b1687d1e0567a6b3ac5ad45ecbc5a.serveo.net'; // Serveo backend
    }
    return `http://${window.location.hostname}:3000`;
  }
  // Для мобильного приложения используем публичный сервер
  return 'https://simple-messenger-7x2u.onrender.com';
};

const SERVER_URL = getServerUrl();

export default function ChatScreen({ route }) {
  const { username } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Список популярных эмодзи
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😢', '🤔', '🤗', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '💪', '🦾', '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👯', '🧗', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '💢', '💨', '💤', '🕳️', '🎉', '🎊', '🙈', '🙉', '🙊', '💯', '💫', '⚡', '🔥', '💝', '🎁', '🎈', '🎀', '🎊', '🎉'];

  useEffect(() => {
    // Подключаемся к серверу
    socketRef.current = io(SERVER_URL);

    // Обработка подключения
    socketRef.current.on('connect', () => {
      console.log('Подключен к серверу');
      setIsConnected(true);

      // Сообщаем серверу о входе пользователя
      socketRef.current.emit('userJoin', username);
    });

    // Обработка отключения
    socketRef.current.on('disconnect', () => {
      console.log('Отключен от сервера');
      setIsConnected(false);
    });

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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  // Автоскролл к последнему сообщению (более консервативный)
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Простой scrollToEnd без лишних настроек
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = () => {
    if (!messageText.trim() || !isConnected) return;

    const currentTime = new Date().toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Отправляем сообщение на сервер
    socketRef.current.emit('sendMessage', {
      username: username,
      text: messageText.trim(),
      time: currentTime
    });

    setMessageText('');
    
    // Останавливаем индикатор печати при отправке сообщения
    socketRef.current.emit('stopTyping', { username: username });
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
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Статус подключения */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? `🟢 Онлайн • ${userCount} чел.` : '🔴 Соединение...'}
        </Text>
      </View>

      {/* Сообщение об ошибке */}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
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
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 18,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
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
    backgroundColor: '#2196F3',
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
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 4,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderTopWidth: 1,
    borderTopColor: '#2196F3',
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
});