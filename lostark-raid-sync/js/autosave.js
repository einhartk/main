let autoSaveTimer = null;
function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    autoSaveToDatabase();
  }, 500); // 250ms -> 500ms로 증가 (더 긴 디바운스)
}

// 🔥 **핵심 수정: 전역 함수로 노출**
window.scheduleAutoSave = scheduleAutoSave;

let partyConfigSaveTimer = null;
function schedulePartyConfigSave() {
  if (partyConfigSaveTimer) {
    clearTimeout(partyConfigSaveTimer);
  }
  partyConfigSaveTimer = setTimeout(() => {
    scheduleAutoSave();
  }, 300);
}

// 자동 DB 저장 함수 - 실시간 동기화 전용 (Realtime Database)
async function autoSaveToDatabase() {
  try {
    // 실시간 동기화가 켜져있으면 세션 경로로 즉시 전파
    if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
      // CRUD 발생 시 즉시 저장 + 충돌 최소화를 위해 editLock 활용
      if (typeof window.realtimeSync.syncToFirebaseWithLock === 'function') {
        window.realtimeSync.syncToFirebaseWithLock();
      }
    } else {
      // 일반 모드에서는 localStorage에 저장
      localStorage.setItem('lostarkRaidState', JSON.stringify(state));
    }
  } catch (error) {
    console.error('❌ [AUTOSAVE] 자동 저장 중 오류 발생:', error);
  }
}

