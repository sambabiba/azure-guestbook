// DOM 요소들
const form = document.getElementById('guestbook-form');
const nameInput = document.getElementById('name');
const messageInput = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const messagesContainer = document.getElementById('messages-container');
const loading = document.getElementById('loading');
const toast = document.getElementById('toast');
const themeToggle = document.getElementById('themeToggle');

// 다크모드 초기 설정
let isDarkMode = localStorage.getItem('darkMode') === 'true';
updateTheme();

// 페이지 로드 시 메시지 불러오기
document.addEventListener('DOMContentLoaded', () => {
    loadMessages();
});

// 다크모드 토글
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    updateTheme();
});

function updateTheme() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        themeToggle.title = '라이트모드로 변경';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        themeToggle.title = '다크모드로 변경';
    }
}

// 폼 제출 이벤트
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    
    // 입력 검증
    if (!name || !message) {
        showToast('이름과 메시지를 모두 입력해주세요.', 'error');
        return;
    }
    
    if (name.length > 50) {
        showToast('이름은 50자 이내로 입력해주세요.', 'error');
        return;
    }
    
    if (message.length > 500) {
        showToast('메시지는 500자 이내로 입력해주세요.', 'error');
        return;
    }
    
    // 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, message }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '메시지 전송에 실패했습니다.');
        }
        
        const newMessage = await response.json();
        showToast('메시지가 성공적으로 등록되었습니다!', 'success');
        
        // 폼 초기화
        form.reset();
        
        // 메시지 목록 새로고침
        loadMessages();
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
    } finally {
        // 버튼 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = '메시지 남기기';
    }
});

// 메시지 목록 불러오기
async function loadMessages() {
    try {
        loading.style.display = 'block';
        messagesContainer.innerHTML = '';
        
        const response = await fetch('/api/messages');
        
        if (!response.ok) {
            throw new Error('메시지를 불러오는데 실패했습니다.');
        }
        
        const messages = await response.json();
        
        loading.style.display = 'none';
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    아직 메시지가 없습니다. 첫 번째 메시지를 남겨보세요! ✨
                </div>
            `;
            return;
        }
        
        // 메시지 렌더링
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
        
    } catch (error) {
        console.error('Error loading messages:', error);
        loading.style.display = 'none';
        messagesContainer.innerHTML = `
            <div class="empty-state">
                메시지를 불러오는 중 오류가 발생했습니다. 😞<br>
                페이지를 새로고침해 주세요.
            </div>
        `;
        showToast('메시지 목록을 불러오는데 실패했습니다.', 'error');
    }
}

// 메시지 HTML 요소 생성
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item';
    messageDiv.setAttribute('data-id', message.id);
    
    const formattedTime = formatTime(message.timestamp);
    
    // 이모지 반응 HTML 생성
    const reactions = message.reactions || {};
    const reactionEmojis = ["👍", "❤️", "😊", "🎉", "😮"];
    const reactionsHTML = reactionEmojis.map(emoji => {
        const count = reactions[emoji] || 0;
        return `
            <button class="reaction-btn" onclick="addReaction(${message.id}, '${emoji}')" title="${emoji} 반응 추가">
                <span>${emoji}</span>
                <span class="reaction-count">${count}</span>
            </button>
        `;
    }).join('');
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <div class="message-meta">
                <span class="message-author">${escapeHtml(message.name)}</span>
                <span class="message-time">${formattedTime}</span>
            </div>
            <button class="delete-btn" onclick="openDeleteModal(${message.id}, '${escapeHtml(message.name)}')">삭제</button>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
        <div class="reactions">
            ${reactionsHTML}
        </div>
    `;
    
    return messageDiv;
}

// 시간 포맷팅
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
        return '방금 전';
    } else if (diffMins < 60) {
        return `${diffMins}분 전`;
    } else if (diffHours < 24) {
        return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
        return `${diffDays}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 토스트 알림 표시
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 텍스트 영역 자동 크기 조절
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// 입력 필드 실시간 검증
nameInput.addEventListener('input', function() {
    const remaining = 50 - this.value.length;
    if (remaining < 10) {
        this.style.borderColor = remaining < 0 ? '#dc3545' : '#ffc107';
    } else {
        this.style.borderColor = '#ddd';
    }
});

messageInput.addEventListener('input', function() {
    const remaining = 500 - this.value.length;
    if (remaining < 50) {
        this.style.borderColor = remaining < 0 ? '#dc3545' : '#ffc107';
    } else {
        this.style.borderColor = '#ddd';
    }
});

// 새로고침 버튼 (선택사항)
function refreshMessages() {
    loadMessages();
}

// 삭제 모달 열기 (관리자 전용)
function openDeleteModal(messageId, authorName) {
    const modal = document.getElementById('deleteModal');
    const messageIdInput = document.getElementById('deleteMessageId');
    const passwordInput = document.getElementById('deletePassword');
    
    messageIdInput.value = messageId;
    passwordInput.value = '';
    
    modal.style.display = 'block';
    
    // 포커스를 비밀번호 입력란으로
    passwordInput.focus();
}

// 삭제 모달 닫기
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
}

// 삭제 폼 제출 (관리자 전용)
document.getElementById('deleteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const messageId = document.getElementById('deleteMessageId').value;
    const password = document.getElementById('deletePassword').value.trim();
    
    if (!password) {
        showToast('관리자 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    const confirmBtn = document.querySelector('.modal-btn.confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '삭제 중...';
    
    try {
        const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '삭제에 실패했습니다.');
        }
        
        const result = await response.json();
        showToast('메시지가 삭제되었습니다.', 'success');
        
        // 모달 닫기
        closeDeleteModal();
        
        // 메시지 목록 새로고침
        loadMessages();
        
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast(error.message, 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '삭제';
    }
});

// 이모지 반응 추가
async function addReaction(messageId, emoji) {
    try {
        const response = await fetch(`/api/messages/${messageId}/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emoji: emoji }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '반응 추가에 실패했습니다.');
        }
        
        const result = await response.json();
        
        // 해당 메시지의 반응 카운트 업데이트
        const messageElement = document.querySelector(`[data-id="${messageId}"]`);
        if (messageElement) {
            const reactionButtons = messageElement.querySelectorAll('.reaction-btn');
            reactionButtons.forEach((btn, index) => {
                const emojis = ["👍", "❤️", "😊", "🎉", "😮"];
                const currentEmoji = emojis[index];
                if (currentEmoji === emoji) {
                    const countSpan = btn.querySelector('.reaction-count');
                    countSpan.textContent = result.reactions[emoji];
                    
                    // 버튼 애니메이션 효과
                    btn.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        btn.style.transform = 'scale(1)';
                    }, 150);
                }
            });
        }
        
    } catch (error) {
        console.error('Error adding reaction:', error);
        showToast(error.message, 'error');
    }
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('deleteModal');
    if (event.target === modal) {
        closeDeleteModal();
    }
}