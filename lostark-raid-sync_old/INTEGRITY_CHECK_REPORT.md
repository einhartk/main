# lostark-raid-sync 무결성 검사 보고서

검사 일자: 2025-02-04 (최종 갱신: 프로젝트 전반 기능 체크)

---

## 1. 수정 완료된 버그

### 1.1 `updateRaidSize()` – 미정의 변수 사용 (main.js)

- **문제**: `performRaidSizeChange(party, size, raidId, difficultyId, partyId)` 호출 시 `raidId`, `difficultyId`가 `updateRaidSize` 스코프에 정의되어 있지 않아 `undefined`로 전달됨.
- **수정**: 함수 상단에 `const raidId = state.selectedRaid?.id`, `const difficultyId = state.selectedDifficulty?.id` 추가.

### 1.2 `removeRaid()` – 미정의 변수 및 잘못된 잠금 해제 (main.js)

- **문제**
  1. 일반 모드 분기에서 `raidId`, `difficultyId`를 사용하지만 해당 블록에서 정의되지 않음 (State Manager 분기에서 참조 시 오류).
  2. `operationLock.release()` 호출 – `operationLock`은 `operation-lock.js` 로컬 변수이며 main.js에는 없어 `ReferenceError` 발생 가능.
- **수정**
  1. 일반 모드 블록 시작 시 `const raidId = state.selectedRaid?.id`, `const difficultyId = state.selectedDifficulty?.id` 추가.
  2. 모든 `operationLock.release(...)` → `window.operationLock.release(...)` 로 변경 (안전 체크 포함).
  3. State Manager 분기에서 `party.name` 대신 이미 선언된 `removedParty.name` 사용하도록 수정.

### 1.3 `exportRaidList()` – 미구현 (HTML만 참조)

- **문제**: `index.html`의 “내보내기” 버튼이 `onclick="exportRaidList()"`를 호출하지만, 해당 함수가 어떤 JS 파일에도 정의되어 있지 않아 클릭 시 `ReferenceError` 발생.
- **수정**: `main.js`에 `exportRaidList()` 추가 – 현재 공대 리스트(선택 레이드/난이도, 원정대 슬롯명, 원정대 슬롯, raidTabs)를 JSON 파일로 다운로드.

### 1.4 `updateRaidSize()` – 8→4명 변경 시 확인 모달 미동작 (main.js)

- **문제**: 8명 파티를 4명으로 줄일 때 `modalManager.showAlert()`에 `showConfirm`, `onConfirm`을 넘겼으나, `showAlert`는 해당 옵션을 지원하지 않아 확인 시 `performRaidSizeChange`가 호출되지 않음.
- **수정**: `showAlert` → `showConfirm`으로 변경. `confirmText: '계속'`, `cancelText: '취소'`, `onConfirm`에서 `performRaidSizeChange` 호출.

---

## 2. 스크립트 로드 및 모듈 일치

### 2.1 index.html에 로드되지 않은 스크립트

- **파일**: `state-manager.js`, `transaction-manager.js`, `conflict-resolver.js`
- **상황**: README에는 포함된다고 되어 있으나 `index.html`의 `<script>` 목록에는 없음.
- **영향**:
  - `main.js`, `modals.js` 등은 `window.stateManager` 존재 여부를 확인한 뒤 fallback으로 직접 `state` 수정을 사용하므로, 현재는 **동작에는 문제 없음**.
  - 나중에 이 스크립트들을 추가하면 State Manager 경로가 활성화되며, 위에서 수정한 `removeRaid`의 `raidId`/`difficultyId` 정의가 해당 경로에서도 필요함(이미 반영됨).

### 2.2 스크립트 로드 순서 (index.html 기준)

현재 순서: api-config → modal-manager → id-manager → realtime-sync → constraints → raid-ui → dragdrop → modals → autosave → statistics → operation-lock → main → history.  
`state`(main.js), `getCurrentTabParties`(main.js), `Constraints`, `getCharacterDetailsFromExpedition`(raid-ui.js) 등에 의존하는 구조와 일치함.

---

## 3. 사용처가 없거나 중복된 코드

### 3.1 사용되지 않는 함수

- **`displayCurrentTabParties()`** (statistics.js): 정의만 있고 호출처 없음.  
  - 통계 “개요” 등에서 “현재 탭 파티” 표시용으로 둔 것으로 보이며, 필요 시 호출부 추가하거나 사용 계획이 없으면 제거 검토 가능.

### 3.2 중복 정의

- **`parseCompareNumber()`**
  - `main.js`와 `statistics.js` 양쪽에 유사 구현 존재.
  - 로드 순서상 main.js가 나중에 로드되어 전역에는 main 쪽이 남음.  
  - 통일을 위해 한 곳(main.js 또는 공통 유틸)으로 모으고, 다른 쪽에서는 그 함수를 사용하도록 정리하는 것을 권장.

### 3.3 그 외 함수 사용 여부

- `withOperationLock`, `showOperationLockStatus`: operation-lock.js 내부 및 `window`에 노출되어 사용됨.
- `generateUniqueId`, `registerId`, `unregisterId`: id-manager.js 및 modal-manager, realtime-sync 등에서 사용됨.
- `findCharacterById`, `findCharacterByIdFromExpedition`: dragdrop.js에서 사용.
- `applyConstraints`: constraints.js에만 정의되어 있고, 호출부는 `Constraints.canAddCharacterToParty` 등 객체 메서드로 사용됨. 이름이 비슷한 standalone 함수로는 미사용.

---

## 4. HTML ↔ JS 함수 매핑

| HTML (onclick 등)           | 정의 위치     | 비고     |
|-----------------------------|----------------|----------|
| `showRaidListModal()`       | main.js        | OK       |
| `showExpeditionModal()`     | main.js        | OK       |
| `showStatisticsModal()`     | main.js, statistics.js 둘 다 존재 | statistics.js 쪽이 동일 모달 + calculateAndDisplayStatistics 호출로 실제 동작 담당 |
| `showHistoryModal()`        | history.js     | OK       |
| `exportRaidList()`          | main.js        | 이번에 추가 |
| `generatePromotionText()`   | main.js        | OK       |
| `captureRaidList()`         | main.js        | OK       |
| `addNewRaid()`              | main.js        | OK       |
| `autoAssign()`              | main.js        | OK       |
| `balancedAssign()`          | main.js        | OK       |
| `toggleExpeditionPanel()`   | main.js        | OK       |
| `refreshExpeditionGold()`   | statistics.js  | OK       |
| `exportStatistics()`        | statistics.js  | OK       |

---

## 5. 권장 후속 작업

1. **state-manager 등 사용 시**:  
   `index.html`에 `state-manager.js`(및 필요 시 transaction-manager, conflict-resolver)를 추가할 경우, 현재 수정된 `removeRaid`의 `raidId`/`difficultyId` 정의가 해당 분기에서도 그대로 사용되므로 추가 수정 없이 사용 가능.

2. **`displayCurrentTabParties`**:  
   통계 UI에서 “현재 탭 파티” 표시가 필요하면 호출부 추가, 불필요하면 함수 제거 또는 주석으로 “미사용” 표시.

3. **`parseCompareNumber`**:  
   한 파일로 통합해 전역/공통 유틸로 두고, 다른 파일에서는 그 함수만 참조하도록 정리.

4. **autosave와 syncToFirebaseWithLock**:  
   `autosave.js`에서 `syncToFirebaseWithLock()`을 `await` 없이 호출하고 있음.  
   동기화 완료를 보장하려면 `autoSaveToDatabase`를 `async`로 유지한 채 `await window.realtimeSync.syncToFirebaseWithLock()`으로 변경하는 것을 검토할 수 있음.

---

## 6. 프로젝트 전반 기능 체크 요약

### 6.1 HTML → 전역 함수

- `showRaidListModal`, `showExpeditionModal`, `showStatisticsModal`, `showHistoryModal`, `toggleExpeditionPanel`, `addNewRaid`, `autoAssign`, `balancedAssign`, `exportRaidList`, `generatePromotionText`, `captureRaidList`, `saveCharacterEdit`, `searchCharacters`, `refreshExpeditionGold`, `exportStatistics` → 모두 해당 JS 파일에 정의되어 있으며, 스크립트 로드 순서상 전역으로 노출됨. **이상 없음.**

### 6.2 선택적 모듈 (index.html 미로드)

- `state-manager.js`, `transaction-manager.js`, `conflict-resolver.js`는 index.html에 포함되지 않음. 코드는 `window.stateManager`, `window.transactionManager` 존재 여부를 확인 후 fallback 처리하므로 **기능상 문제 없음.**

### 6.3 로그 정리

- `dragdrop.js`: `handleExpeditionToRaidDrop` 내부의 불필요한 `console.log`/`console.warn` 제거 완료. `handleRaidToRaidDrop` 내 "백업 데이터" `console.log` 블록은 인코딩 이슈로 수동 제거 권장(동작에는 영향 없음).

---

## 7. 요약

- **즉시 수정한 항목**: `updateRaidSize`의 `raidId`/`difficultyId` 정의, `removeRaid`의 `raidId`/`difficultyId` 정의 및 `window.operationLock.release` 사용, `exportRaidList` 함수 추가, **파티 8→4 변경 시 확인 모달(`showConfirm`) 수정**, **dragdrop 불필요 로그 제거**.
- **무결성**: HTML에서 참조하는 전역 함수는 모두 정의되어 있으며, 파티 크기 변경(확인 포함)·파티 삭제·공대 리스트 내보내기·원정대 패널 상태 저장 등이 정상 동작할 수 있는 상태입니다.
- **선택 정리**: 미사용 함수 1개, 중복 함수 1쌍, autosave의 await 여부, dragdrop 잔여 로그 1곳은 필요 시 수동 정리하면 됩니다.
