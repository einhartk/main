// 실시간 채팅 기능
class ChatManager {
  constructor() {
    this.db = window.db;
    this.chatCollection = 'raid_chat';
    this.messages = [];
    this.unreadCount = 0;
    this.isOpen = false;
    this.currentUser = this.getStoredUsername(); // 로컬 스토리지에서 사용자 이름 가져오기
    this.userId = this.generateUserId(); // 사용자 ID를 인스턴스 변수로 저장
    this.init();
  }

  generateRandomUser() {
    const adjectives = ['행복한', '즐거운', '열정적인', '용감한', '현명한', '재미있는'];
    const nouns = ['모험가', '전사', '마법사', '도적', '기사', '궁수'];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    return `${randomAdj}${randomNoun}${randomNum}`;
  }

  getStoredUsername() {
    // 로컬 스토리지에서 저장된 사용자 이름 가져오기
    const storedUsername = localStorage.getItem('chatUsername');
    if (storedUsername) {
      return storedUsername;
    }
    
    // 저장된 이름이 없으면 새로 생성하고 저장
    const newUsername = this.generateRandomUser();
    localStorage.setItem('chatUsername', newUsername);
    return newUsername;
  }

  updateUsername(newUsername) {
    if (newUsername && newUsername.trim()) {
      this.currentUser = newUsername.trim();
      localStorage.setItem('chatUsername', this.currentUser);
      
      // UI에 현재 사용자 이름 업데이트
      const usernameElement = document.getElementById('current-username');
      if (usernameElement) {
        usernameElement.textContent = this.currentUser;
      }
    }
  }

  promptUsernameChange() {
    const newUsername = prompt('새 사용자 이름을 입력하세요:', this.currentUser);
    if (newUsername && newUsername.trim() && newUsername.trim() !== this.currentUser) {
      this.updateUsername(newUsername.trim());
    }
  }

  init() {
    this.createChatUI();
    
    // 즉시 이벤트 리스너 설정
    this.setupEventListeners();
    
    setTimeout(() => {
      this.loadMessages();
      this.listenForNewMessages();
    }, 200);
  }

  createChatUI() {
    // 기존 채팅 컨테이너가 있으면 제거
    const existingContainer = document.getElementById('chat-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    // 채팅 UI HTML 생성
    const chatHTML = `
      <div id="chat-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Malgun Gothic', sans-serif;">
        <!-- 채팅 아이콘 (닫혔을 때) -->
        <div id="chat-icon" style="display: block; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s ease;">
          <i class="bi bi-chat-dots-fill" style="font-size: 20px;"></i>
          <span id="unread-badge" style="position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; width: 18px; height: 18px; display: none; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">0</span>
        </div>

        <!-- 채팅 창 (열렸을 때) -->
        <div id="chat-window" style="display: none; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); width: 320px; height: 450px; max-height: 70vh; position: absolute; bottom: 0; right: 0; flex-direction: column; overflow: hidden;">
          <!-- 채팅 헤더 -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <h6 style="margin: 0; font-size: 16px; font-weight: 600;">레이드 채팅</h6>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <small id="current-username" style="opacity: 0.9;">${this.currentUser}</small>
                <button id="change-username-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 10px; padding: 2px 6px; border-radius: 3px; cursor: pointer; transition: background 0.3s;">
                  <i class="bi bi-pencil" style="font-size: 10px;"></i>
                </button>
              </div>
            </div>
            <button id="close-chat" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.3s;">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- 메시지 영역 -->
          <div id="messages-container" style="flex: 1; overflow-y: auto; padding: 15px; background: #f8f9fa; max-height: 280px;">
            <div id="messages-list"></div>
          </div>

          <!-- 입력 영역 -->
          <div style="padding: 15px; border-top: 1px solid #e9ecef; background: white;">
            <div class="input-group">
              <input type="text" id="chat-message-input" class="form-control" placeholder="메시지를 입력하세요..." maxlength="200" style="border-radius: 20px 0 0 20px;">
              <button id="chat-send-message" class="btn btn-primary" style="border-radius: 0 20px 20px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                <i class="bi bi-send-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // body에 채팅 UI 추가
    document.body.insertAdjacentHTML('beforeend', chatHTML);
  }

  setupEventListeners() {
    // 이벤트 위임 방식으로 모든 이벤트 처리
    document.addEventListener('click', (e) => {
      // 채팅 아이콘 클릭
      if (e.target.closest('#chat-icon')) {
        e.preventDefault();
        this.openChat();
        return;
      }
      
      // 닫기 버튼 클릭
      if (e.target.closest('#close-chat')) {
        e.preventDefault();
        this.closeChat();
        return;
      }
      
      // 전송 버튼 클릭
      if (e.target.closest('#chat-send-message')) {
        e.preventDefault();
        this.sendMessage();
        return;
      }
      
      // 사용자 이름 변경 버튼 클릭
      if (e.target.closest('#change-username-btn')) {
        e.preventDefault();
        this.promptUsernameChange();
        return;
      }
    });

    // 엔터키 이벤트는 이벤트 위임으로 처리
    document.addEventListener('keypress', (e) => {
      if (e.target.id === 'chat-message-input' && e.key === 'Enter') {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  openChat() {
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    
    if (chatIcon) {
      chatIcon.classList.add('hide');
      chatIcon.classList.remove('show');
    } else {
      console.error('❌ 채팅 아이콘을 찾을 수 없습니다');
    }
    
    if (chatWindow) {
      chatWindow.classList.add('show');
      chatWindow.classList.remove('hide');
    } else {
      console.error('❌ 채팅창을 찾을 수 없습니다');
    }
    
    this.isOpen = true;
    
    // 스크롤을 맨 아래로
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  closeChat() {
    const chatIcon = document.getElementById('chat-icon');
    const chatWindow = document.getElementById('chat-window');
    
    if (chatIcon) {
      chatIcon.classList.remove('hide');
      chatIcon.classList.add('show');
    } else {
      console.error('❌ 채팅 아이콘을 찾을 수 없습니다');
    }
    
    if (chatWindow) {
      chatWindow.classList.remove('show');
      chatWindow.classList.add('hide');
    } else {
      console.error('❌ 채팅창을 찾을 수 없습니다');
    }
    
    this.isOpen = false;
  }

  async sendMessage() {
    // 1단계: 입력창 확인
    const input = document.getElementById('chat-message-input');
    if (!input) {
      console.error('❌ 입력창을 찾을 수 없습니다');
      return;
    }
    
    // 2단계: 공란 처리 (가장 먼저 실행)
    const message = input.value.trim();
    if (!message) {
      return;
    }

    input.value = '';

    // 3단계: 채팅 전송
    try {
      const messageData = {
        username: this.currentUser,
        message: message,
        timestamp: new Date(),
        userId: this.userId // 인스턴스 변수 사용
      };
      
      await this.db.collection(this.chatCollection).add(messageData);
      
      // 4단계: 입력창 초기화
      
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error);
    }
  }

  generateUserId() {
    // 간단한 사용자 ID 생성 (실제로는 더 안전한 방식 사용)
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  async loadMessages() {
    try {
      // 1시간 전 타임스탬프 계산
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const snapshot = await this.db.collection(this.chatCollection)
        .where('timestamp', '>=', oneHourAgo)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      this.messages = [];
      snapshot.docs.reverse().forEach(doc => {
        const message = doc.data();
        this.messages.push(message);
      });
      
      this.renderMessages();
      this.scrollToBottom();
      
      // 로드된 메시지 중 다른 사람 메시지만 카운트 (채팅창이 닫혀있을 경우)
      if (!this.isOpen) {
        const otherUsersMessages = this.messages.filter(msg => msg.userId !== this.userId);
        this.unreadCount = otherUsersMessages.length;
        this.updateUnreadBadge();
      }
      
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    }
  }

  listenForNewMessages() {
    this.db.collection(this.chatCollection)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newMessage = change.doc.data();
            
            // 내 메시지가 아니고, 채팅창이 닫혀있을 때만 알림
            if (newMessage.userId !== this.userId && !this.isOpen) {
              this.messages.push(newMessage);
              this.renderMessage(newMessage);
              this.unreadCount++;
              this.updateUnreadBadge();
            } else if (newMessage.userId !== this.userId && this.isOpen) {
              // 내 메시지가 아니고 채팅창이 열려있으면 메시지만 추가
              this.messages.push(newMessage);
              this.renderMessage(newMessage);
              this.scrollToBottom();
            } else if (newMessage.userId === this.userId) {
              // 내 메시지는 그냥 추가하고 스크롤
              this.messages.push(newMessage);
              this.renderMessage(newMessage);
              if (this.isOpen) {
                this.scrollToBottom();
              }
            }
          }
        });
      });
  }

  renderMessages() {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '';
    
    this.messages.forEach(message => {
      this.renderMessage(message);
    });
  }

  renderMessage(message) {
    const messagesList = document.getElementById('messages-list');
    const isOwnMessage = message.userId === this.userId; // 인스턴스 변수 사용
    
    const messageHTML = `
      <div class="chat-message" style="margin-bottom: 12px; display: flex; ${isOwnMessage ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
        <div style="max-width: 70%;">
          <div style="font-size: 12px; color: #6c757d; margin-bottom: 4px; ${isOwnMessage ? 'text-align: right;' : ''}">
            ${message.username} • ${this.formatTime(message.timestamp)}
          </div>
          <div style="background: ${isOwnMessage ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'}; 
                      color: ${isOwnMessage ? 'white' : '#2c3e50'}; 
                      padding: 10px 15px; 
                      border-radius: 18px; 
                      word-wrap: break-word;
                      box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${this.escapeHtml(message.message)}
          </div>
        </div>
      </div>
    `;
    
    messagesList.insertAdjacentHTML('beforeend', messageHTML);
  }

  updateUnreadBadge() {
    const badge = document.getElementById('unread-badge');
    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  }

  formatTime(timestamp) {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1분 이내
      return '방금';
    } else if (diff < 3600000) { // 1시간 이내
      return `${Math.floor(diff / 60000)}분 전`;
    } else if (diff < 86400000) { // 24시간 이내
      return `${Math.floor(diff / 3600000)}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showNotification(message, type = 'info') {
    // 간단한 알림 표시 (필요시 개선)
  }
}

// 페이지 로드 시 채팅 초기화
function initializeChat() {
  // 이미 채팅 매니저가 있으면 중복 생성 방지
  if (window.chatManager) {
    return;
  }
  
  // Firebase SDK가 로드되었는지 확인
  if (typeof firebase !== 'undefined' && window.db) {
    window.chatManager = new ChatManager();
  } else {
    console.error('❌ Firebase SDK가 로드되지 않았습니다. 1초 후 재시도...');
    // 1초 후 다시 시도
    setTimeout(initializeChat, 1000);
  }
}

// 여러 방법으로 초기화 시도

// 초기화 플래그
let isInitializing = false;

// 안전한 초기화 함수
function safeInitialize() {
  if (isInitializing || window.chatManager) {
    return;
  }
  
  isInitializing = true;
  initializeChat();
}

// DOMContentLoaded 이벤트
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(safeInitialize, 500);
  });
} else {
  setTimeout(safeInitialize, 500);
}

// window.load 이벤트도 추가
window.addEventListener('load', () => {
  if (!window.chatManager) {
    setTimeout(safeInitialize, 200);
  }
});

// 즉시 실행도 시도 (가장 빠른 경우)
setTimeout(() => {
  if (!window.chatManager) {
    safeInitialize();
  }
}, 100);
