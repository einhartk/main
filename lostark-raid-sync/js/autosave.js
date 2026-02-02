let autoSaveTimer = null;
function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    autoSaveToDatabase();
  }, 500); // 250ms -> 500ms로 증가 (더 긴 디바운스)
}

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
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      // CRUD 발생 시 즉시 저장 + 충돌 최소화를 위해 editLock 활용
      if (typeof window.realtimeSync.syncToFirebaseWithLock === 'function') {
        window.realtimeSync.syncToFirebaseWithLock();
      } else {
        window.realtimeSync.syncToFirebase();
      }
      return;
    }

    // Realtime Database는 중첩 배열을 지원하지 않으므로 JSON 문자열로 직렬화
    const serializedRaidTabs = JSON.stringify(state.raidTabs);
    const serializedExpedition = JSON.stringify(state.expeditionSlots);
    
    const saveData = {
      rt: serializedRaidTabs, // raidTabs -> rt (JSON string)
      es: serializedExpedition, // expeditionSlots -> es (JSON string)
      // sr 제외 - 개인별 선택 정보는 저장하지 않음
      t: new Date().toISOString(), // time -> t
      m: Date.now() // modified -> m
    };
    
    // Realtime Database에 저장
    await realtimeDB.ref('raidData/currentData').set(saveData);
    
    console.log('💾 [AUTO SAVE] Serialized data saved to Realtime Database');
    
  } catch (error) {
    console.error('❌ [AUTO SAVE ERROR]:', error);
  }
}

