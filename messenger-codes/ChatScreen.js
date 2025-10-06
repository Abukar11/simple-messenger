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
      return 'http://localhost:3001';
    } else if (window.location.hostname.includes('serveo.net')) {
      return 'https://8f2b1687d1e0567a6b3ac5ad45ecbc5a.serveo.net'; // Новый serveo backend
    }
    return `http://${window.location.hostname}:3001`;
  }
  // Для мобильного приложения используем новый serveo URL
  return 'https://8f2b1687d1e0567a6b3ac5ad45ecbc5a.serveo.net';
};

const SERVER_URL = getServerUrl();

export default function ChatScreen({ route }) {
  const { username } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

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
    socketRef.current.on('error', (error) => {
      console.error('Ошибка Socket.io:', error);
      Alert.alert('Ошибка соединения', 'Не удается подключиться к серверу');
    });

    // Очистка при размонтировании
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = () => {
    if (messageText.trim().length === 0) return;
    
    if (!isConnected) {
      Alert.alert('Ошибка', 'Нет соединения с сервером');
      return;
    }

    // Отправляем сообщение на сервер
    socketRef.current.emit('sendMessage', {
      username: username,
      text: messageText.trim(),
    });

    setMessageText('');
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Статус подключения */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isConnected ? `🟢 Онлайн • ${userCount} чел.` : '🔴 Соединение...'}
        </Text>
      </View>

      {/* Список сообщений */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Поле ввода */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Введите сообщение..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, messageText.trim().length === 0 && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={messageText.trim().length === 0}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 10,
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
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2196F3',
    borderRadius: 20,
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
});