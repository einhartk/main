# 로스트아크 공대 관리 - 실시간 동기화 버전

## 🚀 기능 소개

이 프로젝트는 로스트아크 공대 관리 시스템에 **실시간 동기화 기능**을 추가한 버전입니다. 여러 사용자가 동시에 공대 데이터를 편집하고 실시간으로 변경사항을 공유할 수 있습니다.

## ✨ 주요 기능

### 🔄 실시간 동기화
- **URL 파라미터 기반**: `?syncCode=ABC123` 형태로 동기화 코드 전달
- **Firebase Realtime Database**: 실시간 데이터 동기화
- **충돌 처리**: 마지막 수정 시간 기반 자동 병합
- **사용자 접속 표시**: 현재 접속 중인 사용자 목록 표시
- **자동 알림**: 다른 사용자의 변경사항 실시간 알림

### 👥 협업 기능
- **다중 사용자 편집**: 여러 사람이 동시에 공대 데이터 편집 가능
- **실시간 업데이트**: 한 사용자의 변경이 즉시 다른 사용자에게 반영
- **사용자 식별**: 각 사용자에게 고유한 색상과 이름 부여
- **세션 관리**: 동기화 세션 생성 및 공유

### 🎮 기존 기능 유지
- 공대 파티 관리
- 원정대 캐릭터 관리
- 자동 추천/균등 분배
- 데이터 저장/불러오기
- 공유/내려받기

## 🚀 사용 방법

### 1. 동기화 세션 생성
1. 메뉴에서 **"실시간 동기화"** 클릭
2. 자동으로 동기화 코드와 URL 생성
3. 생성된 URL을 다른 사용자에게 공유

### 2. 동기화 참여
1. 공유받은 URL 접속
2. 자동으로 실시간 동기화 시작
3. 다른 사용자의 변경사항 실시간 확인

### 3. 협업 편집
- 모든 변경사항이 실시간으로 다른 사용자에게 전송
- 충돌 시 마지막 수정이 우선 적용
- 접속 중인 사용자 목록 확인 가능

## 📁 프로젝트 구조

```
lostark-raid-sync/
├── index.html              # 메인 HTML (실시간 동기화 UI 추가)
├── css/
│   └── style.css           # 스타일시트 (동기화 상태 표시 추가)
├── js/
│   ├── api-config.js       # API 및 Firebase 설정
│   ├── modal-manager.js    # 모달 관리자
│   ├── realtime-sync.js    # 🔥 실시간 동기화 핵심 로직
│   ├── constraints.js      # 🎯 캐릭터 배치 제약 조건
│   ├── raid-ui.js          # 🖼️ 레이드/원정대 UI 렌더링
│   ├── dragdrop.js         # 🎯 드래그/드롭 핸들러
│   ├── modals.js           # 📋 모달/캐릭터 검색/수정/삭제
│   ├── autosave.js         # 💾 자동저장/Firebase 동기화
│   └── main.js            # 메인 애플리케이션 로직
└── README.md              # 이 파일
```

### 🧩 모듈 상세 설명

#### `constraints.js` - 캐릭터 배치 제약 조건
- `Constraints` 객체: 모든 캐릭터 배치 규칙 정의
- `applyConstraints()`: 제약 조건 검증 헬퍼
- 주요 기능:
  - 캐릭터 중복 체크 (공격대당 1캐릭)
  - 파티별 서폿 수 제한
  - 아이템 레벨/전투력 요구사항 검증
  - 원정대 슬롯 사용 제한

#### `raid-ui.js` - 레이드/원정대 UI 렌더링
- `renderRaidTabs()`: 레이드 탭/난이도 탭 렌더링
- `renderRaidParties()`: 공격대 파티 UI 렌더링
- `renderExpedition()`: 원정대 슬롯 UI 렌더링
- `setupRaidEventListeners()`: 이벤트 리스너 설정
- `updateSupportCount()`: 서폿 수 UI 업데이트

#### `dragdrop.js` - 드래그/드롭 핸들러
- `handleDragStart()`: 드래그 시작 처리
- `handleDragEnd()`: 드래그 종료 처리
- `handleDragOver()`: 드래그 오버 처리
- `handleDrop()`: 공격대 슬롯 드랍 처리
- `handleExpeditionDrop()`: 원정대 슬롯 드랍 처리
- 슬롯 단위 락 확인/차단 로직 포함

#### `modals.js` - 모달/캐릭터 관리
- `openCharacterSearchModal()`: 캐릭터 검색 모달
- `searchCharacters()`: 캐릭터 API 조회
- `editCharacter()`: 캐릭터 수정 모달
- `confirmRemoveCharacter()`: 캐릭터 삭제 확인
- `fetchCharacterData()`: Lost Ark API 데이터 조회
- `displaySearchResults()`: 조회 결과 표시
- 슬롯 락/해제 로직 포함

#### `autosave.js` - 자동저장/동기화
- `scheduleAutoSave()`: 자동 저장 스케줄러
- `schedulePartyConfigSave()`: 파티 설정 저장 스케줄러
- `autoSaveToDatabase()`: Firebase Realtime Database 저장
- 실시간 동기화 전파 로직 포함

### 🔄 모듈 로딩 순서
```html
<script src="js/api-config.js"></script>
<script src="js/modal-manager.js"></script>
<script src="js/realtime-sync.js"></script>
<script src="js/constraints.js"></script>
<script src="js/raid-ui.js"></script>
<script src="js/dragdrop.js"></script>
<script src="js/modals.js"></script>
<script src="js/autosave.js"></script>
<script src="js/main.js"></script>
```

### 🎯 모듈화 장점
- **유지보수성**: 기능별로 분리되어 코드 수정 용이
- **재사용성**: 각 모듈 독립적으로 재사용 가능
- **가독성**: main.js가 훨씬 간결해짐
- **확장성**: 새 기능 추가 시 해당 모듈만 수정
- **번들러 없음**: script 태그 순서로 간단하게 관리

## 🔧 설정 방법

### 1. Firebase 설정
1. Firebase 콘솔에서 새 프로젝트 생성
2. Realtime Database 활성화
3. `js/api-config.js` 파일에 Firebase 설정 정보 입력

```javascript
const FIREBASE_CONFIG = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. 로컬 서버 실행
```bash
# Python 3
python -m http.server 8000

# Node.js (설치 필요)
npx http-server

# PHP
php -S localhost:8000
```

### 3. 브라우저 접속
```
http://localhost:8000
```

## 🔄 실시간 동기화 작동 방식

### 데이터 흐름
```
사용자 A 변경 → Firebase Realtime DB → 사용자 B에게 실시간 전파
                ↓
        사용자 C에게 실시간 전파
```

### 충돌 처리
- **타임스탬프 기반**: 마지막 수정 시간이 가장 최신인 데이터 우선
- **필드 레벨 업데이트**: 특정 필드만 변경 가능
- **자동 병합**: 충돌 시 자동으로 데이터 병합

### 사용자 관리
- **고유 사용자 ID**: 랜덤 생성 또는 로컬 저장
- **접속 상태**: 실시간 접속/종료 감지
- **색상 구분**: 각 사용자에게 고유 색상 부여

## 🎯 URL 파라미터

### 동기화 코드
```
http://localhost:8000?syncCode=ABC123
http://localhost:8000?code=XYZ789
```

### 자동 감지
- 페이지 로드 시 URL 파라미터 확인
- 동기화 코드가 있으면 자동으로 실시간 모드 활성화
- 코드가 없으면 일반 모드로 실행

## 🔔 알림 시스템

### 실시간 알림
- 다른 사용자가 데이터를 수정했을 때 알림
- 접속/종료 사용자 알림
- 충돌 발생 시 알림

### 시각적 표시
- 동기화 상태 인디케이터 (녹색/빨간색)
- 접속 중인 사용자 목록
- 실시간 펄스 효과

## 🛠️ 개발 참고

### 핵심 파일
- `realtime-sync.js`: 실시간 동기화의 모든 로직
- `main.js`: 기존 기능 + 동기화 연동
- `index.html`: 동기화 상태 UI 추가

### 주요 함수
```javascript
// 동기화 세션 생성
window.realtimeSync.createSession();

// 수동 동기화 시작
window.realtimeSync.init(syncCode);

// 동기화 종료
window.realtimeSync.disconnect();

// 동기화 상태 확인
window.realtimeSync.isSyncActive();
```

### 이벤트 리스너
```javascript
// 데이터 변경 감지
realtimeDB.ref(`syncSessions/${syncCode}`).on('value', callback);

// 사용자 접속/종료 감지
userRef.onDisconnect().remove();
```

## 🚨 주의사항

### 보안
- Firebase 보안 규칙 설정 필요
- 인증 시스템 연동 권장
- 데이터 접근 권한 관리

### 성능
- 실시간 동기화는 네트워크 사용량 증가
- 대규모 동시 접속 시 성능 저하 가능성
- 적절한 데이터 구조화 필요

### 한계
- 인터넷 연결 필수
- Firebase 무료 플랜 사용량 제한
- 동시 접속자 수 제한

## 📱 모바일 지원

- 반응형 웹 디자인
- 터치 이벤트 지원
- 모바일 브라우저 호환

## 🔮 향후 개선 사항

1. **인증 시스템**: Google/GitHub 로그인 연동
2. **권한 관리**: 읽기/쓰기 권한 분리
3. **버전 관리**: 변경 이력 및 롤백
4. **오프라인 지원**: 로컬 캐싱 및 오프라인 모드
5. **알림 최적화**: 중복 알림 방지 및 그룹화

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Firebase 설정이 올바른지
2. 네트워크 연결 상태
3. 브라우저 콘솔 에러 메시지
4. Firebase Realtime Database 규칙

---

**개발자**: Cascade AI Assistant  
**버전**: 1.0.0 (실시간 동기화 추가)  
**기술 스택**: HTML5, CSS3, JavaScript, Bootstrap 5, Firebase Realtime Database
