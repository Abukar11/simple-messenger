
export default function App() {
    const [username, setUsername] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (isLoggedIn && !socket) {
            const s = io();
            setSocket(s);

            s.emit('userJoin', username);

            s.on('userJoined', data => {
                // Получаем список пользователей (контактов)
                if (data && data.userList) {
                    setContacts(data.userList.filter(u => u !== username));
                }
            });

            s.on('messageHistory', setMessages);
            s.on('newMessage', msg => setMessages(prev => [...prev, msg]));
        }
    }, [isLoggedIn, socket, username]);

    const handleLogin = () => {
        if (username.trim().length > 1) setIsLoggedIn(true);
    };

    const handleSelectContact = contact => {
        setSelectedContact(contact);
        // Можно добавить логику для запроса истории приватного чата
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !socket || !selectedContact) return;
        socket.emit('sendMessage', {
            username,
            text: messageText,
            room: [username, selectedContact].sort().join('_'), // приватная комната
        });
        setMessageText('');
    };

    if (!isLoggedIn) {
        return (
            <div className="app-container">
                <div className="header">Raven Messenger</div>
                <div style={{ padding: 32 }}>
                    <input
                        type="text"
                        placeholder="Ваше имя"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        style={{ fontSize: 18, padding: 8, width: '60%' }}
                    />
                    <button onClick={handleLogin} style={{ marginLeft: 16, fontSize: 18 }}>
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <div className="header">Raven Messenger</div>
            <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ width: 220, borderRight: '1px solid #eee', padding: 16 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Контакты:</div>
                    {contacts.length === 0 && <div>Нет других пользователей</div>}
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {contacts.map(contact => (
                            <li key={contact}>
                                <button
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        marginBottom: 4,
                                        background: selectedContact === contact ? '#2E7D32' : '#f5f5f5',
                                        color: selectedContact === contact ? '#fff' : '#333',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => handleSelectContact(contact)}
                                >
                                    {contact}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                        {selectedContact ? `Чат с ${selectedContact}` : 'Выберите контакт для чата'}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8, background: '#fafafa', borderRadius: 8, padding: 8 }}>
                        {messages
                            .filter(m => selectedContact && [username, selectedContact].includes(m.username))
                            .map((msg, idx) => (
                                <div key={idx} style={{ marginBottom: 6 }}>
                                    <b>{msg.username}:</b> {msg.text}
                                </div>
                            ))}
                    </div>
                    {selectedContact && (
                        <div style={{ display: 'flex' }}>
                            <input
                                type="text"
                                value={messageText}
                                onChange={e => setMessageText(e.target.value)}
                                placeholder="Введите сообщение..."
                                style={{ flex: 1, fontSize: 16, padding: 8 }}
                            />
                            <button onClick={handleSendMessage} style={{ marginLeft: 8, fontSize: 16 }}>
                                Отправить
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
