// Global State
const state = {
  expeditionSlots: Array.from({length:8}, () => []),
  raidsData: [],
  selectedRaid: null,
  selectedDifficulty: null,
  raidTabs: {},
  raidPartyCounter: {},
  lastModifiedTimes: {
    expedition: {},
    raid: {}
  }
};


// 레이드 데이터 로드
async function loadRaidsData() {
  try {
    const response = await fetch('data/raids.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    state.raidsData = data.raids || [];
    
    if (state.raidsData.length > 0 && state.raidsData[0].difficulties && state.raidsData[0].difficulties.length > 0) {
      state.selectedRaid = state.raidsData[0];
      state.selectedDifficulty = state.raidsData[0].difficulties[0];
    }
  } catch (error) {
    console.error('❌ [RAID DATA ERROR]:', error);
    // 기본 데이터 설정
    state.raidsData = [{
      id: 'serkaris',
      name: '세르카',
      difficulties: [
        { id: 'nightmare', name: '나이트메어', minIlvl: 1740 },
        { id: 'hard', name: '하드', minIlvl: 1730 },
        { id: 'normal', name: '노말', minIlvl: 1710 }
      ]
    }];
    state.selectedRaid = state.raidsData[0];
    state.selectedDifficulty = state.raidsData[0].difficulties[0];
  }
}

// 레이드 선택
function selectRaid(raidId) {
  const raid = state.raidsData.find(r => r.id === raidId);
  if (raid) {
    state.selectedRaid = raid;
    state.selectedDifficulty = raid.difficulties[0];
    
    // 레이드/난이도별 데이터 구조 확인만 하고, 자동 생성은 하지 않음
    const raidId = state.selectedRaid.id;
    const difficultyId = state.selectedDifficulty.id;
    if (!state.raidTabs[raidId]) state.raidTabs[raidId] = {};
    // 데이터가 없어도 빈 배열만 설정하고 자동 생성하지 않음
    if (!state.raidTabs[raidId][difficultyId]) {
      state.raidTabs[raidId][difficultyId] = [];
    }
    
    applyRecommendedRequirements();
    renderRaidTabs();
    renderRaidParties();
    
    // 저장 (자동)
    scheduleAutoSave();
  }
}

// 난이도 선택
function selectDifficulty(difficultyId) {
  if (!state.selectedRaid) return;
  const difficulty = state.selectedRaid.difficulties.find(d => d.id === difficultyId);
  if (difficulty) {
    state.selectedDifficulty = difficulty;
    
    // 난이도별 데이터 구조 확인만 하고, 자동 생성은 하지 않음
    const raidId = state.selectedRaid.id;
    const difficultyId = difficulty.id;
    if (!state.raidTabs[raidId]) state.raidTabs[raidId] = {};
    // 데이터가 없어도 빈 배열만 설정하고 자동 생성하지 않음
    if (!state.raidTabs[raidId][difficultyId]) {
      state.raidTabs[raidId][difficultyId] = [];
    }
    
    applyRecommendedRequirements();
    renderRaidTabs();
    renderRaidParties();
    
    // 저장 (자동)
    scheduleAutoSave();
  }
}

// 권장 요구사항 적용
function applyRecommendedRequirements() {
  if (!state.selectedDifficulty) return;
  const parties = getCurrentTabParties();
  const recommendedIlvl = state.selectedDifficulty.minIlvl || 0;
  const recommendedCombatPower = state.selectedDifficulty.minCombatPower || 0;
  
  parties.forEach(party => {
    party.minIlvl = recommendedIlvl;
    party.minCombatPower = recommendedCombatPower;
  });
}

// 현재 탭의 파티 가져오기
function getCurrentTabParties() {
  if (!state.selectedRaid || !state.selectedDifficulty) return [];
  
  const raidId = state.selectedRaid.id;
  const difficultyId = state.selectedDifficulty.id;
  
  if (!state.raidTabs[raidId]) state.raidTabs[raidId] = {};
  if (!state.raidTabs[raidId][difficultyId]) state.raidTabs[raidId][difficultyId] = [];
  if (!state.raidPartyCounter[raidId]) state.raidPartyCounter[raidId] = {};
  if (!state.raidPartyCounter[raidId][difficultyId]) state.raidPartyCounter[raidId][difficultyId] = 0;
  
  // 파티 객체에 raidId와 difficultyId가 있는지 확인하고 없으면 추가
  const parties = state.raidTabs[raidId][difficultyId];
  parties.forEach(party => {
    if (!party.raidId) party.raidId = raidId;
    if (!party.difficultyId) party.difficultyId = difficultyId;
    if (!party.uniqueId) party.uniqueId = `${raidId}-${difficultyId}-${party.id}`; // 고유 ID 설정
    if (!party.raidName) party.raidName = state.selectedRaid.name;
    if (!party.difficultyName) party.difficultyName = state.selectedDifficulty.name;
  });
  
  return parties;
}

// 공격대 파티 추가
function addRaidParty() {
  if (!state.selectedRaid || !state.selectedDifficulty) {
    window.modalManager.showAlert({
      title: '알림',
      message: '먼저 레이드를 선택해주세요.'
    });
    return;
  }
  
  const parties = getCurrentTabParties();
  const raidId = state.selectedRaid.id;
  const difficultyId = state.selectedDifficulty.id;
  
  // raidPartyCounter 초기화 확인
  if (!state.raidPartyCounter[raidId]) {
    state.raidPartyCounter[raidId] = {};
  }
  if (!state.raidPartyCounter[raidId][difficultyId]) {
    state.raidPartyCounter[raidId][difficultyId] = 0;
  }
  
  const partyId = String.fromCharCode(65 + state.raidPartyCounter[raidId][difficultyId]);
  state.raidPartyCounter[raidId][difficultyId]++;
  
  const uniquePartyId = `${state.selectedRaid.id}-${state.selectedDifficulty.id}-${partyId}`;
  const newParty = {
    id: partyId,
    uniqueId: uniquePartyId, // 고유 ID 추가
    name: `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${partyId}`,
    raidId: state.selectedRaid.id,
    difficultyId: state.selectedDifficulty.id,
    raidName: state.selectedRaid.name,
    difficultyName: state.selectedDifficulty.name,
    members: Array(4).fill(null), // 기본 4인
    maxSupports: 1, // 4인당 1서폿
    size: 4, // 현재 파티 크기
    minIlvl: state.selectedDifficulty.minIlvl,
    minCombatPower: state.selectedDifficulty.minCombatPower || 0
  };
  
  parties.push(newParty);
  renderRaidParties();
  
  // 저장 (자동)
  scheduleAutoSave();
}







// 파티 이름 업데이트
function updatePartyName(partyId, newName) {
  if (!state.selectedRaid || !state.selectedDifficulty) return;
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    party.name = newName;
    renderRaidParties();
    schedulePartyConfigSave();
  }
}

// 파티 요구사항 업데이트
function updatePartyRequirements(partyId, requirementType, value) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    party[requirementType] = parseInt(value) || 0;
    renderRaidParties();
    schedulePartyConfigSave();
  }
}

// 파티 크기 변경
function updatePartySize(partyId, size) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || party.size === size) return;
  
  party.size = size;
  
  if (size > party.members.length) {
    party.members.push(...Array(size - party.members.length).fill(null));
  } else {
    party.members = party.members.slice(0, size);
  }
  
  party.maxSupports = 1; // 파티당 항상 1서폿
  renderRaidParties();
  schedulePartyConfigSave();
}

async function setPartySize(partyId, size) {
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    updatePartySize(partyId, size);
    // 저장
    scheduleAutoSave();
    return;
  }
  
  // 실시간 동기화 모드에서는 충돌 감지
  const canEdit = await window.realtimeSync.checkEditLock();
  if (!canEdit) {
    window.modalManager.showAlert({
      title: '편집 충돌',
      message: '다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.'
    });
    return;
  }
  
  try {
    // 편집 잠금 설정
    await window.realtimeSync.setEditLock();
    
    // 편집 실행
    updatePartySize(partyId, size);
    
    // 잠금 해제
    await window.realtimeSync.clearEditLock();
    
    // 저장 및 동기화
    scheduleAutoSave();
    
  } catch (error) {
    console.error('❌ [PARTY SIZE ERROR]:', error);
    
    // 에러 발생 시 잠금 해제
    await window.realtimeSync.clearEditLock();
    
    window.modalManager.showAlert({
      title: '오류',
      message: '파티 크기 변경 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 파티 제거
async function removeRaidParty(partyId) {
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    const parties = getCurrentTabParties();
    const index = parties.findIndex(p => p.id === partyId);
    if (index !== -1) {
      parties.splice(index, 1);
      renderRaidParties();
      scheduleAutoSave();
    }
    return;
  }
  
  // 실시간 동기화 모드에서는 충돌 감지
  const canEdit = await window.realtimeSync.checkEditLock();
  if (!canEdit) {
    window.modalManager.showAlert({
      title: '편집 충돌',
      message: '다른 사용자가 현재 편집 중입니다. 잠시 후 다시 시도해주세요.'
    });
    return;
  }
  
  try {
    // 편집 잠금 설정
    await window.realtimeSync.setEditLock();
    
    // 편집 실행
    const parties = getCurrentTabParties();
    const index = parties.findIndex(p => p.id === partyId);
    if (index !== -1) {
      parties.splice(index, 1);
      renderRaidParties();
    }
    
    // 잠금 해제
    await window.realtimeSync.clearEditLock();
    
    // 저장 및 동기화
    scheduleAutoSave();
    
  } catch (error) {
    console.error('❌ [PARTY REMOVE ERROR]:', error);
    
    // 에러 발생 시 잠금 해제
    await window.realtimeSync.clearEditLock();
    
    window.modalManager.showAlert({
      title: '오류',
      message: '파티 제거 중 오류가 발생했습니다: ' + error.message
    });
  }
}

function parseCompareNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  // ',' 제거 -> '.' 이하는 절삭 -> 숫자만 남김
  const beforeDot = raw.split('.')[0];
  const noComma = beforeDot.replace(/,/g, '');
  const digitsOnly = noComma.replace(/[^0-9]/g, '');
  const n = parseInt(digitsOnly || '0', 10);
  return Number.isFinite(n) ? n : 0;
}

// 요구사항 충족 여부 확인
function meetsRequirements(character, party) {
  const charIlvl = parseCompareNumber(character.ilvl || '0');
  const charCombatPower = parseCompareNumber(character.combatPower || '0');
  
  return charIlvl >= party.minIlvl && charCombatPower >= party.minCombatPower;
}






// 캐릭터 정보 저장
async function saveCharacterEdit() {
  // 중복 클릭 방지
  const saveButton = document.getElementById('saveCharacterButton');
  if (saveButton.disabled) {
    return;
  }
  
  if (!window.currentEditPosition) return;
  
  const { expeditionIndex, characterIndex } = window.currentEditPosition;
  const character = state.expeditionSlots[expeditionIndex][characterIndex];
  
  if (!character) return;
  
  // 버튼 비활성화
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>저장 중...';
  
  try {
    // 정보 업데이트
    character.combatPower = document.getElementById('editCombatPower').value || '0';
    character.role = document.querySelector('input[name="editRole"]:checked').value;
    
    // UI 업데이트
    renderExpedition();
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('characterEditModal'));
    modal.hide();
    
    window.modalManager.showAlert({
      title: '수정 완료',
      message: `${character.name} 캐릭터 정보가 수정되었습니다.`
    });
    
    // 실시간 동기화는 scheduleAutoSave() -> autoSaveToDatabase()에서 처리
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.clearEditLock();
    }
    
  } catch (error) {
    console.error('❌ [CHARACTER SAVE ERROR]:', error);
    
    // 에러 발생 시 잠금 해제
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.clearEditLock();
    }
    
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 정보 저장 중 오류가 발생했습니다: ' + error.message
    });
  } finally {
    // 버튼 활성화
    saveButton.disabled = false;
    saveButton.innerHTML = '저장';
  }
}

// 모달 표시 함수들
function showExpeditionModal() {
  renderExpeditionModal(); // 모달용 원정대 렌더링
  const modal = new bootstrap.Modal(document.getElementById('expeditionModal'));
  modal.show();
}

function showRaidListModal() {
  const modal = new bootstrap.Modal(document.getElementById('raidListModal'));
  modal.show();
}

function showStatisticsModal() {
  const modal = new bootstrap.Modal(document.getElementById('statisticsModal'));
  modal.show();
  
  // 통계 데이터 계산 및 표시
  calculateAndDisplayStatistics();
}


// 초기화
async function initializeRaids() {
  await loadRaidsData();
  if (!state.selectedRaid || !state.selectedDifficulty) return;
  
  renderRaidTabs();
  
  // 레드 크기에 따라 파티 자동 생성
  const raidSize = state.selectedRaid.size || 4;
  const partyCount = raidSize === 8 ? 2 : 1;
  
  for (let i = 0; i < partyCount; i++) {
    addRaidParty();
  }
  
  applyRecommendedRequirements();
  renderRaidParties();
  renderExpedition(); // 원정대도 초기화 시 렌더링
}

// DB에서 데이터 불러오기 (Realtime Database)
async function loadFromDatabase() {
  try {
    console.log('🔄 [LOAD] Starting data load from Realtime Database...');
    console.log('🔄 [LOAD] Current expeditionSlots before load:', state.expeditionSlots);
    
    // URL에서 동기화 코드 확인
    const syncCode = window.realtimeSync.getSyncCode();
    console.log('🔄 [LOAD] Sync code from URL:', syncCode);
    
    let dataPath;
    let snapshot;
    
    if (syncCode) {
      // 동기화 코드가 있으면 syncSessions에서 데이터 조회
      dataPath = `syncSessions/${syncCode}`;
      console.log('🔄 [LOAD] Loading from sync session path:', dataPath);
      snapshot = await realtimeDB.ref(dataPath).once('value');
    } else {
      // 동기화 코드가 없으면 일반 데이터 경로에서 조회
      dataPath = 'raidData/currentData';
      console.log('🔄 [LOAD] Loading from default path:', dataPath);
      snapshot = await realtimeDB.ref(dataPath).once('value');
    }
    
    console.log('🔍 [LOAD] Snapshot exists:', snapshot.exists());
    console.log('🔍 [LOAD] Data path used:', dataPath);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('📥 [LOAD] Raw data from Realtime Database:', data);
      console.log('📥 [LOAD] Data keys:', Object.keys(data));
      
      // 동기화 세션인 경우 compressed data (d)에서 추출
      let expeditionData = null;
      let raidTabsData = null;
      let selectedRaidData = null;
      
      if (syncCode && data.d) {
        // 동기화 세션 데이터 (compressed format)
        console.log('📥 [LOAD] Found sync session data, extracting from compressed format');
        const compressedData = data.d;
        console.log('📥 [LOAD] Compressed data structure:', compressedData);
        
        expeditionData = compressedData.es; // expeditionSlots
        raidTabsData = compressedData.rt; // raidTabs
        selectedRaidData = compressedData.sr; // selectedRaid
        
        console.log('📥 [LOAD] Extracted expedition data (es):', expeditionData);
        console.log('📥 [LOAD] Extracted raid tabs data (rt):', raidTabsData);
        console.log('📥 [LOAD] Extracted selected raid data (sr):', selectedRaidData);
      } else if (!syncCode) {
        // 일반 데이터
        console.log('📥 [LOAD] Found regular data format');
        expeditionData = data.es;
        raidTabsData = data.rt;
        selectedRaidData = data.sr;
      } else {
        console.log('⚠️ [LOAD] Unexpected data format for sync session');
        console.log('⚠️ [LOAD] Available keys:', Object.keys(data));
      }
      
      // raidTabs 복원
      if (raidTabsData) {
        try {
          state.raidTabs = JSON.parse(raidTabsData);
          console.log('✅ [LOAD] Raid tabs restored:', state.raidTabs);
          
          // 복원된 파티 객체에 raidId와 difficultyId 설정
          Object.keys(state.raidTabs).forEach(raidId => {
            Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
              const parties = state.raidTabs[raidId][difficultyId];
              parties.forEach(party => {
                party.raidId = raidId;
                party.difficultyId = difficultyId;
                party.uniqueId = `${raidId}-${difficultyId}-${party.id}`; // 고유 ID 설정
                // raidName과 difficultyName도 설정
                const raid = state.raidsData?.find(r => r.id === raidId);
                const difficulty = raid?.difficulties?.find(d => d.id === difficultyId);
                if (raid) party.raidName = raid.name;
                if (difficulty) party.difficultyName = difficulty.name;
              });
            });
          });
          
          console.log('✅ [LOAD] Party IDs updated for all parties');
        } catch (error) {
          console.error('❌ [LOAD] Failed to parse raidTabs:', error);
        }
      } else {
        console.log('⚠️ [LOAD] No raidTabs data found');
      }
      
      // expeditionSlots 복원
      if (expeditionData) {
        try {
          const parsedExpedition = JSON.parse(expeditionData);
          console.log('📊 [LOAD] Parsed expedition data:', parsedExpedition);
          console.log('📊 [LOAD] Parsed expedition type:', typeof parsedExpedition);
          console.log('📊 [LOAD] Parsed expedition length:', parsedExpedition.length);
          
          state.expeditionSlots = parsedExpedition;
          console.log('✅ [LOAD] Expedition slots restored:', state.expeditionSlots);
          console.log('✅ [LOAD] Final expeditionSlots length:', state.expeditionSlots.length);
          
          // 각 슬롯 상세 정보 로그
          state.expeditionSlots.forEach((slot, index) => {
            console.log(`📊 [LOAD] Slot ${index}: ${slot.length} characters`, slot);
          });
        } catch (error) {
          console.error('❌ [LOAD] Failed to parse expeditionSlots:', error);
          console.error('❌ [LOAD] Raw expeditionSlots data:', expeditionData);
        }
      } else {
        console.log('⚠️ [LOAD] No expeditionSlots data found');
      }
      
      // selectedRaid 복원
      if (selectedRaidData) {
        const raid = state.raidsData.find(r => r.id === selectedRaidData);
        if (raid) {
          state.selectedRaid = raid;
          if (syncCode && data.d && data.d.sd) {
            const diff = raid.difficulties?.find(d => d.id === data.d.sd);
            state.selectedDifficulty = diff || raid.difficulties?.[0] || null;
          } else {
            state.selectedDifficulty = raid.difficulties?.[0] || null;
          }
          console.log('✅ [LOAD] Selected raid restored:', raid.name);
        } else {
          console.log('⚠️ [LOAD] Selected raid not found:', selectedRaidData);
        }
      } else {
        console.log('⚠️ [LOAD] No selectedRaid data found');
      }
      
      console.log('🔄 [LOAD] About to update UI...');
      console.log('🔄 [LOAD] Final state before render:', {
        expeditionSlots: state.expeditionSlots,
        raidTabs: state.raidTabs,
        selectedRaid: state.selectedRaid
      });
      
      // UI 업데이트
      renderRaidTabs();
      renderRaidParties();
      renderExpedition();
      
      console.log('✅ [LOAD] All data loaded and UI updated');
    } else {
      console.log('ℹ️ [LOAD] No data found in path:', dataPath);
      console.log('ℹ️ [LOAD] Default expeditionSlots:', state.expeditionSlots);
    }
  } catch (error) {
    console.error('❌ [LOAD ERROR]:', error);
    console.error('❌ [LOAD ERROR Stack]:', error.stack);
  }
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
  // 먼저 레이드 데이터 로드
  loadRaidsData().then(() => {
    // 그 다음 DB에서 저장된 데이터 로드
    loadFromDatabase();
  });
  
  // 원정대 초기 렌더링
  renderExpedition();
  
  // URL에서 동기화 코드 확인
  const syncCode = window.realtimeSync.getSyncCode();
  if (syncCode) {
    console.log(`🔄 [SYNC] Found sync code in URL: ${syncCode}`);
    window.realtimeSync.init(syncCode);
    
    // 동기화 모드에서도 기본 초기화는 필요
    initializeRaids();
  } else {
    // 일반 초기화
    initializeRaids();
  }
});

// 원정대 패널 토글
function toggleExpeditionPanel() {
  const panelBody = document.getElementById('expeditionPanelBody');
  const toggleIcon = document.getElementById('expeditionToggleIcon');
  
  if (panelBody.style.display === 'none') {
    panelBody.style.display = 'block';
    toggleIcon.className = 'bi bi-chevron-up';
  } else {
    panelBody.style.display = 'none';
    toggleIcon.className = 'bi bi-chevron-down';
  }
}



// 자동 추천 기능
function autoAssign() {
  const parties = getCurrentTabParties();
  if (parties.length === 0) {
    window.modalManager.showAlert({
      title: '알림',
      message: '먼저 공격대 파티를 생성해주세요.'
    });
    return;
  }

  // 원정대에서 사용 가능한 캐릭터 수집 (제약 조건 적용)
  const allCharacters = Constraints.getAvailableCharacters();

  if (allCharacters.length === 0) {
    window.modalManager.showAlert({
      title: '알림',
      message: '원정대에 사용 가능한 캐릭터가 없습니다. 중복 캐릭터를 제외하고 배치 가능합니다.'
    });
    return;
  }

  // 역할별로 캐릭터 분류
  const supports = allCharacters.filter(char => char.role === 'support');
  const dps = allCharacters.filter(char => char.role === 'dps');

  // 각 파티에 캐릭터 배치
  let assignedCount = 0;
  parties.forEach(party => {
    // 기존 배치를 유지하면서 size에 맞게 members 길이만 보정
    if (!Array.isArray(party.members)) party.members = [];
    if (party.members.length < party.size) {
      party.members = party.members.concat(Array(party.size - party.members.length).fill(null));
    } else if (party.members.length > party.size) {
      party.members = party.members.slice(0, party.size);
    }
    
    // 서폿 우선 배치 (파티당 최대 서폿 수) - 기존 배치 포함
    // 공격대에 저장된 이름으로 원정대에서 상세 정보를 가져와서 역할 확인
    let supportCount = (party.members || []).filter(m => {
      if (!m) return false;
      const charDetails = getCharacterDetailsFromExpedition(m.name);
      return charDetails?.role === 'support';
    }).length;

    const getUsedExpeditionSlotIndices = () => {
      const used = new Set();
      (party.members || []).forEach(m => {
        if (!m) return;
        const idx = Constraints.getExpeditionSlotIndexByCharacterName(m.name);
        if (idx !== null && idx !== undefined) used.add(idx);
      });
      return used;
    };
    
    // 서폿 배치 (제약 조건 확인) - 빈 슬롯만 채움
    for (let i = 0; i < party.size && supportCount < party.maxSupports && supports.length > 0; i++) {
      if (party.members[i]) continue;
      // 유효한 캐릭터가 나올 때까지 스킵
      while (supports.length > 0) {
        const usedSlots = getUsedExpeditionSlotIndices();
        let pickIndex = supports.findIndex(c => {
          const slotIdx = Constraints.getExpeditionSlotIndexByCharacterName(c.name);
          return slotIdx !== null && !usedSlots.has(slotIdx) && Constraints.canAddCharacterToParty(party, c).valid;
        });
        if (pickIndex === -1) {
          pickIndex = supports.findIndex(c => Constraints.canAddCharacterToParty(party, c).valid);
        }
        if (pickIndex === -1) {
          break;
        }
        const picked = supports.splice(pickIndex, 1)[0];
        // 공격대에는 캐릭터 이름만 저장
        party.members[i] = { name: picked.name };
        supportCount++;
        assignedCount++;
        break;
      }
    }
    
    // DPS 배치 (제약 조건 확인) - 빈 슬롯만 채움
    for (let i = 0; i < party.size && dps.length > 0; i++) {
      if (party.members[i]) continue;
      while (dps.length > 0) {
        const usedSlots = getUsedExpeditionSlotIndices();
        let pickIndex = dps.findIndex(c => {
          const slotIdx = Constraints.getExpeditionSlotIndexByCharacterName(c.name);
          return slotIdx !== null && !usedSlots.has(slotIdx) && Constraints.canAddCharacterToParty(party, c).valid;
        });
        if (pickIndex === -1) {
          pickIndex = dps.findIndex(c => Constraints.canAddCharacterToParty(party, c).valid);
        }
        if (pickIndex === -1) {
          break;
        }
        const picked = dps.splice(pickIndex, 1)[0];
        // 공격대에는 캐릭터 이름만 저장
        party.members[i] = { name: picked.name };
        assignedCount++;
        break;
      }
    }
  });

  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 저장
  scheduleAutoSave();

  window.modalManager.showAlert({
    title: '자동 추천 완료',
    message: `${assignedCount}명의 캐릭터를 공격대에 배치했습니다.\n서폿 우선 배치: ${supports.length}명 남음\nDPS 배치: ${dps.length}명 남음\n(모든 제약 조건 적용 완료)`
  });
}

function balancedAssign() {
  const parties = getCurrentTabParties();
  if (parties.length === 0) {
    window.modalManager.showAlert({
      title: '알림',
      message: '먼저 공격대 파티를 생성해주세요.'
    });
    return;
  }

  // 원정대에서 사용 가능한 캐릭터 수집 (제약 조건 적용)
  const allCharacters = Constraints.getAvailableCharacters();

  if (allCharacters.length === 0) {
    window.modalManager.showAlert({
      title: '알림',
      message: '원정대에 사용 가능한 캐릭터가 없습니다. 중복 캐릭터를 제외하고 배치 가능합니다.'
    });
    return;
  }

  // 빈 슬롯 수 계산 (기존 배치 유지)
  const totalEmptySlots = parties.reduce((sum, party) => {
    const members = Array.isArray(party.members) ? party.members : [];
    const partySize = party.size || members.length;
    const normalized = members.length < partySize
      ? members.concat(Array(partySize - members.length).fill(null))
      : members.slice(0, partySize);
    return sum + normalized.filter(m => m === null).length;
  }, 0);
  
  // 캐릭터를 전투력 순으로 정렬
  const sortedCharacters = allCharacters.sort((a, b) => {
    const cpA = parseCompareNumber(a.combatPower || '0');
    const cpB = parseCompareNumber(b.combatPower || '0');
    return cpB - cpA; // 내림차순 (높은 CP 우선)
  });

  // 역할별로 분리
  const supports = sortedCharacters.filter(char => char.role === 'support');
  const dps = sortedCharacters.filter(char => char.role === 'dps');

  // 각 파티에 균등하게 분배 (기존 배치 유지)
  let assignedCount = 0;
  // 1) 서폿: 각 파티의 "부족한 서폿"만 채움
  parties.forEach(party => {
    if (!Array.isArray(party.members)) party.members = [];
    if (party.members.length < party.size) {
      party.members = party.members.concat(Array(party.size - party.members.length).fill(null));
    } else if (party.members.length > party.size) {
      party.members = party.members.slice(0, party.size);
    }

    const existingSupports = party.members.filter(m => m?.role === 'support').length;
    const supportsNeeded = Math.max(0, (party.maxSupports || 0) - existingSupports);
    if (supportsNeeded <= 0) return;

    let placedSupports = 0;
    for (let i = 0; i < party.size && placedSupports < supportsNeeded && supports.length > 0; i++) {
      if (party.members[i]) continue;

      const usedSlots = new Set();
      party.members.forEach(m => {
        if (!m) return;
        const idx = Constraints.getExpeditionSlotIndexByCharacterName(m.name);
        if (idx !== null && idx !== undefined) usedSlots.add(idx);
      });

      let pickIndex = supports.findIndex(c => {
        const slotIdx = Constraints.getExpeditionSlotIndexByCharacterName(c.name);
        return slotIdx !== null && !usedSlots.has(slotIdx) && Constraints.canAddCharacterToParty(party, c).valid;
      });
      if (pickIndex === -1) {
        pickIndex = supports.findIndex(c => Constraints.canAddCharacterToParty(party, c).valid);
      }
      if (pickIndex === -1) break;

      const picked = supports.splice(pickIndex, 1)[0];
      party.members[i] = picked;
      assignedCount++;
      placedSupports++;
    }
  });

  // 2) DPS: 남은 빈 슬롯을 라운드로빈으로 채움 (기존 배치 유지)
  let safety = 0;
  while (dps.length > 0 && safety < 5000) {
    safety++;
    let placedThisRound = 0;

    for (const party of parties) {
      const emptyIndex = (party.members || []).findIndex(m => m === null);
      if (emptyIndex === -1) continue;

      const usedSlots = new Set();
      (party.members || []).forEach(m => {
        if (!m) return;
        const idx = Constraints.getExpeditionSlotIndexByCharacterName(m.name);
        if (idx !== null && idx !== undefined) usedSlots.add(idx);
      });

      let pickIndex = dps.findIndex(c => {
        const slotIdx = Constraints.getExpeditionSlotIndexByCharacterName(c.name);
        return slotIdx !== null && !usedSlots.has(slotIdx) && Constraints.canAddCharacterToParty(party, c).valid;
      });
      if (pickIndex === -1) {
        pickIndex = dps.findIndex(c => Constraints.canAddCharacterToParty(party, c).valid);
      }
      if (pickIndex === -1) continue;

      const picked = dps.splice(pickIndex, 1)[0];
      party.members[emptyIndex] = picked;
      assignedCount++;
      placedThisRound++;

      if (dps.length === 0) break;
    }

    if (placedThisRound === 0) break;
  }

  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 저장
  scheduleAutoSave();

  // 각 파티의 평균 전투력 계산
  const partyStats = parties.map(party => {
    const validMembers = party.members.filter(m => m !== null);
    const avgCp = validMembers.length > 0 
      ? Math.round(validMembers.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembers.length)
      : 0;
    const supportCount = validMembers.filter(m => m.role === 'support').length;
    return {
      name: party.name,
      members: validMembers.length,
      avgCp: avgCp.toLocaleString(),
      supports: supportCount
    };
  });

  const statsMessage = partyStats.map(stat => 
    `${stat.name}: ${stat.members}명 (평균 CP: ${stat.avgCp}, 서폿: ${stat.supports})`
  ).join('\n');

  window.modalManager.showAlert({
    title: '균등 분배 완료',
    message: `${assignedCount}명의 캐릭터를 균등하게 분배했습니다.\n\n${statsMessage}\n\n(모든 제약 조건 적용 완료)`
  });
}
