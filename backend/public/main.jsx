const { useState, useEffect, useRef } = React;

function App() {
    const [currentUser, setCurrentUser] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [userCount, setUserCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showEmojiPanel, setShowEmojiPanel] = useState(false);

    // State для голосовых сообщений
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [playingAudio, setPlayingAudio] = useState(null);

    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const recordingIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

    // Список популярных эмодзи
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '😢', '🤔', '🤗', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '💪', '🦾', '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👯', '🧗', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '💫', '⭐', '🌟', '💥', '💯', '💢', '💨', '💤', '🕳️', '🎉', '🎊', '🙈', '🙉', '🙊', '💯', '💫', '⚡', '🔥', '💝', '🎁', '🎈', '🎀', '🎊', '🎉'];

    // Функция для воспроизведения звука уведомления
    const playNotificationSound = () => {
        try {
            // Создаем звук уведомления с помощью Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Звук недоступен:', error);
        }
    };

    useEffect(() => {
        // Подключение к серверу
        socketRef.current = io();

        socketRef.current.on('connect', () => {
            console.log('Подключен к серверу');
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Отключен от сервера');
            setIsConnected(false);
        });

        socketRef.current.on('messageHistory', (history) => {
            setMessages(history);
        });

        socketRef.current.on('newMessage', (message) => {
            setMessages(prev => [...prev, message]);
            // Воспроизводим звук только если сообщение не от текущего пользователя
            if (message.username !== currentUser) {
                playNotificationSound();
            }
        });

        socketRef.current.on('userJoined', (data) => {
            setUserCount(data.userCount);
        });

        socketRef.current.on('userLeft', (data) => {
            setUserCount(data.userCount);
        });

        socketRef.current.on('userTyping', (data) => {
            setTypingUsers(prev => {
                if (!prev.includes(data.username) && data.username !== currentUser) {
                    return [...prev, data.username];
                }
                return prev;
            });
        });

        socketRef.current.on('userStoppedTyping', (data) => {
            setTypingUsers(prev => prev.filter(user => user !== data.username));
        });

        socketRef.current.on('joinSuccess', (data) => {
            setUserCount(data.userCount);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleLogin = (username) => {
        if (username.trim()) {
            setCurrentUser(username.trim());
            setIsLoggedIn(true);
            socketRef.current.emit('userJoin', username.trim());
        }
    };

    const sendMessage = () => {
        if (messageText.trim() && isConnected) {
            const currentTime = new Date().toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            socketRef.current.emit('sendMessage', {
                username: currentUser,
                text: messageText.trim(),
                time: currentTime
            });
            setMessageText('');
            // Останавливаем индикатор печати при отправке сообщения
            socketRef.current.emit('stopTyping', { username: currentUser });
        }
    };

    // Функции для голосовых сообщений
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            setMediaRecorder(recorder);
            setAudioChunks([]);
            setIsRecording(true);
            setRecordingTime(0);

            // Запускаем таймер
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setAudioChunks(prev => [...prev, event.data]);
                }
            };

            recorder.start();
        } catch (error) {
            console.error('Ошибка доступа к микрофону:', error);
            alert('Не удалось получить доступ к микрофону');
        }
    };

    const sendVoiceMessage = async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append('voice', audioBlob, 'voice-message.webm');

            const response = await fetch('/api/upload-voice', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const currentTime = new Date().toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                socketRef.current.emit('sendMessage', {
                    username: currentUser,
                    text: '🎤 Голосовое сообщение',
                    audioUrl: result.audioUrl,
                    time: currentTime,
                    type: 'voice'
                });
            }
        } catch (error) {
            console.error('Ошибка отправки голосового сообщения:', error);
            alert('Ошибка отправки голосового сообщения');
        }
    };

    const handleVoiceSend = () => {
        if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendVoiceMessage(audioBlob);
            setAudioChunks([]);
            setRecordingTime(0);
        } else {
            // Если нет данных, останавливаем запись и отправляем
            stopRecording();
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingIntervalRef.current);

            // Останавливаем все аудио треки
            mediaRecorder.stream.getTracks().forEach(track => track.stop());

            // Ждем немного и отправляем
            setTimeout(() => {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    sendVoiceMessage(audioBlob);
                    setAudioChunks([]);
                    setRecordingTime(0);
                }
            }, 100);
        }
    };

    const handleVoiceCancel = () => {
        setAudioChunks([]);
        setRecordingTime(0);
        setIsRecording(false);
        clearInterval(recordingIntervalRef.current);

        if (mediaRecorder) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    // Загрузка и отправка файла/изображения
    const handleFileChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file, file.name);

            const resp = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await resp.json();
            if (!result || !result.success) {
                alert('Ошибка загрузки файла');
                return;
            }

            // Определяем тип вложения по mimetype
            const mimetype = result.mimetype || file.type || '';
            let msgType = 'file';
            if (mimetype.startsWith('image/')) msgType = 'image';
            else if (mimetype.startsWith('audio/')) msgType = 'voice';

            const currentTime = new Date().toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Отправляем сообщение с вложением
            socketRef.current.emit('sendMessage', {
                username: currentUser,
                text: msgType === 'file' ? result.filename : (msgType === 'image' ? '📷 Изображение' : '🎤 Аудио'),
                attachmentUrl: result.url,
                attachmentType: msgType,
                filename: result.filename,
                mimetype: result.mimetype,
                type: msgType,
                time: currentTime
            });

            // Сбрасываем input
            e.target.value = '';
        } catch (err) {
            console.error('Ошибка при загрузке файла:', err);
            alert('Ошибка при загрузке файла');
        }
    };

    const playVoiceMessage = (audioUrl) => {
        if (playingAudio) {
            playingAudio.pause();
            setPlayingAudio(null);
        }

        const audio = new Audio(audioUrl);
        audio.play();
        setPlayingAudio(audio);

        audio.onended = () => {
            setPlayingAudio(null);
        };
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleInputChange = (e) => {
        setMessageText(e.target.value);

        // Отправляем событие начала печати
        if (e.target.value.trim() && isConnected) {
            socketRef.current.emit('typing', { username: currentUser });

            // Очищаем предыдущий таймер
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Устанавливаем новый таймер для остановки печати
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit('stopTyping', { username: currentUser });
            }, 1000); // Останавливаем через 1 секунду бездействия
        } else {
            // Если поле пустое, останавливаем печать
            socketRef.current.emit('stopTyping', { username: currentUser });
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (isLoggedIn) {
                sendMessage();
            } else {
                handleLogin(e.target.value);
            }
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

    if (!isLoggedIn) {
        return (
            <div className="app-container">
                <div className="login-container">
                    <h1>�‍⬛ Raven</h1>
                    <p style={{ color: '#666', margin: '20px 0' }}>
                        Введите ваше имя для входа в чат
                    </p>
                    <input
                        type="text"
                        placeholder="Ваше имя..."
                        className="login-input"
                        onKeyPress={handleKeyPress}
                        maxLength={20}
                    />
                    <div style={{ fontSize: '14px', color: '#999' }}>
                        {isConnected ? '🟢 Подключено к серверу' : '🔴 Подключение...'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="header">
                <h1>�‍⬛ Raven</h1>
                <div>Добро пожаловать, {currentUser}!</div>
            </div>

            <div className="status">
                {isConnected ? `🟢 Онлайн • ${userCount} человек` : '🔴 Соединение...'}
            </div>

            <div className="messages-container">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message ${message.username === currentUser ? 'my' : 'other'}`}
                    >
                        {message.username !== currentUser && (
                            <div className="message-username">{message.username}</div>
                        )}

                        {/* Обычное текстовое сообщение */}
                        {message.type !== 'voice' && (
                            <div className="message-text">{message.text}</div>
                        )}

                        {/* Голосовое сообщение */}
                        {message.type === 'voice' && message.audioUrl && (
                            <div className="voice-message">
                                <div className="voice-player">
                                    <button
                                        className="voice-play-btn"
                                        onClick={() => playVoiceMessage(message.audioUrl)}
                                        title="Воспроизвести"
                                    >
                                        ▶️
                                    </button>
                                    <div className="voice-waveform">
                                        <div className="voice-progress" style={{ width: '0%' }}></div>
                                    </div>
                                    <span className="voice-duration">🎤</span>
                                </div>
                            </div>
                        )}

                        <div className="message-time">{message.time}</div>
                    </div>
                ))}

                {/* Индикатор печати */}
                {typingUsers.length > 0 && (
                    <div className="typing-indicator">
                        <span className="typing-dots">
                            {typingUsers.length === 1
                                ? `${typingUsers[0]} печатает...`
                                : `${typingUsers.length} пользователей печатают...`
                            }
                        </span>
                        <div className="typing-animation">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                {/* Панель записи голосового сообщения */}
                {isRecording && (
                    <div className="voice-recording-panel">
                        <span>🎤 Запись голосового сообщения...</span>
                        <span className="voice-timer">{formatTime(recordingTime)}</span>
                        <div className="voice-controls">
                            <button
                                className="voice-control-btn voice-send-btn"
                                onClick={handleVoiceSend}
                            >
                                Отправить
                            </button>
                            <button
                                className="voice-control-btn voice-cancel-btn"
                                onClick={handleVoiceCancel}
                            >
                                Отменить
                            </button>
                        </div>
                    </div>
                )}

                {/* Панель эмодзи */}
                {showEmojiPanel && (
                    <div className="emoji-panel">
                        {emojis.map((emoji, index) => (
                            <span
                                key={index}
                                className="emoji-button"
                                onClick={() => addEmoji(emoji)}
                            >
                                {emoji}
                            </span>
                        ))}
                    </div>
                )}

                {/* Строка ввода */}
                <div className="input-row">
                    {/* Скрытый input для файлов */}
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                    <button
                        className="file-button"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        title="Прикрепить файл"
                    >
                        📎
                    </button>
                    <button
                        className="emoji-toggle"
                        onClick={toggleEmojiPanel}
                        title="Добавить эмодзи"
                    >
                        😀
                    </button>
                    <input
                        type="text"
                        placeholder="Введите сообщение..."
                        value={messageText}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        className="input-field"
                        maxLength={500}
                    />
                    <button
                        className={`voice-button ${isRecording ? 'recording' : ''}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? "Остановить запись" : "Записать голосовое сообщение"}
                    >
                        🎤
                    </button>
                    <button
                        onClick={sendMessage}
                        disabled={!messageText.trim() || !isConnected}
                        className="send-button"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
