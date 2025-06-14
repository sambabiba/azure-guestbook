const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 임시 메모리 저장소 (나중에 Azure Cosmos DB로 교체)
let messages = [
    {
        id: 1,
        name: "관리자",
        message: "방명록에 오신 것을 환영합니다!",
        timestamp: new Date().toISOString(),
        reactions: {
            "👍": 0,
            "❤️": 0,
            "😊": 0,
            "🎉": 0,
            "😮": 0
        }
    }
];

// API 라우트
// 모든 메시지 조회
app.get('/api/messages', (req, res) => {
    res.json(messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// 새 메시지 추가
app.post('/api/messages', (req, res) => {
    const { name, message } = req.body;
    
    // 입력 검증
    if (!name || !message) {
        return res.status(400).json({ error: '이름과 메시지를 모두 입력해주세요.' });
    }
    
    if (name.length > 50 || message.length > 500) {
        return res.status(400).json({ error: '이름은 50자, 메시지는 500자 이내로 입력해주세요.' });
    }
    
    // 새 메시지 생성
    const newMessage = {
        id: Date.now(), // 임시 ID 생성
        name: name.trim(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        reactions: {
            "👍": 0,
            "❤️": 0,
            "😊": 0,
            "🎉": 0,
            "😮": 0
        }
    };
    
    messages.push(newMessage);
    res.status(201).json(newMessage);
});

// 메시지 삭제 (관리자 전용)
app.delete('/api/messages/:id', (req, res) => {
    const messageId = parseInt(req.params.id);
    const { password } = req.body;
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
    }
    
    // 관리자 인증만 허용
    const isAdmin = password === process.env.ADMIN_PASSWORD || password === 'admin123';
    
    if (!isAdmin) {
        return res.status(403).json({ error: '관리자만 삭제할 수 있습니다. 관리자 비밀번호를 입력해주세요.' });
    }
    
    const deletedMessage = messages.splice(messageIndex, 1)[0];
    res.json({ 
        message: '메시지가 삭제되었습니다.',
        deletedMessage: deletedMessage
    });
});

// 이모지 반응 추가/제거
app.post('/api/messages/:id/react', (req, res) => {
    const messageId = parseInt(req.params.id);
    const { emoji } = req.body;
    
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
        return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
    }
    
    const message = messages[messageIndex];
    
    // 허용된 이모지인지 확인
    const allowedEmojis = ["👍", "❤️", "😊", "🎉", "😮"];
    if (!allowedEmojis.includes(emoji)) {
        return res.status(400).json({ error: '허용되지 않은 이모지입니다.' });
    }
    
    // reactions 객체가 없으면 생성
    if (!message.reactions) {
        message.reactions = {
            "👍": 0,
            "❤️": 0,
            "😊": 0,
            "🎉": 0,
            "😮": 0
        };
    }
    
    // 반응 카운트 증가
    message.reactions[emoji] = (message.reactions[emoji] || 0) + 1;
    
    res.json({
        message: '반응이 추가되었습니다.',
        reactions: message.reactions
    });
});

// 기본 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`http://localhost:${PORT} 에서 확인하세요.`);
});