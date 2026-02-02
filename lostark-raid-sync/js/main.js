// Global State
const state = {
  expedition: {},
  raid: {},
  raidPartyCounter: {},
  globalPartyCounter: 0,
  lastModifiedTimes: {
    expedition: {},
    raid: {}
  },
  history: {
    entries: [],
    maxEntries: 50
  },
  expeditionSlots: Array.from({length:8}, () => []),
  raidsData: [],
  selectedRaid: null,
  selectedDifficulty: null,
  raidTabs: {}
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
async function selectRaid(raidId) {
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('레이드 선택');
  }
  
  if (!acquired) return;
  
  try {
    const raid = state.raidsData.find(r => r.id === raidId);
    if (raid) {
      state.selectedRaid = raid;
      state.selectedDifficulty = raid.difficulties[0]; // 기본 난이도 선택
      
      // 개인별 선택 정보 로컬 저장
      savePersonalSettings();
      
      renderRaidTabs();
      renderRaidParties();
      scheduleAutoSave();
    }
  } finally {
    // 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('레이드 선택');
    }
  }
}

// 난이도 선택
async function selectDifficulty(difficultyId) {
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('난이도 선택');
  }
  
  if (!acquired) return;
  
  try {
    if (!state.selectedRaid) return;
    const difficulty = state.selectedRaid.difficulties.find(d => d.id === difficultyId);
    if (difficulty) {
      state.selectedDifficulty = difficulty;
      
      // 개인별 선택 정보 로컬 저장
      savePersonalSettings();
      
      renderRaidTabs();
      renderRaidParties();
      scheduleAutoSave();
    }
    
    applyRecommendedRequirements();
    renderRaidTabs();
    renderRaidParties();
    
    // 저장 (자동)
    scheduleAutoSave();
  } finally {
    // 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('난이도 선택');
    }
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

// 현재 탭의 공격대(파티들) 가져오기
function getCurrentTabParties() {
  if (!state.selectedRaid || !state.selectedDifficulty) return [];
  
  const raidId = state.selectedRaid.id;
  const difficultyId = state.selectedDifficulty.id;
  
  // state.raidTabs에서 공격대 데이터 가져오기
  if (state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId]) {
    return state.raidTabs[raidId][difficultyId];
  }
  
  return [];
}

// 통계용 공격대 데이터 가져오기 (디버그 로그 포함)
function getCurrentTabPartiesForStats() {
  if (!state.selectedRaid || !state.selectedDifficulty) return [];
  
  const raidId = state.selectedRaid.id;
  const difficultyId = state.selectedDifficulty.id;
  
  // state.raidTabs에서 공격대 데이터 가져오기
  if (state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId]) {
    return state.raidTabs[raidId][difficultyId];
  }
  
  return [];
}

// 새로운 레이드 추가
async function addNewRaid(skipHistory = false) {
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('레이드 추가');
  }
  
  if (!acquired) return;
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
  
  // 전역 파티 카운터로 고유한 ID 생성
  if (!state.globalPartyCounter) {
    state.globalPartyCounter = 0;
  }
  state.globalPartyCounter++;
  
  const partyId = String.fromCharCode(65 + state.raidPartyCounter[raidId][difficultyId]);
  state.raidPartyCounter[raidId][difficultyId]++;
  
  // 전역 고유 ID 생성
  const globalPartyId = `P${state.globalPartyCounter}`;
  const uniquePartyId = `${state.selectedRaid.id}-${state.selectedDifficulty.id}-${globalPartyId}`;
  const newParty = {
    id: globalPartyId, // 전역 고유 ID 사용
    uniqueId: uniquePartyId,
    displayName: `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${partyId}`, // 표시용 이름
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
  
  // state.raidTabs에 데이터 저장
  if (!state.raidTabs) {
    state.raidTabs = {};
  }
  if (!state.raidTabs[raidId]) {
    state.raidTabs[raidId] = {};
  }
  if (!state.raidTabs[raidId][difficultyId]) {
    state.raidTabs[raidId][difficultyId] = [];
  }
  
  // 히스토리 기록 (데이터 로드 시 제외)
  if (!skipHistory && typeof recordHistory === 'function') {
    await recordHistory(
      'add',
      {
        type: 'party',
        id: uniquePartyId,
        path: `raidTabs[${raidId}][${difficultyId}][${state.raidTabs[raidId][difficultyId].length}]`
      },
      null,
      newParty,
      `${newParty.name} 파티 생성`
    );
  }

  try {
    state.raidTabs[raidId][difficultyId].push(newParty);
    
    renderRaidParties();
    
    // 저장 (자동)
    scheduleAutoSave();
  } finally {
    // 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('레이드 추가');
    }
  }
}







// 레이드 이름 업데이트
async function updateRaidName(partyId, newName) {
  if (!state.selectedRaid || !state.selectedDifficulty) return;
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    const oldName = party.name;
    
    // 히스토리 기록
    await recordHistory(
      'update',
      {
        type: 'party',
        id: partyId,
        path: `party.name`
      },
      { name: oldName },
      { name: newName },
      `${partyId} 파티 이름 변경: "${oldName}" → "${newName}"`
    );
    
    party.name = newName;
    renderRaidParties();
    scheduleAutoSave();
  }
}

// 레이드 요구사항 업데이트
function updateRaidRequirements(partyId, requirementType, value) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    const oldValue = party[requirementType] || 0;
    const newValue = parseInt(value) || 0;
    
    // 히스토리 기록
    recordHistory(
      'update',
      {
        type: 'party',
        id: partyId,
        path: `party.${requirementType}`
      },
      { [requirementType]: oldValue },
      { [requirementType]: newValue },
      `${partyId} 파티 ${requirementType} 변경: ${oldValue} → ${newValue}`
    );
    
    party[requirementType] = newValue;
    renderRaidParties();
    schedulePartyConfigSave();
  }
}

// 레이드 크기 변경
function updateRaidSize(partyId, size) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || party.size === size) return;
  
  // 8명에서 4명으로 변경할 때 확인 필요
  if (party.size === 8 && size === 4) {
    const occupiedSlots = party.members.filter(m => m !== null).length;
    if (occupiedSlots > 4) {
      window.modalManager.showAlert({
        title: '경고',
        message: `현재 ${occupiedSlots}명의 캐릭터가 배치되어 있습니다. 4명으로 변경하면 ${occupiedSlots - 4}명의 캐릭터가 제거됩니다. 계속하시겠습니까?`,
        showConfirm: true,
        onConfirm: () => {
          performRaidSizeChange(party, size);
        }
      });
      return;
    }
  }
  
  performRaidSizeChange(party, size);
}

// 실제 레이드 크기 변경 수행
function performRaidSizeChange(party, size) {
  const oldSize = party.size;
  
  party.size = size;
  
  if (size > party.members.length) {
    party.members.push(...Array(size - party.members.length).fill(null));
  } else {
    // 잘려나가는 멤버들 기록 (히스토리용)
    const removedMembers = party.members.slice(size);
    
    // 멤버 자르기
    party.members = party.members.slice(0, size);
    
    // 제거된 멤버 히스토리 기록
    if (removedMembers.some(m => m !== null)) {
      recordHistory(
        'remove_members',
        {
          type: 'raid',
          id: party.id,
          path: `raidMembers[${party.id}]`
        },
        removedMembers,
        null,
        `${party.id} 레이드 크기 변경: ${oldSize}명 → ${size}명 (${removedMembers.filter(m => m !== null).length}명 제거)`
      );
    }
  }
  
  party.maxSupports = 1; // 레이드당 항상 1서폿
  renderRaidParties();
  schedulePartyConfigSave();
  
  // 크기 변경 완료 알림
  window.modalManager.showAlert({
    title: '레이드 크기 변경 완료',
    message: `레이드 크기가 ${oldSize}명에서 ${size}명으로 변경되었습니다.`
  });
}

async function setRaidSize(partyId, size) {
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    updateRaidSize(partyId, size);
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
    
    // 편집 실행 (동기화 모드에서는 확인 없이 바로 실행)
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    performRaidSizeChange(party, size);
    
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

// 레이드 제거
async function removeRaid(partyId) {
  console.log('🗑️ [REMOVE] Attempting to remove party:', partyId);
  
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('레이드 삭제');
  }
  
  if (!acquired) return;
  
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    const parties = getCurrentTabParties();
    console.log('🗑️ [REMOVE] Current parties before removal:', parties.map(p => p.id));
    
    const index = parties.findIndex(p => p.id === partyId);
    console.log('🗑️ [REMOVE] Party index to remove:', index);
    
    if (index !== -1) {
      const removedParty = parties[index];
      console.log('🗑️ [REMOVE] Party to remove:', removedParty);
      
      // 히스토리 기록
      if (typeof recordHistory === 'function') {
        await recordHistory(
          'delete',
          {
            type: 'party',
            id: partyId,
            path: `parties[${index}]`
          },
          removedParty,
          null,
          `${partyId} 파티 삭제`
        );
      }
      
      parties.splice(index, 1);
      console.log('🗑️ [REMOVE] Parties after splice:', parties.map(p => p.id));
      
      try {
        renderRaidParties();
        scheduleAutoSave();
      } finally {
        // 잠금 해제
        operationLock.release('파티 삭제');
      }
    } else {
      console.log('🗑️ [REMOVE] Party not found with ID:', partyId);
      // 잠금 해제
      operationLock.release('파티 삭제');
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
    console.log('🗑️ [REMOVE SYNC] Current parties before removal:', parties.map(p => p.id));
    
    const index = parties.findIndex(p => p.id === partyId);
    console.log('🗑️ [REMOVE SYNC] Party index to remove:', index);
    
    if (index !== -1) {
      const removedParty = parties[index];
      console.log('🗑️ [REMOVE SYNC] Party to remove:', removedParty);
      
      // 히스토리 기록
      if (typeof recordHistory === 'function') {
        await recordHistory(
          'delete',
          {
            type: 'party',
            id: partyId,
            path: `parties[${index}]`
          },
          removedParty,
          null,
          `${partyId} 파티 삭제 (실시간 동기화)`
        );
      }
      
      parties.splice(index, 1);
      console.log('🗑️ [REMOVE SYNC] Parties after splice:', parties.map(p => p.id));
      
      renderRaidParties();
    } else {
      console.log('🗑️ [REMOVE SYNC] Party not found with ID:', partyId);
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
  } finally {
    // 작업 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('레이드 삭제');
    }
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
  
  const { expeditionIndex, characterIndex, partyId, slotIndex } = window.currentEditPosition;
  
  let character = null;
  let characterLocation = '';
  
  if (partyId !== null && slotIndex !== null) {
    // 공격대 파티 캐릭터
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    if (party && party.members[slotIndex]) {
      character = party.members[slotIndex];
      characterLocation = `공격대 ${partyId} 슬롯 ${slotIndex}`;
    }
  } else {
    // 원정대 캐릭터
    if (state.expeditionSlots[expeditionIndex] && state.expeditionSlots[expeditionIndex][characterIndex]) {
      character = state.expeditionSlots[expeditionIndex][characterIndex];
      characterLocation = `원정대 슬롯 ${expeditionIndex + 1}-${characterIndex + 1}`;
    }
  }
  
  if (!character) {
    console.error('❌ [SAVE ERROR] 캐릭터를 찾을 수 없습니다:', { expeditionIndex, characterIndex, partyId, slotIndex });
    return;
  }
  
  // 버튼 비활성화
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>저장 중...';
  
  try {
    // 히스토리 기록 (수정 전 데이터)
    const oldCharacter = { ...character };
    const newCombatPower = document.getElementById('editCombatPower').value || '0';
    const newRole = document.querySelector('input[name="editRole"]:checked').value;
    
    // 정보 업데이트
    console.log('🔧 [EDIT] 수정 전:', {
      expeditionIndex,
      characterIndex,
      oldCombatPower: character.combatPower,
      oldRole: character.role,
      newCombatPower,
      newRole
    });
    
    character.combatPower = newCombatPower;
    character.role = newRole;
    
    console.log('🔧 [EDIT] 수정 후:', {
      updatedCombatPower: character.combatPower,
      updatedRole: character.role,
      stateCharacter: state.expeditionSlots[expeditionIndex][characterIndex]
    });
    
    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      recordHistory(
        'update',
        {
          type: 'character',
          id: `expeditionSlot_${expeditionIndex}_${characterIndex}`,
          path: `expeditionSlots[${expeditionIndex}][${characterIndex}]`
        },
        oldCharacter,
        { ...character },
        `원정대 슬롯 ${expeditionIndex + 1} 캐릭터 ${character.name} 정보 수정`
      );
    }
    
    // 데이터 즉시 저장
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      // 실시간 동기화가 켜져있으면 즉시 동기화
      if (typeof window.realtimeSync.syncToFirebaseWithLock === 'function') {
        await window.realtimeSync.syncToFirebaseWithLock();
      } else {
        await window.realtimeSync.syncToFirebase();
      }
    } else {
      // 실시간 동기화가 꺼져있으면 즉시 DB 저장
      await autoSaveToDatabase();
    }
    
    // 모달 입력 필드 즉시 업데이트 (모달이 열려있을 경우)
    const editCombatPowerInput = document.getElementById('editCombatPower');
    const originalCombatPowerSpan = document.getElementById('originalCombatPower');
    if (editCombatPowerInput && originalCombatPowerSpan) {
      editCombatPowerInput.value = newCombatPower;
      originalCombatPowerSpan.textContent = newCombatPower;
    }
    
    // UI 업데이트 (저장 후)
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
  renderRaidListModal();
  const modal = new bootstrap.Modal(document.getElementById('raidListModal'));
  modal.show();
}

// 홍보글 생성 함수
function generatePromotionText() {
  try {
    // 각 원정대별 최고 레벨 캐릭터 찾기
    const expeditionTopChars = [];
    
    for (let i = 0; i < 8; i++) {
      const expeditionChars = state.expeditionSlots[i] || [];
      let topChar = null;
      let maxIlvl = 0;
      
      expeditionChars.forEach(char => {
        if (char && char.ilvl) {
          const ilvl = parseInt(char.ilvl.replace(/,/g, ''));
          if (ilvl > maxIlvl) {
            maxIlvl = ilvl;
            topChar = char;
          }
        }
      });
      
      if (topChar) {
        expeditionTopChars.push({
          expeditionNum: i + 1,
          char: topChar,
          ilvl: maxIlvl
        });
      }
    }
    
    // 아이템 레벨 기준으로 정렬
    expeditionTopChars.sort((a, b) => b.ilvl - a.ilvl);
    
    // 홍보글 템플릿
    let promotionText = `<<<직장인 공대 워or붕쯔 모집>> 5000+(유도리o)
:__~234: 요일 : 수,목  21:30~01:00
:__~234: 철새 찍먹 사절 + 찐득하게 할분만 + 야행성 환영
:__~234: 레이드를 되도록 같이 즐길 곳을 찾는분
:__~234: 필수: 윗레이드4개(본캐,부캐) 필수 그 외 자율`;
    
    // 원정대별 캐릭터 정보 추가 (좌우 4명씩 배치)
    const leftSide = [];
    const rightSide = [];
    
    expeditionTopChars.forEach((exp, index) => {
      const lineNum = 1766 - index;
      const charName = exp.char.name || '알 수 없음';
      const charClass = exp.char.class || '알 수 없음';
      const ilvl = exp.ilvl.toLocaleString();
      
      const charInfo = `${lineNum}: ${charName}.${ilvl}`;
      
      if (index < 4) {
        leftSide.push(charInfo);
      } else {
        rightSide.push(charInfo);
      }
    });
    
    // 좌우 4명씩 배치하여 추가
    const maxLines = Math.max(leftSide.length, rightSide.length);
    for (let i = 0; i < maxLines; i++) {
      const leftText = leftSide[i] || '';
      const rightText = rightSide[i] || '';
      
      if (leftText && rightText) {
        promotionText += `
${leftText}       ${rightText}`;
      } else if (leftText) {
        promotionText += `
${leftText}`;
      } else if (rightText) {
        promotionText += `
${rightText}`;
      }
    }
    
    // 워디 정보 추가 (워딘이 있으면 마지막 줄에 추가)
    const wodiIndex = expeditionTopChars.findIndex(exp => exp.char.class && exp.char.class.includes('워딘'));
    if (wodiIndex !== -1) {
      const wodiLineNum = 1766 - expeditionTopChars.length;
      promotionText += `
     워or디           ${wodiLineNum}: 건슬.5241`;
    }
    
    // 마무리 문구
    promotionText += `

새 공대원 적극 환영!! 본캐점수보다 원정대체급선호!!`;
    
    // 모달로 홍보글 표시
    showPromotionModal(promotionText);
    
  } catch (error) {
    console.error('홍보글 생성 중 오류 발생:', error);
    alert('홍보글 생성 중 오류가 발생했습니다.');
  }
}

// 홍보글 모달 표시 함수
function showPromotionModal(text) {
  const modalHtml = `
    <div class="modal fade" id="promotionModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-megaphone me-2"></i>공대 홍보글
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <button class="btn btn-primary" onclick="copyPromotionText()">
                <i class="bi bi-clipboard"></i> 복사하기
              </button>
              <button class="btn btn-secondary" onclick="downloadPromotionText()">
                <i class="bi bi-download"></i> 다운로드
              </button>
            </div>
            <textarea class="form-control" id="promotionText" rows="15" readonly>${text}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('promotionModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 새 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('promotionModal'));
  modal.show();
  
  // 모달 닫힐 때 제거
  document.getElementById('promotionModal').addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

// 홍보글 복사 함수
function copyPromotionText() {
  const textArea = document.getElementById('promotionText');
  if (textArea) {
    textArea.select();
    document.execCommand('copy');
    
    // 복사 성공 알림
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="bi bi-check"></i> 복사됨!';
    button.classList.remove('btn-primary');
    button.classList.add('btn-success');
    
    setTimeout(() => {
      button.innerHTML = originalText;
      button.classList.remove('btn-success');
      button.classList.add('btn-primary');
    }, 2000);
  }
}

// 홍보글 다운로드 함수
function downloadPromotionText() {
  const text = document.getElementById('promotionText').value;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `공대_홍보글_${new Date().toLocaleDateString().replace(/\//g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  setTimeout(() => {
    a.remove();
  }, 0);
}

// 공대 리스트 스크린샷 함수
function captureRaidList() {
  // html2canvas 라이브러리 로드 확인
  if (typeof html2canvas === 'undefined') {
    // 라이브러리가 없으면 동적으로 로드
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = function() {
      captureRaidListWithLibrary();
    };
    document.head.appendChild(script);
  } else {
    captureRaidListWithLibrary();
  }
}

// html2canvas로 스크린샷 촬영
function captureRaidListWithLibrary() {
  try {
    const element = document.getElementById('raidListContent');
    if (!element) {
      alert('공대 리스트를 찾을 수 없습니다.');
      return;
    }

    // 스크린샷 버튼 숨기기
    const buttons = document.querySelector('#raidListModal .modal-body .mb-3');
    const originalDisplay = buttons ? buttons.style.display : '';
    if (buttons) {
      buttons.style.display = 'none';
    }

    // html2canvas로 캡처
    html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, // 고화질
      logging: false,
      useCORS: true,
      allowTaint: true
    }).then(canvas => {
      // 버튼 다시 보이기
      if (buttons) {
        buttons.style.display = originalDisplay;
      }

      // 캔버스를 이미지로 변환하여 다운로드
      canvas.toBlob(function(blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `공대_리스트_${new Date().toLocaleDateString().replace(/\//g, '-')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 'image/png');

    }).catch(error => {
      // 버튼 다시 보이기
      if (buttons) {
        buttons.style.display = originalDisplay;
      }
      console.error('스크린샷 생성 중 오류 발생:', error);
      alert('스크린샷 생성 중 오류가 발생했습니다.');
    });

  } catch (error) {
    console.error('스크린샷 함수 실행 중 오류:', error);
    alert('스크린샷 기능을 실행할 수 없습니다.');
  }
}

function renderRaidListModal() {
  const content = document.getElementById('raidListContent');
  if (!content) return;
  
  let html = '<ul class="nav nav-tabs mb-4" id="raidListTabs" role="tablist">';
  
  // 레이드 탭 생성
  state.raidsData.forEach((raid, index) => {
    const isActive = index === 0 ? 'active' : '';
    html += `
      <li class="nav-item" role="presentation">
        <button class="nav-link ${isActive}" 
                id="raidList-tab-${raid.id}" 
                data-bs-toggle="tab" 
                data-bs-target="#raidList-${raid.id}" 
                type="button" 
                role="tab">
          ${raid.name}
        </button>
      </li>
    `;
  });
  
  html += '</ul>';
  html += '<div class="tab-content" id="raidListTabContent">';
  
  // 각 레이드의 난이도별 공격대 카드 생성
  state.raidsData.forEach((raid, index) => {
    const isActive = index === 0 ? 'show active' : '';
    html += `<div class="tab-pane fade ${isActive}" id="raidList-${raid.id}" role="tabpanel">`;
    
    raid.difficulties.forEach(difficulty => {
      const raidId = raid.id;
      const difficultyId = difficulty.id;
      const parties = state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId] 
        ? state.raidTabs[raidId][difficultyId] 
        : [];
      
      // 난이도별 색상 설정
      let difficultyColor = 'text-primary';
      let badgeColor = 'bg-secondary';
      
      if (difficulty.id === 'nightmare') {
        difficultyColor = 'text-danger';
        badgeColor = 'bg-danger';
      } else if (difficulty.id === 'hard') {
        difficultyColor = 'text-warning';
        badgeColor = 'bg-warning';
      } else if (difficulty.id === 'normal') {
        difficultyColor = 'text-success';
        badgeColor = 'bg-success';
      }
      
      html += `
        <div class="mb-4">
          <h6 class="${difficultyColor} mb-3">
            <i class="bi bi-shield-fill me-2"></i>${difficulty.name}
            <span class="badge ${badgeColor} ms-2 text-white">${parties.length}개 공격대</span>
          </h6>
          <div class="row g-3">
      `;
      
      if (parties.length === 0) {
        html += `
          <div class="col-12">
            <div class="alert alert-light text-center">
              <i class="bi bi-inbox me-2"></i>생성된 공격대가 없습니다
            </div>
          </div>
        `;
      } else {
        parties.forEach(party => {
          const validMembers = party.members.filter(m => m !== null);
          const supportCount = validMembers.filter(m => m?.role === 'support').length;
          const completionRate = party.size > 0 ? Math.round((validMembers.length / party.size) * 100) : 0;
          const statusBadge = completionRate === 100 ? 'bg-success' : 
                             completionRate >= 50 ? 'bg-warning' : 'bg-danger';
          const status = completionRate === 100 ? '완성' : 
                        completionRate >= 50 ? '진행중' : '미완성';
          
          // 평균 전투력 계산
          const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name)).filter(m => m !== null);
          const avgCombatPower = validMembersWithDetails.length > 0
            ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
            : 0;
          const avgIlvl = validMembersWithDetails.length > 0
            ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.ilvl || '0'), 0) / validMembersWithDetails.length)
            : 0;
          
          html += `
            <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6">
              <div class="card border-0 shadow-sm" style="font-size: 0.7rem;">
                <div class="card-header bg-light py-1">
                  <h6 class="card-title mb-0" style="font-size: 0.75rem;">
                    <i class="bi bi-people-fill me-1"></i>${party.name}
                  </h6>
                </div>
                <div class="card-body p-1">
                  <div class="text-center mb-1">
                    <small class="text-muted">인원 ${validMembers.length}/${party.size}</small>
                    <span class="mx-1">|</span>
                    <small class="text-primary">평균 CP ${avgCombatPower.toLocaleString()}</small>
                  </div>
                  
                  ${validMembers.length > 0 ? `
                    <div class="d-flex flex-column gap-0">
                      ${validMembers.map(member => {
                        const charDetails = getCharacterDetailsFromExpedition(member.name);
                        const roleIcon = charDetails?.role === 'support' ? '🛡️' : '⚔️';
                        const roleColor = charDetails?.role === 'support' ? 'text-success' : 'text-danger';
                        return `
                          <div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="font-size: 0.65rem;">
                            <span class="text-truncate" style="max-width: 70px;">
                              ${member.name || '알 수 없음'}
                            </span>
                            <span class="${roleColor}" style="font-size: 0.7rem;">${roleIcon}</span>
                            <small class="text-muted">${charDetails?.ilvl || '?'}</small>
                            <small class="text-primary">${(charDetails?.combatPower || '0').toLocaleString()}</small>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `
                    <div class="text-center text-muted py-2" style="font-size: 0.65rem;">
                      배정된 캐릭터 없음
                    </div>
                  `}
                </div>
              </div>
            </div>
          `;
        });
      }
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  });
  
  html += '</div>';
  
  content.innerHTML = html;
}

function showStatisticsModal() {
  const modal = new bootstrap.Modal(document.getElementById('statisticsModal'));
  modal.show();
  
  // 통계 데이터 계산 및 표시
  calculateAndDisplayStatistics();
}


// 초기화
async function initializeRaids() {
  // loadRaidsData가 이미 호출되었는지 확인
  if (!state.raidsData || state.raidsData.length === 0) {
    await loadRaidsData();
  }
  if (!state.selectedRaid || !state.selectedDifficulty) return;
  
  renderRaidTabs();
  
  // 레드 크기에 따라 파티 자동 생성 (이미 파티가 없는 경우에만)
  const raidSize = state.selectedRaid.size || 4;
  const expectedPartyCount = raidSize === 8 ? 2 : 1;
  const currentParties = getCurrentTabParties();
  
  // 현재 파티 수가 예상보다 적을 때만 생성
  if (currentParties.length < expectedPartyCount) {
    const partiesToAdd = expectedPartyCount - currentParties.length;
    for (let i = 0; i < partiesToAdd; i++) {
      addNewRaid(true);  // 데이터 로드 시 히스토리 기록 건너뜀
    }
  }
  
  applyRecommendedRequirements();
  renderRaidParties();
  renderExpedition(); // 원정대도 초기화 시 렌더링
}

// DB에서 데이터 불러오기 (Realtime Database)
async function loadFromDatabase() {
  try {
        
    // URL에서 동기화 코드 확인
    const syncCode = window.realtimeSync.getSyncCode();
        
    let dataPath;
    let snapshot;
    
    if (syncCode) {
      // 동기화 코드가 있으면 syncSessions에서 데이터 조회
      dataPath = `syncSessions/${syncCode}`;
            snapshot = await realtimeDB.ref(dataPath).once('value');
    } else {
      // 동기화 코드가 없으면 일반 데이터 경로에서 조회
      dataPath = 'raidData/currentData';
            snapshot = await realtimeDB.ref(dataPath).once('value');
    }
    
        
    if (snapshot.exists()) {
      const data = snapshot.val();
            
      // 동기화 세션인 경우 compressed data (d)에서 추출
      let expeditionData = null;
      let raidTabsData = null;
      let selectedRaidData = null;
      
      if (syncCode && data.d) {
        // 동기화 세션 데이터 (compressed format)
        const compressedData = data.d;
        
        expeditionData = compressedData.es; // expeditionSlots
        raidTabsData = compressedData.rt; // raidTabs
        selectedRaidData = compressedData.sr; // selectedRaid
        
              } else if (!syncCode) {
        // 일반 데이터
                expeditionData = data.es;
        raidTabsData = data.rt;
        selectedRaidData = data.sr;
      } else {
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
              
              // raidPartyCounter 초기화 (이미 초기화되었는지 확인)
              if (!state.raidPartyCounter[raidId]) {
                state.raidPartyCounter[raidId] = {};
              }
              if (!state.raidPartyCounter[raidId][difficultyId]) {
                state.raidPartyCounter[raidId][difficultyId] = 0;
              }
              
              // 전역 파티 카운터 초기화
              if (!state.globalPartyCounter) {
                state.globalPartyCounter = 0;
              }
              
              // 기존 파티 ID를 고유하게 업데이트
              parties.forEach(party => {
                party.raidId = raidId;
                party.difficultyId = difficultyId;
                
                // 기존 파티가 단일 문자 ID(A, B 등)인 경우 고유 ID로 변경
                if (party.id && party.id.length === 1 && /^[A-Z]$/.test(party.id)) {
                  // 전역 고유 ID 생성
                  state.globalPartyCounter++;
                  const newGlobalId = `P${state.globalPartyCounter}`;
                  const oldId = party.id;
                  
                  // ID 업데이트
                  party.id = newGlobalId;
                  party.uniqueId = `${raidId}-${difficultyId}-${newGlobalId}`;
                  party.displayName = party.name; // 기존 이름을 displayName로 저장
                  party.name = `${party.raidName || raidId} ${party.difficultyName || difficultyId} ${oldId}`;
                }
                
                // uniqueId가 없을 때만 설정 (중복 방지)
                if (!party.uniqueId) {
                  party.uniqueId = `${raidId}-${difficultyId}-${party.id}`;
                }
                
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

// 개인별 설정 저장
function savePersonalSettings() {
  try {
    const personalSettings = {
      selectedRaidId: state.selectedRaid ? state.selectedRaid.id : null,
      selectedDifficultyId: state.selectedDifficulty ? state.selectedDifficulty.id : null
    };
    localStorage.setItem('lostarkRaidPersonalSettings', JSON.stringify(personalSettings));
    console.log('💾 [PERSONAL] 개인별 설정 저장됨:', personalSettings);
  } catch (error) {
    console.error('❌ [PERSONAL] 개인별 설정 저장 실패:', error);
  }
}

// 개인별 설정 로드
function loadPersonalSettings() {
  try {
    const saved = localStorage.getItem('lostarkRaidPersonalSettings');
    if (saved) {
      const personalSettings = JSON.parse(saved);
      
      // 저장된 레이드 선택
      if (personalSettings.selectedRaidId) {
        const raid = state.raidsData.find(r => r.id === personalSettings.selectedRaidId);
        if (raid) {
          state.selectedRaid = raid;
          
          // 저장된 난이도 선택
          if (personalSettings.selectedDifficultyId) {
            const difficulty = raid.difficulties.find(d => d.id === personalSettings.selectedDifficultyId);
            if (difficulty) {
              state.selectedDifficulty = difficulty;
            } else {
              state.selectedDifficulty = raid.difficulties[0] || null;
            }
          } else {
            state.selectedDifficulty = raid.difficulties[0] || null;
          }
        }
      }
      
      console.log('📂 [PERSONAL] 개인별 설정 로드됨:', personalSettings);
    }
  } catch (error) {
    console.error('❌ [PERSONAL] 개인별 설정 로드 실패:', error);
  }
}

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
  // 먼저 레이드 데이터 로드
  loadRaidsData().then(() => {
    // 개인별 설정 로드
    loadPersonalSettings();
    
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
    // 단, 이미 초기화되었는지 확인
    if (!state.raidsData || state.raidsData.length === 0) {
      initializeRaids();
    }
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
async function autoAssign() {
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('자동 추천');
  }
  
  if (!acquired) return;
  
  try {
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

  let assignedCount = 0;
  let supportCount = 0;

  // 각 파티에 캐릭터 배치
  parties.forEach(party => {
    // 유틸리티 함수: 원정대 슬롯 인덱스 가져오기
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
        // 공격대에는 캐릭터 ID와 이름 저장
        party.members[i] = { 
          id: picked.id,
          name: picked.name 
        };
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
        // 공격대에는 캐릭터 ID와 이름 저장
        party.members[i] = { 
          id: picked.id,
          name: picked.name 
        };
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
  } finally {
    // 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('자동 추천');
    }
  }
}

async function balancedAssign() {
  // 작업 잠금 확인 (안전한 확인)
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    window.modalManager.showAlert({
      title: '작업 중',
      message: `현재 ${window.operationLock.getCurrentOperation()} 중입니다. 잠시 후 다시 시도해주세요.`
    });
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('균등 분배');
  }
  
  if (!acquired) return;
  
  try {
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
      const oldMember = party.members[i];
      const newMember = {
        id: picked.id,
        name: picked.name
      };
      
      // 히스토리 기록
      if (typeof recordHistory === 'function') {
        recordHistory(
          'add',
          {
            type: 'character',
            id: `${party.id}_slot${i}`,
            path: `party.members[${i}]`
          },
          oldMember,
          newMember,
          `균등 배치: ${party.id} 파티 ${i}번 슬롯에 ${picked.name} 캐릭터 추가`
        );
      }
      
      party.members[i] = newMember;
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
      const oldMember = party.members[emptyIndex];
      const newMember = {
        id: picked.id,
        name: picked.name
      };
      
      // 히스토리 기록
      if (typeof recordHistory === 'function') {
        recordHistory(
          'add',
          {
            type: 'character',
            id: `${party.id}_slot${emptyIndex}`,
            path: `party.members[${emptyIndex}]`
          },
          oldMember,
          newMember,
          `균등 배치: ${party.id} 파티 ${emptyIndex}번 슬롯에 ${picked.name} 캐릭터 추가`
        );
      }
      
      party.members[emptyIndex] = newMember;
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
  } finally {
    // 잠금 해제 (안전한 확인)
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('균등 분배');
    }
  }
}
