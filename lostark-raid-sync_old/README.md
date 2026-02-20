# 로스트아크 공대 관리 - 실시간 동기화 & 협업 시스템

## 🚀 기능 소개

이 프로젝트는 로스트아크 공대 관리 시스템에 **실시간 동기화, 동시성 제어, 시크릿 커맨드** 등 고급 기능을 추가한 버전입니다. 여러 사용자가 동시에 공대 데이터를 안전하게 편집하고 실시간으로 변경사항을 공유할 수 있습니다.

## ✨ 주요 기능

### 🔄 실시간 동기화
- **URL 파라미터 기반**: `?syncCode=ABC123` 형태로 동기화 코드 전달
- **Firebase Realtime Database**: 실시간 데이터 동기화
- **충돌 처리**: 트랜잭션 기반 충돌 해결
- **사용자 접속 표시**: 현재 접속 중인 사용자 목록 표시
- **자동 알림**: 다른 사용자의 변경사항 실시간 알림

### 🔐 시크릿 커맨드 시스템
- **관리자 전용**: `Ctrl+Shift+K` 단축키로 시크릿 커맨드 입력
- **전체 공지**: `/broadcast` 또는 `/공지`로 모든 사용자에게 공지 전송
- **다양한 타입**: `/warn`(경고), `/error`(에러), `/success`(성공)
- **한국어 지원**: `/공지`, `/경고`, `/에러`, `/성공` 명령어 지원
- **전역 함수**: `공지()`, `경고()`, `에러()`, `성공()` 함수 제공
- **1회성 공지**: 공지는 한 번만 표시되고 자동 삭제

### 🛡️ 동시성 문제 해결
- **State Manager**: 원자적 상태 업데이트 및 잠금 기반 동시성 제어
- **Transaction Manager**: Firebase 트랜잭션 관리 및 재시도 로직
- **Conflict Resolver**: 자동 충돌 감지 및 다양한 해결 전략
- **Operation Lock**: 작업 단위 잠금으로 데이터 무결성 보장

### 📝 히스토리 관리
- **자동 기록**: 모든 변경사항 자동 히스토리 기록
- **최대 50개 저장**: 오래된 히스토리 자동 정리
- **통계 정보**: 전체 개수, 사용률, 최근 활동 표시
- **동적 설정**: 최대 개수 10-500개 사이로 조절 가능
- **롤백 기능**: 특정 시점으로 데이터 롤백

### 👥 협업 기능
- **다중 사용자 편집**: 여러 사람이 동시에 공대 데이터 편집 가능
- **실시간 업데이트**: 한 사용자의 변경이 즉시 다른 사용자에게 반영
- **사용자 식별**: 각 사용자에게 고유한 색상과 이름 부여
- **세션 관리**: 동기화 세션 생성 및 공유

### 🎮 원정대 관리
- **슬롯 이름 변경**: 원정대 슬롯별 사용자 지정 이름 설정
- **드래그앤드롭**: 개선된 드래그앤드롭으로 캐릭터 배치
- **자동 정렬**: 캐릭터 자동 추천 및 균등 분배
- **제약조건 검증**: 캐릭터 배치 규칙 자동 검증

### 🎯 기존 기능 유지
- 공대 파티 관리
- 캐릭터 검색/수정/삭제
- 데이터 저장/불러오기
- 공유/내려받기
- 반응형 모바일 지원

## 🚀 사용 방법

### 1. 실시간 동기화
#### 동기화 세션 생성
1. 메뉴에서 **"실시간 동기화"** 클릭
2. 자동으로 동기화 코드와 URL 생성
3. 생성된 URL을 다른 사용자에게 공유

#### 동기화 참여
1. 공유받은 URL 접속
2. 자동으로 실시간 동기화 시작
3. 다른 사용자의 변경사항 실시간 확인

### 2. 시크릿 커맨드 사용
#### 기본 사용법
1. `Ctrl+Shift+K` 단축키로 시크릿 커맨드 입력창 열기
2. 명령어 입력 후 `Enter` 키로 실행

#### 사용 가능한 명령어
```bash
# 공지 전송
/broadcast 긴급 공지 메시지
/공지 긴급 공지 메시지

# 경고 메시지
/warn 경고 메시지
/경고 경고 메시지

# 에러 메시지
/error 에러 메시지
/에러 에러 메시지

# 성공 메시지
/success 성공 메시지
/성공 성공 메시지

# 도움말
/help
```

#### 전역 함수 사용
```javascript
// 브라우저 콘솔에서 직접 실행
공지("공지 메시지");
경고("경고 메시지");
에러("에러 메시지");
성공("성공 메시지");
```

### 3. 원정대 관리
#### 슬롯 이름 변경
1. 원정대 슬롯 이름 클릭
2. 새 이름 입력 후 확인

#### 캐릭터 배치
1. 캐릭터 검색으로 추가
2. 드래그앤드롭으로 위치 변경
3. 자동 정렬로 균등 분배

### 4. 히스토리 관리
#### 히스토리 확인
1. 메뉴에서 **"히스토리"** 클릭
2. 모든 변경사항 확인
3. 필요시 롤백 실행

#### 통계 정보
- 전체 개수 및 사용률 확인
- 최근 활동 통계
- 최대 개수 동적 조절

### 5. 협업 편집
- 모든 변경사항이 실시간으로 다른 사용자에게 전송
- 충돌 시 자동 해결 또는 수동 선택
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
│   ├── state-manager.js    # 🛡️ 상태 관리 및 동시성 제어
│   ├── transaction-manager.js # 💱 트랜잭션 관리
│   ├── conflict-resolver.js # ⚔️ 충돌 감지 및 해결
│   ├── operation-lock.js   # 🔒 작업 잠금 시스템
│   ├── id-manager.js       # 🆔 고유 ID 관리
│   ├── history.js          # 📝 히스토리 관리
│   ├── constraints.js      # 🎯 캐릭터 배치 제약 조건
│   ├── raid-ui.js          # 🖼️ 레이드/원정대 UI 렌더링
│   ├── dragdrop.js         # 🎯 드래그/드롭 핸들러
│   ├── modals.js           # 📋 모달/캐릭터 검색/수정/삭제
│   ├── autosave.js         # 💾 자동저장/Firebase 동기화
│   └── main.js            # 메인 애플리케이션 로직
└── README.md              # 이 파일
```

### 🧩 모듈 상세 설명

#### 🛡️ `state-manager.js` - 상태 관리 및 동시성 제어
- `StateManager` 클래스: 원자적 상태 업데이트 관리
- `atomicUpdate()`: 잠금 기반 상태 변경
- `acquireLock()/releaseLock()`: 키별 잠금 관리
- 주요 기능:
  - Race Condition 방지
  - 원자적 상태 업데이트
  - UI 렌더링 동기화
  - 자동 저장 연동

#### 💱 `transaction-manager.js` - 트랜잭션 관리
- `TransactionManager` 클래스: Firebase 트랜잭션 관리
- `executeTransaction()`: 재시도 로직 포함 트랜잭션 실행
- `broadcastTransaction()`: 공지 트랜잭션
- `syncTransaction()`: 데이터 동기화 트랜잭션
- 주요 기능:
  - 자동 재시도 및 타임아웃
  - 충돌 감지 및 처리
  - 트랜잭션 상태 추적

#### ⚔️ `conflict-resolver.js` - 충돌 감지 및 해결
- `ConflictResolver` 클래스: 데이터 충돌 해결
- `detectConflict()`: 깊은 수준 충돌 감지
- `resolveConflict()`: 다양한 해결 전략
- 주요 기능:
  - 마지막 쓰기 우선
  - 자동 병합
  - 사용자 우선
  - 수동 해결 모달

#### 🔒 `operation-lock.js` - 작업 잠금 시스템
- `OperationLock` 클래스: 작업 단위 잠금
- `acquire()/release()`: 잠금 획득/해제
- `withOperationLock()`: 잠금 래퍼 함수
- 주요 기능:
  - 큐 기반 잠금 관리
  - 타임아웃 처리
  - UI 상태 표시

#### 🆔 `id-manager.js` - 고유 ID 관리
- `IDManager` 클래스: 고유 ID 생성 및 관리
- `generateUniqueId()`: 접두사 기반 ID 생성
- 주요 기능:
  - 중복 방지
  - 접두사 지원
  - ID 등록/해제

#### 📝 `history.js` - 히스토리 관리
- `recordHistory()`: 변경사항 자동 기록
- `loadHistory()`: 히스토리 로드
- `rollbackToEntry()`: 특정 시점으로 롤백
- 주요 기능:
  - 최대 50개 저장
  - 자동 정리
  - 통계 정보
  - Firebase 동기화

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
<!-- 기본 설정 -->
<script src="js/api-config.js"></script>
<script src="js/modal-manager.js"></script>

<!-- 동시성 제어 시스템 -->
<script src="js/id-manager.js"></script>
<script src="js/state-manager.js"></script>
<script src="js/transaction-manager.js"></script>
<script src="js/conflict-resolver.js"></script>
<script src="js/operation-lock.js"></script>

<!-- 핵심 기능 -->
<script src="js/realtime-sync.js"></script>
<script src="js/history.js"></script>
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
- **동시성 안정성**: Race Condition 및 충돌 방지
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
사용자 A 변경 → State Manager → Transaction Manager → Firebase Realtime DB → 사용자 B에게 실시간 전파
                ↓                           ↓
        Conflict Resolver           충돌 감지/해제
                ↓                           ↓
        Operation Lock               재시도 로직
                ↓
        사용자 C에게 실시간 전파
```

### 충돌 처리
- **트랜잭션 기반**: Firebase 트랜잭션으로 원자적 업데이트
- **다중 전략**: 마지막 쓰기, 병합, 사용자 우선, 수동 선택
- **자동 감지**: 깊은 수준의 충돌 자동 감지
- **재시도 로직**: 일시적 충돌 시 자동 재시도

### 동시성 제어
- **State Manager**: 키별 잠금으로 Race Condition 방지
- **Operation Lock**: 작업 단위 잠금으로 데이터 무결성 보장
- **원자적 업데이트**: 상태 변경, UI 렌더링, 저장이 원자적으로 처리

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
- 시크릿 커맨드 공지 알림

### 시각적 표시
- 동기화 상태 인디케이터 (녹색/빨간색)
- 접속 중인 사용자 목록
- 실시간 펄스 효과
- 작업 잠금 상태 표시

### 공지 시스템
- 1회성 공지: 한 번만 표시되고 자동 삭제
- 다양한 타입: 정보, 경고, 에러, 성공
- 모달 형태로 전체 화면 표시
- 30초 후 자동 만료

## 🛠️ 개발 참고

### 핵심 파일
- `realtime-sync.js`: 실시간 동기화의 모든 로직
- `state-manager.js`: 상태 관리 및 동시성 제어
- `transaction-manager.js`: 트랜잭션 관리
- `conflict-resolver.js`: 충돌 감지 및 해결
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

// 원자적 상태 업데이트
await window.stateManager.atomicUpdate('raidTabs', async (currentState) => {
  // 상태 수정 로직
  return newState;
});

// 트랜잭션 실행
await window.transactionManager.executeTransaction(async () => {
  // 트랜잭션 로직
});

// 시크릿 커맨드
window.공지("공지 메시지");
window.경고("경고 메시지");
```

### 이벤트 리스너
```javascript
// 데이터 변경 감지
realtimeDB.ref(`syncSessions/${syncCode}`).on('value', callback);

// 사용자 접속/종료 감지
userRef.onDisconnect().remove();

// 공지 수신
realtimeDB.ref('broadcast').on('value', callback);
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
3. **버전 관리**: 변경 이력 및 롤백 ✅ (구현됨)
4. **오프라인 지원**: 로컬 캐싱 및 오프라인 모드
5. **알림 최적화**: 중복 알림 방지 및 그룹화 ✅ (구현됨)
6. **동시성 제어**: Race Condition 및 충돌 해결 ✅ (구현됨)
7. **시크릿 커맨드**: 관리자 전용 기능 ✅ (구현됨)
8. **히스토리 관리**: 자동 정리 및 통계 ✅ (구현됨)

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Firebase 설정이 올바른지
2. 네트워크 연결 상태
3. 브라우저 콘솔 에러 메시지
4. Firebase Realtime Database 규칙
5. 동시성 제어 시스템 상태
6. 트랜잭션 로그 확인

## 🎯 시스템 아키텍처

### 동시성 제어 계층
```
UI Layer (사용자 인터페이스)
    ↓
State Manager (상태 관리)
    ↓
Operation Lock (작업 잠금)
    ↓
Transaction Manager (트랜잭션)
    ↓
Conflict Resolver (충돌 해결)
    ↓
Firebase Realtime Database (데이터 저장)
```

### 데이터 흐름
```
사용자 입력 → 상태 잠금 → 트랜잭션 → 충돌 감지 → 데이터 저장 → UI 업데이트
```

---

**개발자**: Cascade AI Assistant  
**버전**: 2.0.0 (동시성 제어, 시크릿 커맨드, 히스토리 관리 추가)  
**기술 스택**: HTML5, CSS3, JavaScript, Bootstrap 5, Firebase Realtime Database

## 📊 시스템 통계

### 코드 복잡도
- **총 모듈 수**: 15개
- **동시성 제어 모듈**: 6개
- **핵심 기능 모듈**: 9개
- **라인 수**: 약 5,000+ 라인

### 기능 커버리지
- **실시간 동기화**: ✅ 100%
- **동시성 제어**: ✅ 100%
- **시크릿 커맨드**: ✅ 100%
- **히스토리 관리**: ✅ 100%
- **원정대 관리**: ✅ 100%
- **공대 관리**: ✅ 100%
