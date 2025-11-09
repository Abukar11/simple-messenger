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
import * as DocumentPicker from 'expo-document-picker';
import { ACCENT_COLOR } from '../theme';

// Определяем адрес сервера автоматически
const getServerUrl = () => {
  // Для веб-версии используем localhost или публичный URL
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    } else if (window.location.hostname.includes('serveo.net')) {
      // Используем новую безопасную ссылку serveo
      return window.location.origin;
    }
    return `http://${window.location.hostname}:3001`;
  }
  // Для мобильного приложения используем безопасный публичный URL
  // ВРЕМЕННАЯ ССЫЛКА - будет обновляться при перезапуске
  return 'https://YOUR_SERVEO_LINK_HERE.serveo.net';
};

const SERVER_URL = getServerUrl();

export default function ChatScreen({ route }) {
  const { username } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('🔗 Подключение к серверу:', SERVER_URL);

    socketRef.current = io(SERVER_URL);

    // Подключение к серверу
    socketRef.current.on('connect', () => {
      console.log('✅ Подключен к серверу');
      setIsConnected(true);

      // Сообщаем серверу о входе пользователя
      socketRef.current.emit('userJoin', username);
    });

    // Отключение от сервера
    socketRef.current.on('disconnect', () => {
      console.log('❌ Отключен от сервера');
      setIsConnected(false);
    });

    // Получение истории сообщений
    socketRef.current.on('messageHistory', (history) => {
      console.log('📚 Получена история сообщений:', history.length);
      setMessages(history);
    });

    // Получение новых сообщений
    socketRef.current.on('newMessage', (message) => {
      console.log('💬 Новое сообщение:', message);
      setMessages(prev => [...prev, message]);
    });

    // Пользователь присоединился
    socketRef.current.on('userJoined', (data) => {
      setOnlineUsers(data.users);
    });

    socketRef.current.on('userLeft', (data) => {
      setOnlineUsers(data.users);
    });

    socketRef.current.on('joinSuccess', (data) => {
      setOnlineUsers(data.users);
    });

    // Обработка ошибок
    socketRef.current.on('error', (error) => {
      console.error('❌ Ошибка Socket.IO:', error);
      Alert.alert('Ошибка', 'Проблема с подключением к серверу');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  const sendMessage = () => {
    if (message.trim() && socketRef.current && isConnected) {
      console.log('📤 Отправка сообщения:', message);
      socketRef.current.emit('sendMessage', {
        text: message,
        username: username,
        timestamp: new Date().toISOString()
      });
      setMessage('');
    } else if (!isConnected) {
      Alert.alert('Ошибка', 'Не подключен к серверу');
    }
  };

  const [uploading, setUploading] = useState(false);

  const pickAndUploadFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.type === 'cancel') return;

      setUploading(true);

      const uri = res.uri;
      const name = res.name || 'file';
      const mimeType = res.mimeType || 'application/octet-stream';

      const formData = new FormData();
      // In React Native / Expo, append file like this
      formData.append('file', {
        uri,
        name,
        type: mimeType,
      });

      const response = await fetch(`${SERVER_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        // Do not set Content-Type; let fetch set the boundary
      });

      const json = await response.json();
      setUploading(false);

      if (json && json.success) {
        // Emit a message with attachment metadata
        socketRef.current.emit('sendMessage', {
          text: '',
          username,
          timestamp: new Date().toISOString(),
          attachmentUrl: json.url,
          filename: json.filename || json.storedFilename,
          mimetype: json.mimetype || json.type,
        });
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить файл');
      }
    } catch (err) {
      setUploading(false);
      console.error('Upload error', err);
      Alert.alert('Ошибка', 'Проблема при загрузке файла');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.username === username ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={styles.messageHeader}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Статус подключения */}
      <View style={[styles.statusBar, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
        <Text style={styles.statusText}>
          {isConnected ? '🟢 Подключен' : '🔴 Подключение...'}
        </Text>
        <Text style={styles.statusText}>
          Онлайн: {onlineUsers.length}
        </Text>
      </View>

      {/* Список сообщений */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        style={styles.messagesList}
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Поле ввода */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Введите сообщение..."
          placeholderTextColor="#999"
          multiline
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.fileButton, { marginRight: 8 }]}
            onPress={pickAndUploadFile}
            disabled={uploading || !isConnected}
          >
            <Text style={styles.sendButtonText}>📎</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5 }]}
            onPress={sendMessage}
            disabled={!message.trim() || !isConnected}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT_COLOR,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: ACCENT_COLOR,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: ACCENT_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});