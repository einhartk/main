// Global State - State Manager 충돌 방지를 위해 임시 비활성화
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
  expeditionSlotNames: Array.from({length:8}, (_, i) => `원정대 ${i + 1}`),
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

// 권장 요구사항 적용 (DB 저장값이 없을 때만)
function applyRecommendedRequirements() {
  if (!state.selectedDifficulty) return;
  const parties = getCurrentTabParties();
  const recommendedIlvl = state.selectedDifficulty.minIlvl || 0;
  const recommendedCombatPower = state.selectedDifficulty.minCombatPower || 0;
  
  parties.forEach(party => {
    // DB 저장값이 없을 때만 JSON 값으로 설정
    if (!party.minIlvl) {
      party.minIlvl = recommendedIlvl;
    }
    if (!party.minCombatPower) {
      party.minCombatPower = recommendedCombatPower;
    }
  });
}

// 현재 탭의 공격대(파티들) 가져오기
function getCurrentTabParties() {
  if (!state.selectedRaid || !state.selectedDifficulty) return [];
  
  const raidId = state.selectedRaid.id;
  const difficultyId = state.selectedDifficulty.id;
  
  return state.raidTabs[raidId]?.[difficultyId] || [];
}

// 🔥 **핵심 수정: 전역 함수로 노출**
window.getCurrentTabParties = getCurrentTabParties;

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

// 파티 순번 마이그레이션 함수
function migratePartyOrder() {
  if (!state.raidTabs) return;
  
  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach((party, index) => {
          if (party && typeof party === 'object' && party.order === undefined) {
            party.order = index + 1; // 1부터 시작하는 순번
          }
        });
      }
    });
  });
}

// 파티 순서 변경 함수
function reorderParties(raidId, difficultyId, fromIndex, toIndex) {
  const parties = state.raidTabs[raidId][difficultyId];
  if (!parties || fromIndex === toIndex) return;
  
  // 파티 배열에서 순서 변경
  const [movedParty] = parties.splice(fromIndex, 1);
  parties.splice(toIndex, 0, movedParty);
  
  // 순번 재설정
  parties.forEach((party, index) => {
    if (party) {
      party.order = index + 1;
    }
  });
  
  // 히스토리 기록
  if (typeof recordHistory === 'function') {
    recordHistory(
      'reorder',
      {
        type: 'party_reorder',
        raidId,
        difficultyId,
        path: `raidTabs.${raidId}.${difficultyId}`
      },
      { fromIndex, toIndex },
      { fromIndex, toIndex },
      `파티 순서 변경: ${fromIndex + 1}번 → ${toIndex + 1}번`
    );
  }
  
  // UI 업데이트 - 즉시 렌더링 (드래그 앤 드롭은 즉시 피드백 필요)
  renderRaidParties();
  scheduleAutoSave();
}

// 🔥 **새로 추가**: 파티 순번 직접 업데이트 함수
async function updatePartyOrder(partyId, newOrder) {
  try {
    // 순번 유효성 검사
    const order = parseInt(newOrder);
    if (isNaN(order) || order < 1 || order > 99) {
      console.warn('⚠️ [ORDER] 유효하지 않은 스케줄 순서:', newOrder);
      return;
    }
    
    // 파티 찾기
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    
    if (!party) {
      console.error('❌ [ORDER] 파티를 찾을 수 없음:', partyId);
      return;
    }
    
    const oldOrder = party.order || 0;
    
    // 순번이 동일하면 처리하지 않음
    if (oldOrder === order) {
      return;
    }
    
    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      await recordHistory(
        'update',
        {
          type: 'party_schedule_order',
          operation: 'update',
          target: { 
            raidId: party.raidId, 
            difficultyId: party.difficultyId, 
            partyId: party.id 
          }
        },
        { scheduleOrder: oldOrder },
        { scheduleOrder: order },
        `${party.displayName} 스케줄 순서 변경: ${oldOrder}번 → ${order}번`
      );
    }
    
    // 스케줄 순서 업데이트
    party.order = order;
    
    // UI 업데이트
    renderRaidParties();
    scheduleAutoSave();
    
    console.log(`✅ [ORDER] ${party.displayName} 스케줄 순서가 ${oldOrder}번에서 ${order}번으로 변경되었습니다.`);
    
  } catch (error) {
    console.error('❌ [ORDER] 스케줄 순서 업데이트 오류:', error);
  }
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
  
  // 🔥 **중요 수정**: 단일 ID 생성 로직으로 통일
  const globalPartyId = `P${state.globalPartyCounter}`;
  const uniquePartyId = `${state.selectedRaid.id}-${state.selectedDifficulty.id}-${globalPartyId}`;
  
  // 순번 결정 (기존 파티들 중 가장 큰 순번 + 1)
  const maxOrder = parties.length > 0 ? Math.max(...parties.map(p => p.order || 0)) : 0;
  
  const newParty = {
    id: globalPartyId, // 🔥 **단일 ID 사용**
    uniqueId: uniquePartyId, // 전체 경로용
    displayName: `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${state.globalPartyCounter}`, // 🔥 **번호로 표시**
    name: `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${state.globalPartyCounter}`,
    raidId: state.selectedRaid.id,
    difficultyId: state.selectedDifficulty.id,
    raidName: state.selectedRaid.name,
    difficultyName: state.selectedDifficulty.name,
    order: maxOrder + 1, // 순번 추가
    cleared: false, // 클리어 상태 기본값
    scheduledWeekday: null, // 약속 요일
    scheduledHour: null, // 약속 시간
    scheduledTime: null, // 기존 호환성 (ISO 문자열)
    scheduledTimeDisplay: '', // 기존 호환성 (표시용 시간 문자열)
    createdAt: new Date().toISOString(), // 생성 시간 추가
    members: Array(4).fill(null), // 기본 4인
    maxSupports: 1, // 4인 1서폿 / 8인 2서폿
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
    // State Manager가 없으면 기존 방식으로 처리
    if (!window.stateManager || !window.stateManager.atomicUpdate) {
      state.raidTabs[raidId][difficultyId].push(newParty);
      renderRaidParties(true); // 즉시 렌더링
      scheduleAutoSave();
    } else {
      // State Manager로 원자적 업데이트
      await window.stateManager.atomicUpdate(`raidTabs.${raidId}.${difficultyId}`, async (currentParties) => {
        const newParties = [...currentParties];
        newParties.push(newParty);
        return newParties;
      }, {
        recordHistory: true,
        autoSave: true,
        renderUI: true,
        historyData: {
          type: 'party',
          operation: 'add',
          target: { raidId, difficultyId, partyId: newParty.id },
          description: `파티 추가: ${newParty.name}`
        }
      });
    }
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
  if (party && party.name !== newName) {
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
    
    // 🔥 **중요 수정**: displayName도 함께 업데이트
    party.displayName = newName;
    
    // UI 업데이트 - 즉시 렌더링 (파티 이름 변경은 즉시 피드백 필요)
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
    
    // 값이 변경된 경우에만 처리
    if (oldValue !== newValue) {
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
      
      // UI 업데이트 - 즉시 렌더링 (요구사항 변경은 즉시 피드백 필요)
      renderRaidParties();
      
      scheduleAutoSave();
    }
  }
}

// 레이드 크기 변경
function updateRaidSize(partyId, size) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || party.size === size) return;
  
  const raidId = state.selectedRaid?.id;
  const difficultyId = state.selectedDifficulty?.id;
  
  // 8명에서 4명으로 변경할 때 확인 필요
  if (party.size === 8 && size === 4) {
    const occupiedSlots = party.members.filter(m => m !== null).length;
    if (occupiedSlots > 4) {
      window.modalManager.showConfirm({
        title: '경고',
        message: `현재 ${occupiedSlots}명의 캐릭터가 배치되어 있습니다. 4명으로 변경하면 ${occupiedSlots - 4}명의 캐릭터가 제거됩니다. 계속하시겠습니까?`,
        confirmText: '계속',
        cancelText: '취소',
        onConfirm: () => {
          performRaidSizeChange(party, size, raidId, difficultyId, partyId);
        }
      });
      return;
    }
  }

  performRaidSizeChange(party, size, raidId, difficultyId, partyId);
}

// 실제 레이드 크기 변경 수행
async function performRaidSizeChange(party, size, raidId, difficultyId, partyId) {
  const oldSize = party.size;

  party.size = size;
  
  if (size > party.members.length) {
    party.members.push(...Array(size - party.members.length).fill(null));
  } else {
    const removedMembers = party.members.slice(size);
    party.members = party.members.slice(0, size);
    
    if (removedMembers.some(m => m !== null)) {
      await recordHistory(
        'remove_members',
        {
          type: 'raid',
          raidId: raidId,
          difficultyId: difficultyId,
          partyId: partyId
        },
        { members: removedMembers },
        { members: [] },
        `파티 크기 조정으로 ${removedMembers.length}명의 멤버 제거됨`
      );
    }
  }

  party.maxSupports = party.size === 8 ? 2 : 1; // 4인 1서폿, 8인 2서폿
  
  // UI 업데이트 - 즉시 렌더링 (파티 크기 변경은 즉시 피드백 필요)
  renderRaidParties();
  
  scheduleAutoSave();
  
  window.modalManager.showAlert({
    title: '레이드 크기 변경 완료',
    message: `${party.name} 파티 크기가 ${oldSize}명에서 ${size}명으로 변경되었습니다.`
  });
  return;
  
  // State Manager로 원자적 업데이트
  await window.stateManager.atomicUpdate(`raidTabs.${raidId}.${difficultyId}`, async (currentParties) => {
    const newParties = [...currentParties];
    const partyIndex = newParties.findIndex(p => p.id === partyId);
    if (partyIndex === -1) return currentParties;
    
    const party = { ...newParties[partyIndex] };
    const oldMembers = [...party.members];
    
    party.size = size;
    
    if (size > party.members.length) {
      party.members = [...party.members, ...Array(size - party.members.length).fill(null)];
    } else {
      // 잘려나가는 멤버들 기록
      const removedMembers = party.members.slice(size);
      party.members = party.members.slice(0, size);
      
      // 제거된 멤버 히스토리를 위한 데이터 저장
      party._removedMembers = removedMembers;
    }
    
    party.maxSupports = party.size === 8 ? 2 : 1; // 4인 1서폿, 8인 2서폿
    newParties[partyIndex] = party;
    
    return newParties;
  }, {
    recordHistory: true,
    autoSave: true,
    renderUI: true,
    historyData: {
      type: 'raid',
      operation: 'update',
      target: { raidId, difficultyId, partyId },
      description: `파티 크기 변경: ${oldSize} → ${size}`
    }
  });
  
  // 크기 변경 완료 알림
  window.modalManager.showAlert({
    title: '레이드 크기 변경 완료',
    message: `레이드 크기가 ${oldSize}명에서 ${size}명으로 변경되었습니다.`
  });
}

async function setRaidSize(partyId, size) {
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 updateRaidSize 호출 (확인 모달 포함)
    updateRaidSize(partyId, size);
    return;
  }
  
  // 실시간 동기화 모드에서도 확인 로직이 필요
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || party.size === size) return;
  
  const raidId = state.selectedRaid?.id;
  const difficultyId = state.selectedDifficulty?.id;
  
  // 8명에서 4명으로 변경할 때 확인 필요
  if (party.size === 8 && size === 4) {
    const occupiedSlots = party.members.filter(m => m !== null).length;
    if (occupiedSlots > 4) {
      window.modalManager.showConfirm({
        title: '경고',
        message: `현재 ${occupiedSlots}명의 캐릭터가 배치되어 있습니다. 4명으로 변경하면 ${occupiedSlots - 4}명의 캐릭터가 제거됩니다. 계속하시겠습니까?`,
        confirmText: '계속',
        cancelText: '취소',
        onConfirm: async () => {
          // 실시간 동기화 모드에서의 충돌 감지 및 실행
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
            performRaidSizeChange(party, size, raidId, difficultyId, partyId);
            
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
      });
      return;
    }
  }
  
  // 일반적인 크기 변경 (확인 없이 바로 실행)
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
    performRaidSizeChange(party, size, raidId, difficultyId, partyId);
    
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
  
  // 🔥 **중요 수정**: ID 유효성 강화 검증
  console.log(`🔍 [REMOVE] 삭제 요청 파티 ID: "${partyId}"`);
  
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    const raidId = state.selectedRaid?.id;
    const difficultyId = state.selectedDifficulty?.id;
    const parties = getCurrentTabParties();
    
    // 🔥 **중요 수정**: 다양한 ID 매칭 시도
    let index = -1;
    let foundParty = null;
    
    // 1. 정확한 ID 매칭
    index = parties.findIndex(p => p.id === partyId);
    if (index !== -1) {
      foundParty = parties[index];
      console.log(`✅ [REMOVE] 정확한 ID 매칭 성공: index=${index}`);
    }
    
    // 2. uniqueId 매칭 (fallback)
    if (index === -1) {
      index = parties.findIndex(p => p.uniqueId === partyId);
      if (index !== -1) {
        foundParty = parties[index];
        console.log(`✅ [REMOVE] uniqueId 매칭 성공: index=${index}`);
      }
    }
    
    // 3. displayName 부분 매칭 (최후의 수단)
    if (index === -1 && partyId.includes('P')) {
      const partyNumber = partyId.replace('P', '');
      index = parties.findIndex(p => p.displayName && p.displayName.includes(partyNumber));
      if (index !== -1) {
        foundParty = parties[index];
        console.log(`✅ [REMOVE] displayName 부분 매칭 성공: index=${index}`);
      }
    }

    if (index !== -1 && foundParty) {
      const removedParty = foundParty;

      // 히스토리 기록
      if (typeof recordHistory === 'function') {
        await recordHistory(
          'delete',
          {
            type: 'party',
            id: foundParty.id, // 실제 파티 ID 사용
            path: `parties[${index}]`
          },
          removedParty,
          null,
          `${foundParty.displayName} 파티 삭제`
        );
      }
      
      // State Manager가 없으면 기존 방식으로 처리
      if (!window.stateManager || !window.stateManager.atomicUpdate) {
        parties.splice(index, 1);

        try {
          renderRaidParties(true); // 즉시 렌더링
          scheduleAutoSave();
        } finally {
          if (window.operationLock && typeof window.operationLock.release === 'function') {
            window.operationLock.release('파티 삭제');
          }
        }
      } else {
        // State Manager로 원자적 삭제
        const newParties = parties.filter((_, i) => i !== index);
        
        await window.stateManager.atomicUpdate(`raidTabs.${raidId}.${difficultyId}`, async () => {
          return newParties;
        }, {
          recordHistory: true,
          autoSave: true,
          renderUI: true,
          historyData: {
            type: 'party',
            operation: 'delete',
            target: { raidId, difficultyId, partyId: foundParty.id },
            description: `파티 삭제: ${removedParty.displayName}`
          }
        });

        try {
          if (window.operationLock && typeof window.operationLock.release === 'function') {
            window.operationLock.release('파티 삭제');
          }
        } catch (e) {
          console.error('❌ [REMOVE] Lock release error:', e);
        }
      }
    } else {
      // 🔥 **중요 수정**: 상세한 오류 정보 출력
      console.error(`❌ [REMOVE] 파티 찾기 실패:`, {
        requestedId: partyId,
        availableParties: parties.map(p => ({
          id: p.id,
          uniqueId: p.uniqueId,
          displayName: p.displayName
        }))
      });
      
      window.modalManager.showAlert({
        title: '오류',
        message: `파티 ID "${partyId}"를 찾을 수 없습니다.`
      });
      
      try {
        if (window.operationLock && typeof window.operationLock.release === 'function') {
          window.operationLock.release('파티 삭제');
        }
      } catch (e) {
        console.error('❌ [REMOVE] Lock release error:', e);
      }
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
    const raidId = state.selectedRaid?.id;
    const difficultyId = state.selectedDifficulty?.id;
    const index = parties.findIndex(p => p.id === partyId);

    if (index !== -1) {
      const removedParty = parties[index];

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
      
      // 기존 방식으로 직접 삭제 (State Manager 비활성화)
      const newParties = parties.filter((_, i) => i !== index);
      
      // state.raidTabs 업데이트
      if (state.raidTabs && state.raidTabs[raidId] && state.raidTabs[raidId][difficultyId]) {
        state.raidTabs[raidId][difficultyId] = newParties;
      }
      
      // UI 업데이트 및 저장
      renderRaidParties(true); // 즉시 렌더링
      scheduleAutoSave();
    }

    // 잠금 해제
    await window.realtimeSync.clearEditLock();
    
  } catch (error) {
    console.error('❌ [PARTY REMOVE ERROR]:', error);
    
    // 에러 발생 시 잠금 해제
    if (window.realtimeSync && typeof window.realtimeSync.clearEditLock === 'function') {
      await window.realtimeSync.clearEditLock();
    }
    
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
    const newIlvl = document.getElementById('editIlvl').value || '0';
    const newRole = document.querySelector('input[name="editRole"]:checked').value;
    
    // 콤마 포맷 적용하여 저장
    character.combatPower = newCombatPower.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    character.ilvl = newIlvl.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    character.role = newRole;

    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      if (partyId !== null && slotIndex !== null) {
        // 공격대 파티 캐릭터
        recordHistory(
          'update',
          {
            type: 'character',
            id: `raid_${partyId}_${slotIndex}`,
            path: `raidTabs.${state.selectedRaid.id}.${state.selectedDifficulty.id}.${partyId}.members[${slotIndex}]`
          },
          oldCharacter,
          { ...character },
          `${characterLocation} 캐릭터 ${character.name} 정보 수정`
        );
      } else {
        // 원정대 캐릭터
        recordHistory(
          'update',
          {
            type: 'character',
            id: `expeditionSlot_${expeditionIndex}_${characterIndex}`,
            path: `expeditionSlots[${expeditionIndex}][${characterIndex}]`
          },
          oldCharacter,
          { ...character },
          `${characterLocation} 캐릭터 ${character.name} 정보 수정`
        );
      }
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
    const editIlvlInput = document.getElementById('editIlvl');
    const originalIlvlSpan = document.getElementById('originalIlvl');
    
    if (editCombatPowerInput && originalCombatPowerSpan) {
      editCombatPowerInput.value = newCombatPower.replace(/,/g, ''); // 입력 필드는 콤마 제거
      originalCombatPowerSpan.textContent = newCombatPower.replace(/\B(?=(\d{3})+(?!\d))/g, ','); // 원본은 콤마 포맷
    }
    
    if (editIlvlInput && originalIlvlSpan) {
      editIlvlInput.value = newIlvl.replace(/,/g, ''); // 입력 필드는 콤마 제거
      originalIlvlSpan.textContent = newIlvl.replace(/\B(?=(\d{3})+(?!\d))/g, ','); // 원본은 콤마 포맷
    }

    // UI 업데이트 (저장 후)
    if (partyId !== null && slotIndex !== null) {
      // 공격대 파티 캐릭터 수정 시
      renderRaidParties();
    } else {
      // 원정대 캐릭터 수정 시
      renderExpedition();
      
      // 원정대 관리 모달이 열려있으면 모달 내용도 업데이트
      const expeditionModal = document.getElementById('expeditionModal');
      if (expeditionModal && expeditionModal.classList.contains('show')) {
        renderExpeditionModal();
      }
    }
    
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

// 헤더에서 개별 파티 클리어 토글 함수
function toggleRaidSlotClearInHeader(raidId, difficultyId, partyId, element) {
  const parties = state.raidTabs[raidId][difficultyId] || [];
  const party = parties.find(p => p.id === partyId);
  
  if (party) {
    const newClearedState = !party.cleared;
    
    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      recordHistory(
        'update',
        {
          type: 'party_clear_header',
          id: `raid_${raidId}_${difficultyId}_${partyId}`,
          path: `raidTabs.${raidId}.${difficultyId}.cleared`
        },
        { cleared: party.cleared },
        { cleared: newClearedState },
        `헤더에서 ${party.name} 클리어 상태 변경: ${newClearedState ? '클리어' : '해제'}`
      );
    }
    
    // 상태 변경
    party.cleared = newClearedState;
    
    // UI 업데이트
    renderRaidListModal();
    renderRaidParties();
    renderExpedition();
    
    // 저장
    scheduleAutoSave();
    
    // 완료 알림
    window.modalManager.showAlert({
      title: '클리어 상태 변경',
      message: `${party.name}을(를) ${newClearedState ? '클리어' : '해제'}했습니다.`
    });
  }
}

// 모달에서 개별 파티 슬롯 클리어 토글 함수
function toggleRaidSlotClear(raidId, difficultyId, partyId, element) {
  const parties = state.raidTabs[raidId][difficultyId] || [];
  const party = parties.find(p => p.id === partyId);
  
  if (party) {
    const newClearedState = !party.cleared;
    
    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      recordHistory(
        'update',
        {
          type: 'party_clear_modal',
          id: `raid_${raidId}_${difficultyId}_${partyId}`,
          path: `raidTabs.${raidId}.${difficultyId}.cleared`
        },
        { cleared: party.cleared },
        { cleared: newClearedState },
        `모달에서 ${party.name} 클리어 상태 변경: ${newClearedState ? '클리어' : '해제'}`
      );
    }
    
    // 상태 변경
    party.cleared = newClearedState;
    
    // UI 업데이트
    renderRaidListModal();
    renderRaidParties();
    renderExpedition();
    
    // 저장
    scheduleAutoSave();
    
    // 완료 알림
    window.modalManager.showAlert({
      title: '클리어 상태 변경',
      message: `${party.name}을(를) ${newClearedState ? '클리어' : '해제'}했습니다.`
    });
  }
}

// 모달에서 전체 클리어/해제 토글 함수
function toggleAllRaidClearInModal(setCleared) {
  let changedCount = 0;
  
  state.raidsData.forEach(raid => {
    raid.difficulties.forEach(difficulty => {
      const parties = state.raidTabs && state.raidTabs[raid.id] && state.raidTabs[raid.id][difficulty.id] 
        ? state.raidTabs[raid.id][difficulty.id] 
        : [];
      
      parties.forEach(party => {
        if (party.cleared !== setCleared) {
          party.cleared = setCleared;
          changedCount++;
        }
      });
    });
  });
  
  if (changedCount > 0) {
    // 히스토리 기록
    if (typeof recordHistory === 'function') {
      recordHistory(
        'bulk_update',
        {
          type: 'bulk_raid_clear_modal',
          path: 'raidTabs'
        },
        { cleared: !setCleared, count: changedCount },
        { cleared: setCleared, count: changedCount },
        `모달에서 전체 공격대 클리어 상태 변경: ${setCleared ? '클리어' : '해제'} (${changedCount}개 파티)`
      );
    }
    
    // UI 업데이트
    renderRaidListModal();
    renderRaidParties();
    renderExpedition();
    
    // 저장
    scheduleAutoSave();
    
    // 완료 알림
    window.modalManager.showAlert({
      title: '일괄 변경 완료',
      message: `모달에서 ${changedCount}개 공격대를 ${setCleared ? '클리어' : '해제'}했습니다.`
    });
  }
}

// 공대 리스트 내보내기 (JSON)
function exportRaidList() {
  try {
    const exportData = {
      exportedAt: new Date().toISOString(),
      selectedRaidId: state.selectedRaid?.id || null,
      selectedDifficultyId: state.selectedDifficulty?.id || null,
      expeditionSlotNames: state.expeditionSlotNames || [],
      expeditionSlots: state.expeditionSlots || [],
      raidTabs: state.raidTabs || {}
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `공대_리스트_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    window.modalManager?.showAlert?.({ title: '내보내기 완료', message: '공대 리스트가 JSON 파일로 저장되었습니다.' });
  } catch (error) {
    console.error('exportRaidList 오류:', error);
    window.modalManager?.showAlert?.({ title: '오류', message: '내보내기 중 오류가 발생했습니다: ' + (error.message || error) });
  }
}

// 파티 통계 계산 함수
function calculatePartyStats(party) {
  if (!party || !party.members) {
    return {
      maxIlvl: 0,
      avgIlvl: 0,
      totalCombatPower: 0,
      memberCount: 0,
      createdAt: party?.createdAt || null
    };
  }
  
  const members = party.members.filter(m => m !== null && m !== undefined);
  const memberCount = members.length;
  
  if (memberCount === 0) {
    return {
      maxIlvl: 0,
      avgIlvl: 0,
      totalCombatPower: 0,
      memberCount: 0,
      createdAt: party?.createdAt || null
    };
  }
  
  // 원정대 슬롯에서 캐릭터 정보 가져오기
  let totalIlvl = 0;
  let totalCombatPower = 0;
  let maxIlvl = 0;
  let validMembers = 0;
  
  members.forEach(member => {
    if (member && member.name) {
      // 원정대 슬롯에서 캐릭터 정보 찾기
      let characterInfo = null;
      for (let i = 0; i < state.expeditionSlots.length; i++) {
        const slot = state.expeditionSlots[i];
        if (slot) {
          const char = slot.find(c => c && c.name === member.name);
          if (char) {
            characterInfo = char;
            break;
          }
        }
      }
      
      if (characterInfo) {
        const ilvl = parseCompareNumber(characterInfo.ilvl || '0');
        const combatPower = parseCompareNumber(characterInfo.combatPower || '0');
        
        totalIlvl += ilvl;
        totalCombatPower += combatPower;
        maxIlvl = Math.max(maxIlvl, ilvl);
        validMembers++;
      }
    }
  });
  
  return {
    maxIlvl: maxIlvl,
    avgIlvl: validMembers > 0 ? Math.round(totalIlvl / validMembers) : 0,
    totalCombatPower: totalCombatPower,
    memberCount: validMembers,
    createdAt: party?.createdAt || null
  };
}

// 공대 리스트 엑셀 내보내기
function exportRaidListToExcel() {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    let totalPartyCount = 0;
    
    // 모든 레이드 정보 내보내기 (레이드별 탭)
    Object.entries(state.raidTabs).forEach(([raidId, difficulties]) => {
      const raid = state.raidsData[raidId];
      const raidName = raid?.name || raidId;
      
      const raidData = [];
      
      // 난이도별로 그룹화하여 데이터 생성
      Object.entries(difficulties).forEach(([difficultyId, parties]) => {
        
        if (parties.length === 0) {
          // 파티가 없는 난이도도 섹션은 추가
          raidData.push({
            '난이도': difficultyId,
            '파티': '',
            '파티명': '',
            '원정대 슬롯': '',
            '최고 레벨': '',
            '평균 레벨': '',
            '총 전투력': '',
            '클리어 여부': '',
            '파티원 정보': '',
            '생성 시간': ''
          });
          return;
        }
        
        // 난이도 헤더 추가
        raidData.push({
          '난이도': difficultyId,
          '파티': '',
          '파티명': '',
          '원정대 슬롯': '',
          '최고 레벨': '',
          '평균 레벨': '',
          '총 전투력': '',
          '클리어 여부': '',
          '파티원 정보': '',
          '생성 시간': ''
        });
        
        // 해당 난이도의 모든 파티 정보 추가
        parties.forEach((party, index) => {
          const partyStats = calculatePartyStats(party);
          
          // 파티 기본 정보 행 추가
          const partyRowData = {
            '난이도': '',
            '파티': index + 1,
            '파티명': party.name || `${index + 1}팟`,
            '원정대 슬롯': partyStats.memberCount,
            '최고 레벨': partyStats.maxIlvl,
            '평균 레벨': partyStats.avgIlvl,
            '총 전투력': partyStats.totalCombatPower,
            '클리어 여부': party.cleared ? '✅ 클리어' : '⏳ 진행중',
            '파티원 정보': '',
            '생성 시간': partyStats.createdAt || new Date().toLocaleString('ko-KR')
          };
          
          raidData.push(partyRowData);
          totalPartyCount++;
          
          // 파티원 정보를 가로로 4칸에 표시
          if (party.members && party.members.length > 0) {
            // 캐릭터 정보 수집
            const memberInfos = [];
            party.members.forEach((member) => {
              if (member && member.name) {
                // 원정대 슬롯에서 캐릭터 상세 정보 찾기
                let characterInfo = null;
                for (let i = 0; i < state.expeditionSlots.length; i++) {
                  const slot = state.expeditionSlots[i];
                  if (slot) {
                    const char = slot.find(c => c && c.name === member.name);
                    if (char) {
                      characterInfo = char;
                      break;
                    }
                  }
                }
                
                let memberInfo = '';
                if (characterInfo) {
                  const ilvl = parseCompareNumber(characterInfo.ilvl || '0');
                  const combatPower = parseCompareNumber(characterInfo.combatPower || '0');
                  memberInfo = `${truncateText(member.name, 10)} ${truncateText(characterInfo.className || '알 수 없음', 6)} ${ilvl} ${combatPower.toLocaleString()}`;
                } else {
                  memberInfo = `${truncateText(member.name, 10)} 정보없음`;
                }
                
                memberInfos.push(memberInfo);
              }
            });
            
            // 가로로 4칸에 표시 (첫 칸 비우기)
            const memberRowData = {
              '난이도': '', // 첫 칸 비우기
              '파티': '파티원',
              '파티명': memberInfos[0] || '', // 1번 캐릭터
              '원정대 슬롯': memberInfos[1] || '', // 2번 캐릭터
              '최고 레벨': memberInfos[2] || '', // 3번 캐릭터
              '평균 레벨': memberInfos[3] || '', // 4번 캐릭터
              '총 전투력': memberInfos[4] || '', // 5번 캐릭터 (있을 경우)
              '클리어 여부': memberInfos[5] || '', // 6번 캐릭터 (있을 경우)
              '파티원 정보': memberInfos[6] || '', // 7번 캐릭터 (있을 경우)
              '생성 시간': memberInfos[7] || '' // 8번 캐릭터 (있을 경우)
            };
            
            raidData.push(memberRowData);
          }
        });
        
        // 난이도 구분을 위한 빈 행 추가
        raidData.push({
          '난이도': '',
          '파티': '',
          '파티명': '',
          '원정대 슬롯': '',
          '최고 레벨': '',
          '평균 레벨': '',
          '총 전투력': '',
          '클리어 여부': '',
          '파티원 정보': '',
          '생성 시간': ''
        });
      });
      
      // 레이드별 워크시트 생성 (데이터가 있는 경우만)
      if (raidData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(raidData);
        
        // 시트 이름 길이 제한 (Excel 시트 이름은 최대 31자)
        const sheetName = raidName.length > 31 ? raidName.substring(0, 31) : raidName;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });
    
    // 데이터가 없는 경우 처리
    if (totalPartyCount === 0) {
      window.modalManager?.showAlert?.({ 
        title: '내보내기 실패', 
        message: '내보낼 공대 데이터가 없습니다.' 
      });
      return;
    }
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, `공대_리스트_${new Date().toISOString().slice(0, 10)}.xlsx`);
    
    window.modalManager?.showAlert?.({ 
      title: '엑셀 내보내기 완료', 
      message: `공대 리스트가 엑셀 파일로 저장되었습니다.\n총 ${totalPartyCount}개 파티 정보가 포함되었습니다.\n레이드별로 탭이 구분되어 있습니다.` 
    });
  } catch (error) {
    console.error('❌ [EXCEL] exportRaidListToExcel 오류:', error);
    window.modalManager?.showAlert?.({ 
      title: '오류', 
      message: '엑셀 내보내기 중 오류가 발생했습니다: ' + (error.message || error) 
    });
  }
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
  if (!content) {
    return;
  }
  
  // 전체 파티 데이터 수집
  let allParties = [];
  let clearedCount = 0;
  let unclearedCount = 0;
  
  state.raidsData.forEach(raid => {
    raid.difficulties.forEach(difficulty => {
      const parties = state.raidTabs && state.raidTabs[raid.id] && state.raidTabs[raid.id][difficulty.id] 
        ? state.raidTabs[raid.id][difficulty.id] 
        : [];
      
      parties.forEach(party => {
        allParties.push(party);
        if (party.cleared) {
          clearedCount++;
        } else {
          unclearedCount++;
        }
      });
    });
  });
  
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
        // 유효한 파티만 필터링 (null, undefined, 빈 객체 제외)
        const validParties = parties.filter(party => party && typeof party === 'object' && party.id);
        
        if (validParties.length === 0) {
          html += `
            <div class="col-12">
              <div class="alert alert-light text-center">
                <i class="bi bi-inbox me-2"></i>생성된 공격대가 없습니다
              </div>
            </div>
          `;
        } else {
          validParties.forEach(party => {
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
          <div class="card border-0 shadow-sm ${party.cleared ? 'bg-light' : ''}" style="font-size: 0.9rem;">
            <div class="card-header bg-light py-2 d-flex justify-content-between align-items-center">
              <h6 class="card-title mb-0" style="font-size: 0.95rem;">
                <i class="bi bi-people-fill me-1"></i>${party.name}
              </h6>
              ${party.cleared ? 
                `<span class="badge bg-success" style="font-size: 0.75rem; cursor: pointer;" onclick="toggleRaidSlotClearInHeader('${raidId}', '${difficultyId}', '${party.id}', this)"><i class="bi bi-check-circle-fill me-1"></i>클리어</span>` : 
                `<span class="badge bg-secondary" style="font-size: 0.75rem; cursor: pointer;" onclick="toggleRaidSlotClearInHeader('${raidId}', '${difficultyId}', '${party.id}', this)"><i class="bi bi-circle me-1"></i>미클리어</span>`
              }
            </div>
            <div class="card-body p-2">
              <div class="text-center mb-2">
                <small class="text-muted" style="font-size: 0.8rem;">인원 ${validMembers.length}/${party.size}</small>
                <span class="mx-1">|</span>
                <small class="text-primary" style="font-size: 0.8rem;">평균 CP ${avgCombatPower.toLocaleString()}</small>
              </div>
              
              <!-- 약속 시간 표시 -->
              ${party.scheduledWeekday && party.scheduledHour ? `
                <div class="text-center mb-2 p-1 bg-light rounded">
                  <small class="text-info" style="font-size: 0.7rem;">
                    <i class="bi bi-clock-fill me-1"></i>
                    ${getWeekdayName(party.scheduledWeekday)} ${party.scheduledHour}
                  </small>
                </div>
              ` : ''}
              
              ${validMembers.length > 0 ? `
                <div class="d-flex flex-column gap-0">
                  ${validMembers.map(member => {
                    const charDetails = getCharacterDetailsFromExpedition(member.name);
                    const roleIcon = charDetails?.role === 'support' ? '🛡️' : '⚔️';
                    const roleColor = charDetails?.role === 'support' ? 'text-success' : 'text-danger';
                    return `
                      <div class="d-flex justify-content-between align-items-center py-1 border-bottom" style="font-size: 0.75rem;">
                        <span class="text-truncate" style="max-width: 90px; font-weight: 500;" title="${member.name || '알 수 없음'}">
                          ${truncateCharacterName(member.name || '알 수 없음', 12)}
                        </span>
                        <span class="${roleColor}" style="font-size: 0.8rem;">${roleIcon}</span>
                        <small class="text-muted" style="font-size: 0.75rem;">${charDetails?.ilvl || '?'}</small>
                        <small class="text-primary" style="font-size: 0.75rem;">${(charDetails?.combatPower || '0').toLocaleString()}</small>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div class="text-center text-muted py-2" style="font-size: 0.75rem;">
                  배정된 캐릭터 없음
                </div>
              `}
            </div>
          </div>
        </div>
      `;
        });
        } // validParties.length === 0 else 끝
      } // parties.length === 0 else 끝
      
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
  if (!state.raidsData || state.raidsData.length === 0) {
    await loadRaidsData();
  }

  if (!state.selectedRaid || !state.selectedDifficulty) {
    return;
  }

  renderRaidTabs();

  const raidSize = state.selectedRaid.size || 4;
  const expectedPartyCount = raidSize === 8 ? 2 : 1;
  const currentParties = getCurrentTabParties();

  if (currentParties.length < expectedPartyCount) {
    const partiesToAdd = expectedPartyCount - currentParties.length;
    for (let i = 0; i < partiesToAdd; i++) {
      addNewRaid(true);
    }
  }

  applyRecommendedRequirements();
  renderRaidParties();
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
      let expeditionSlotNamesData = null;
      
      if (syncCode && data.d) {
        // 동기화 세션 데이터 (compressed format)
        const compressedData = data.d;
        
        expeditionData = compressedData.es; // expeditionSlots
        raidTabsData = compressedData.rt; // raidTabs
        selectedRaidData = compressedData.sr; // selectedRaid
        expeditionSlotNamesData = compressedData.esn; // expeditionSlotNames
        
              } else if (!syncCode) {
        // 일반 데이터
                expeditionData = data.es;
        raidTabsData = data.rt;
        selectedRaidData = data.sr;
        expeditionSlotNamesData = data.esn; // expeditionSlotNames
      } else {
              }
      
      // raidTabs 복원
      if (raidTabsData) {
        try {
          state.raidTabs = JSON.parse(raidTabsData);

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
                
                // cleared 속성이 없으면 기본값으로 설정
                if (party.cleared === undefined) {
                  party.cleared = false;
                }
                
                // 시간 관련 속성이 없으면 기본값으로 설정
                if (party.scheduledTime === undefined) {
                  party.scheduledTime = null;
                }
                if (party.scheduledTimeDisplay === undefined) {
                  party.scheduledTimeDisplay = '';
                }
                if (party.scheduledWeekday === undefined) {
                  party.scheduledWeekday = null;
                }
                if (party.scheduledHour === undefined) {
                  party.scheduledHour = null;
                }
                
                // 🔥 **중요 수정**: 모든 파티에 대해 displayName 설정 로직 추가
                // 기존 파티가 단일 문자 ID(A, B 등)인 경우 고유 ID로 변경
                if (party.id && party.id.length === 1 && /^[A-Z]$/.test(party.id)) {
                  // 전역 고유 ID 생성
                  state.globalPartyCounter++;
                  const newGlobalId = `P${state.globalPartyCounter}`;
                  const oldId = party.id;
                  
                  // ID 업데이트
                  party.id = newGlobalId;
                  party.uniqueId = `${raidId}-${difficultyId}-${newGlobalId}`;
                  
                  // 🔥 **중요 수정**: displayName과 name 초기화 로직 개선
                  // 사용자가 설정한 커스텀 이름이 있으면 유지, 없으면 기본 이름 사용
                  const hasCustomName = party.name && 
                    !party.name.includes(party.raidName || raidId) && 
                    !party.name.includes(party.difficultyName || difficultyId) &&
                    !party.name.includes(oldId);
                  
                  if (hasCustomName) {
                    // 사용자 커스텀 이름이 있으면 그대로 사용
                    party.displayName = party.name;
                    party.name = party.name;
                  } else {
                    // 기본 이름 형식이면 displayName도 기본 이름으로 설정
                    const defaultName = `${party.raidName || raidId} ${party.difficultyName || difficultyId} ${newGlobalId}`;
                    party.displayName = defaultName;
                    party.name = defaultName;
                  }
                } else {
                  // 🔥 **중요 수정**: 이미 고유 ID를 가진 파티도 displayName 설정
                  // displayName이 없거나 name과 다르면 동기화
                  if (!party.displayName || party.displayName !== party.name) {
                    party.displayName = party.name;
                  }
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
        } catch (error) {
          console.error('❌ [LOAD] Failed to parse raidTabs:', error);
        }
      }
      
      // expeditionSlots 복원
      if (expeditionData) {
        try {
          const parsedExpedition = JSON.parse(expeditionData);
          state.expeditionSlots = parsedExpedition;
        } catch (error) {
          console.error('❌ [LOAD] Failed to parse expeditionSlots:', error);
          console.error('❌ [LOAD] Raw expeditionSlots data:', expeditionData);
        }
      }
      
      // expeditionSlotNames 복원
      if (expeditionSlotNamesData) {
        try {
          const parsedSlotNames = JSON.parse(expeditionSlotNamesData);
          state.expeditionSlotNames = parsedSlotNames;
        } catch (error) {
          console.error('❌ [LOAD] Failed to parse expeditionSlotNames:', error);
          console.error('❌ [LOAD] Raw expeditionSlotNames data:', expeditionSlotNamesData);
          state.expeditionSlotNames = Array.from({length:8}, (_, i) => `원정대 ${i + 1}`);
        }
      } else {
        state.expeditionSlotNames = Array.from({length:8}, (_, i) => `원정대 ${i + 1}`);
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
        }
      }

      renderRaidTabs();
      renderRaidParties();
      renderExpedition();
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

      if (personalSettings.selectedRaidId) {
        const raid = state.raidsData.find(r => r.id === personalSettings.selectedRaidId);

        if (raid) {
          state.selectedRaid = raid;

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
    }
  } catch (error) {
    console.error('❌ [PERSONAL] 개인별 설정 로드 실패:', error);
  }
}

// 시크릿 커맨드 처리
function handleSecretCommand(command) {
  const parts = command.trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case '/broadcast':
    case '/공지':
      if (args.length === 0) return false;

      const message = args.join(' ');
      const type = 'info';
      const duration = 5000;

      if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
        window.realtimeSync.sendBroadcastNotification(message, type, duration)
          .then(success => {
            if (success) {
              window.modalManager.showAlert({
                title: '공지 전송',
                message: `공지가 성공적으로 전송되었습니다:\n${message}`,
                confirmText: '확인'
              });
            } else {
              console.error('❌ [SECRET COMMAND] 공지 전송 실패');
            }
          });
      } else {
        window.modalManager.showAlert({
          title: '오류',
          message: '실시간 동기화가 활성화되지 않았습니다.',
          confirmText: '확인'
        });
      }
      return true;

    case '/warn':
    case '/경고':
      if (args.length === 0) return false;
      if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
        window.realtimeSync.sendBroadcastNotification(args.join(' '), 'warning', 8000);
      }
      return true;

    case '/error':
    case '/에러':
      if (args.length === 0) return false;
      if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
        window.realtimeSync.sendBroadcastNotification(args.join(' '), 'error', 10000);
      }
      return true;

    case '/success':
    case '/성공':
      if (args.length === 0) return false;
      if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
        window.realtimeSync.sendBroadcastNotification(args.join(' '), 'success', 3000);
      }
      return true;

    case '/help':
    case '/도움':
      return true;

    default:
      return false;
  }
}

// 전역 키보드 이벤트 리스너 (시크릿 커맨드용)
document.addEventListener('keydown', function(event) {
  // Ctrl+Shift+K 조합으로 시크릿 커맨드 입력 모드 활성화
  if (event.ctrlKey && event.shiftKey && event.key === 'K') {
    event.preventDefault();
    
    window.modalManager.showInput({
      title: '🔐 시크릿 커맨드',
      message: '실행할 시크릿 커맨드를 입력하세요:',
      placeholder: '/broadcast 메시지',
      defaultValue: '',
      confirmText: '실행',
      cancelText: '취소',
      onConfirm: (command) => {
        if (command && command.trim()) {
          handleSecretCommand(command.trim());
        }
      },
      // 엔터키로 바로 전송 가능하도록 설정
      allowEnterKey: true
    });
  }
});

// 전역 함수로 시크릿 커맨드 노출 (콘솔에서 직접 사용 가능)
window.broadcast = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/broadcast ${message}`);
};

window.warn = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/warn ${message}`);
};

window.error = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/error ${message}`);
};

window.success = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/success ${message}`);
};

window.공지 = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/공지 ${message}`);
};

window.경고 = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/경고 ${message}`);
};

window.에러 = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/에러 ${message}`);
};

window.성공 = function(message) {
  if (typeof message === 'undefined' || message === null) return;
  handleSecretCommand(`/성공 ${message}`);
};

window.secretCommand = handleSecretCommand;

window.addEventListener('load', function() {
  loadRaidsData().then(() => {
    loadPersonalSettings();
    renderRaidTabs();
    renderRaidParties();
    renderExpedition();
    applyExpeditionPanelState();
    loadFromDatabase();
  });

  const syncCode = window.realtimeSync.getSyncCode();
  if (syncCode) {
    window.realtimeSync.init(syncCode);
  }
});

// 원정대 슬롯 이름 변경
function renameExpeditionSlot(slotIndex) {
  // 중복 클릭 방지 - 함수 레벨 잠금
  if (renameExpeditionSlot.locked) {
    return;
  }
  
  // 중복 클릭 방지 - 작업 잠금 확인
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    return;
  }
  
  // 잠금 설정
  renameExpeditionSlot.locked = true;
  
  const currentName = state.expeditionSlotNames[slotIndex];
  
  // 모달 닫힐 때 잠금 해제 함수
  const unlockFunction = () => {
    setTimeout(() => {
      renameExpeditionSlot.locked = false;
    }, 300);
  };
  
  window.modalManager.showInput({
    title: '원정대 이름 변경',
    message: `${currentName}의 새 이름을 입력하세요:`,
    placeholder: '새 이름 입력',
    defaultValue: currentName,
    confirmText: '변경',
    cancelText: '취소',
    onConfirm: (newName) => {
      if (newName && newName.trim() && newName.trim() !== currentName) {
        const trimmedName = newName.trim();
        
        // 히스토리 기록
        if (typeof recordHistory === 'function') {
          recordHistory(
            'update',
            {
              type: 'expedition_slot_rename',
              id: `expedition_slot_rename_${slotIndex}`,
              path: `expedition_slot_names.${slotIndex}`
            },
            {
              slotIndex,
              oldName: currentName,
              newName: trimmedName
            },
            {
              slotIndex,
              oldName: currentName,
              newName: trimmedName
            },
            `원정대 슬롯 ${slotIndex + 1} 이름을 "${currentName}"에서 "${trimmedName}"으로 변경`
          );
        }
        
        // 이름 변경
        state.expeditionSlotNames[slotIndex] = trimmedName;
        
        // UI 업데이트
        renderExpedition();
        renderExpeditionModal();
        
        // 자동 저장
        scheduleAutoSave();
        
        // 완료 알림
        window.modalManager.showAlert({
          title: '이름 변경 완료',
          message: `원정대 이름이 "${currentName}"에서 "${trimmedName}"으로 변경되었습니다.`,
          onClose: unlockFunction
        });
      } else {
        // 이름이 변경되지 않은 경우에도 잠금 해제
        unlockFunction();
      }
    },
    onCancel: unlockFunction,
    onClose: unlockFunction
  });
}

// 원정대 패널 열림 상태 로컬 저장 키
const EXPEDITION_PANEL_STORAGE_KEY = 'lostarkRaidExpeditionPanelOpen';

// 원정대 패널 토글
function toggleExpeditionPanel() {
  const panelBody = document.getElementById('expeditionPanelBody');
  const toggleIcon = document.getElementById('expeditionToggleIcon');
  if (!panelBody || !toggleIcon) return;

  const isOpen = panelBody.style.display === 'none';
  if (isOpen) {
    panelBody.style.display = 'block';
    toggleIcon.className = 'bi bi-chevron-up';
  } else {
    panelBody.style.display = 'none';
    toggleIcon.className = 'bi bi-chevron-down';
  }
  try {
    localStorage.setItem(EXPEDITION_PANEL_STORAGE_KEY, String(isOpen));
  } catch (_) {}
}

// 저장된 원정대 패널 상태 적용 (페이지 로드 시 호출)
function applyExpeditionPanelState() {
  const panelBody = document.getElementById('expeditionPanelBody');
  const toggleIcon = document.getElementById('expeditionToggleIcon');
  if (!panelBody || !toggleIcon) return;
  try {
    const saved = localStorage.getItem(EXPEDITION_PANEL_STORAGE_KEY);
    const open = saved !== 'false'; // 없거나 'true'면 열림, 'false'면 닫힘
    if (!open) {
      panelBody.style.display = 'none';
      toggleIcon.className = 'bi bi-chevron-down';
    } else {
      panelBody.style.display = 'block';
      toggleIcon.className = 'bi bi-chevron-up';
    }
  } catch (_) {}
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

  // 역할별로 캐릭터 분류 (시너지 효율 고려)
  let supports, dps;
  if (window.synergyChecker && allCharacters.length > 0) {
    // 시너지 체커가 있으면 시너지 효율도 고려하여 분류
    const characterSynergyScores = allCharacters.map(char => {
      // 개별 캐릭터를 파티로 만들어 시너지 확인
      const tempParty = [char];
      const synergyInfo = window.synergyChecker.getPartySynergyComposition(tempParty);
      const totalScore = synergyInfo.synergyDetails.reduce((sum, detail) => {
        return sum + (detail.synergyType === 'support' ? 5 : 3); // 서폿 5점, 딜러 3점
      }, 0);
      
      return {
        ...char,
        synergyScore: totalScore || 0,
        combatPower: parseCompareNumber(char.combatPower || '0')
      };
    });
    
    // 전투력과 시너지 점수를 종합하여 정렬 (전투력 70% + 시너지 30%)
    const sortedBySynergy = characterSynergyScores.sort((a, b) => {
      const scoreA = a.combatPower * 0.7 + a.synergyScore * 0.3;
      const scoreB = b.combatPower * 0.7 + b.synergyScore * 0.3;
      return scoreB - scoreA;
    });
    
    supports = sortedBySynergy.filter(char => char.role === 'support');
    dps = sortedBySynergy.filter(char => char.role === 'dps');
  } else {
    // 기존 방식: 단순 역할별 분류
    supports = allCharacters.filter(char => char.role === 'support');
    dps = allCharacters.filter(char => char.role === 'dps');
  }

  let assignedCount = 0;
  let supportCount = 0;

  // 각 파티에 캐릭터 배치
  parties.forEach(party => {
    // 클리어된 파티는 건너뛰기
    if (party.cleared) {
      return;
    }
    
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
    const maxSupports = party.size === 8 ? 2 : (party.maxSupports ?? 1); // 4인 1명, 8인 2명
    // 서폿 배치 (제약 조건 확인) - 빈 슬롯만 채움
    for (let i = 0; i < party.size && supportCount < maxSupports && supports.length > 0; i++) {
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

  // 동기화 중이 아니면 알림 표시
  const isSyncMode = window.realtimeSync && window.realtimeSync.isSyncActive();
  
  let message = '';
  if (assignedCount > 0) {
    message = `${assignedCount}명의 캐릭터를 공격대에 배치했습니다.\n서폿 우선 배치: ${supports.length}명 남음\nDPS 배치: ${dps.length}명 남음\n(모든 제약 조건 적용 완료)`;
  } else {
    const clearedParties = parties.filter(p => p.cleared).length;
    const totalParties = parties.length;
    if (clearedParties === totalParties) {
      message = '모든 공격대가 이미 클리어되어 배치할 파티가 없습니다.';
    } else {
      message = '배치 가능한 공격대가 없거나 모든 캐릭터가 이미 배치되었습니다.';
    }
  }
  
  // 실시간 동기화 모드에서도 간단한 알림 표시
  window.modalManager.showAlert({
    title: '자동 추천 완료',
    message: message
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

  // 빈 슬롯 수 계산 (기존 배치 유지, 클리어된 파티 제외)
  const totalEmptySlots = parties.reduce((sum, party) => {
    // 클리어된 파티는 제외
    if (party.cleared) {
      return sum;
    }
    
    const members = Array.isArray(party.members) ? party.members : [];
    const partySize = party.size || members.length;
    const normalized = members.length < partySize
      ? members.concat(Array(partySize - members.length).fill(null))
      : members.slice(0, partySize);
    return sum + normalized.filter(m => m === null).length;
  }, 0);
  
  // 캐릭터를 전투력 순으로 정렬 (시너지 효율도 고려)
  let sortedCharacters;
  if (window.synergyChecker && allCharacters.length > 0) {
    // 시너지 체커가 있으면 시너지 효율도 고려하여 정렬
    const characterSynergyScores = allCharacters.map(char => {
      // 개별 캐릭터를 파티로 만들어 시너지 확인
      const tempParty = [char];
      const synergyInfo = window.synergyChecker.getPartySynergyComposition(tempParty);
      const totalScore = synergyInfo.synergyDetails.reduce((sum, detail) => {
        return sum + (detail.synergyType === 'support' ? 5 : 3); // 서폿 5점, 딜러 3점
      }, 0);
      
      return {
        ...char,
        synergyScore: totalScore || 0,
        combatPower: parseCompareNumber(char.combatPower || '0')
      };
    });
    
    // 전투력과 시너지 점수를 종합하여 정렬 (전투력 70% + 시너지 30%)
    sortedCharacters = characterSynergyScores.sort((a, b) => {
      const scoreA = a.combatPower * 0.7 + a.synergyScore * 0.3;
      const scoreB = b.combatPower * 0.7 + b.synergyScore * 0.3;
      return scoreB - scoreA;
    }).map(item => ({
      name: item.name,
      role: item.role,
      combatPower: item.combatPower,
      ilvl: item.ilvl,
      image: item.image
    }));
  } else {
    // 기존 방식: 전투력 순으로만 정렬
    sortedCharacters = allCharacters.sort((a, b) => {
      const cpA = parseCompareNumber(a.combatPower || '0');
      const cpB = parseCompareNumber(b.combatPower || '0');
      return cpB - cpA; // 내림차순 (높은 CP 우선)
    });
  }

  // 역할별로 분리
  const supports = sortedCharacters.filter(char => char.role === 'support');
  const dps = sortedCharacters.filter(char => char.role === 'dps');

  // 각 파티에 균등하게 분배 (기존 배치 유지)
  let assignedCount = 0;
  // 1) 서폿: 각 파티의 "부족한 서폿"만 채움
  parties.forEach(party => {
    // 클리어된 파티는 건너뛰기
    if (party.cleared) {
      return;
    }
    
    if (!Array.isArray(party.members)) party.members = [];
    if (party.members.length < party.size) {
      party.members = party.members.concat(Array(party.size - party.members.length).fill(null));
    } else if (party.members.length > party.size) {
      party.members = party.members.slice(0, party.size);
    }

    const existingSupports = party.members.filter(m => m?.role === 'support').length;
    const maxSupports = party.size === 8 ? 2 : (party.maxSupports ?? 1); // 4인 1명, 8인 2명
    const supportsNeeded = Math.max(0, maxSupports - existingSupports);
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
      // 클리어된 파티는 건너뛰기
      if (party.cleared) {
        continue;
      }
      
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

  // 동기화 중이 아니면 알림 표시
  const isSyncMode = window.realtimeSync && window.realtimeSync.isSyncActive();
  
  let message = '';
  if (assignedCount > 0) {
    message = `${assignedCount}명의 캐릭터를 공격대에 균등하게 배치했습니다.\n서폿 우선 배치: ${supports.length}명 남음\nDPS 배치: ${dps.length}명 남음\n(모든 제약 조건 적용 완료)`;
  } else {
    const clearedParties = parties.filter(p => p.cleared).length;
    const totalParties = parties.length;
    if (clearedParties === totalParties) {
      message = '모든 공격대가 이미 클리어되어 배치할 파티가 없습니다.';
    } else {
      message = '배치 가능한 공격대가 없거나 모든 캐릭터가 이미 배치되었습니다.';
    }
  }
  
  // 실시간 동기화 모드에서도 간단한 알림 표시
  window.modalManager.showAlert({
    title: '균등 분배 완료',
    message: message
  });
  } finally {
    // 잠금 해제
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('클리어 상태 변경');
      window.operationLock.release('균등 분배');
    }
  }
}

// === 클리어 체크 기능 ===

// 공격대 클리어 상태 토글
async function toggleRaidClear(partyId, isCleared) {
  // 작업 잠금 확인
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
    acquired = await window.operationLock.acquire('클리어 상태 변경');
  }
  
  if (!acquired) return;
  
  try {
    // 파티 찾기
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    
    if (!party) {
      console.error('❌ [CLEAR] 파티를 찾을 수 없음:', partyId);
      return;
    }
    
    // 클리어 상태 업데이트
    party.cleared = isCleared;
    
    // raidsData에도 클리어 상태 반영 (안전한 처리)
    const raidId = party.raidId || (state.selectedRaid?.id);
    const difficultyId = party.difficultyId || (state.selectedDifficulty?.id);
    
    if (raidId && difficultyId) {
      const raid = state.raidsData.find(r => r.id === raidId);
      if (raid) {
        const difficulty = raid.difficulties.find(d => d.id === difficultyId);
        if (difficulty) {
          difficulty.cleared = isCleared;
        }
      }
    }
    
    // 알림
    const message = isCleared ? 
      `${party.name || partyId} 클리어 완료!` : 
      `${party.name || partyId} 클리어 취소`;
    
    // UI 업데이트 - 즉시 렌더링 (클리어 상태 변경은 즉시 피드백 필요)
    renderRaidParties();
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    showNotification(message, isCleared ? 'success' : 'info');
    
  } finally {
    // 잠금 해제
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('클리어 상태 변경');
    }
  }
}

// 주간 리셋 체크 및 자동 리셋
function checkWeeklyReset() {
  const now = new Date();
  const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 3: 수요일
  const currentHour = now.getHours();
  
  // 수요일 오전 10시에 리셋
  if (currentDay === 3 && currentHour === 10) {
    const lastReset = localStorage.getItem('lastWeeklyReset');
    const today = now.toDateString();
    
    // 오늘 이미 리셋했으면 건너뛰기
    if (lastReset === today) {
      return;
    }
    
    performWeeklyReset();
    localStorage.setItem('lastWeeklyReset', today);
  }
}

// 주간 리셋 실행
async function performWeeklyReset() {
  try {
    // 모든 공격대 클리어 상태 초기화
    state.raidsData.forEach(raid => {
      raid.difficulties.forEach(difficulty => {
        difficulty.cleared = false;
      });
    });
    
    // 모든 파티 클리어 상태 초기화
    Object.keys(state.raidTabs).forEach(raidId => {
      Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
        const parties = state.raidTabs[raidId][difficultyId];
        if (Array.isArray(parties)) {
          parties.forEach(party => {
            if (party) {
              party.cleared = false;
            }
          });
        }
      });
    });
    
    // UI 업데이트
    renderRaidParties();
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    // 알림
    showNotification('주간 리셋이 완료되었습니다. 모든 공격대 클리어 상태가 초기화되었습니다.', 'success', 10000);
    
  } catch (error) {
    console.error('❌ [WEEKLY RESET] 리셋 실패:', error);
    showNotification('주간 리셋 중 오류가 발생했습니다.', 'error');
  }
}

// 수동 리셋 함수 (관리자용)
async function manualWeeklyReset() {
  const confirmed = confirm('정말로 모든 공격대 클리어 상태를 초기화하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.');
  
  if (!confirmed) return;
  
  await performWeeklyReset();
}

// 알림 표시 함수
function showNotification(message, type = 'info', duration = 5000) {
  // 기존 알림이 있으면 제거
  const existingNotification = document.getElementById('appNotification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.id = 'appNotification';
  notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`; 
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  notification.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'} me-2"></i>
      <span>${message}</span>
      <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  if (duration > 0) {
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }
}

// 주간 리셋 체크 타이머 설정 (매시간 체크)
setInterval(checkWeeklyReset, 60 * 60 * 1000);

// 페이지 로드시 즉시 체크
checkWeeklyReset();


// 다크모드 관련 함수
function toggleDarkMode() {
  const isDarkMode = document.getElementById('darkModeToggle').checked;
  document.body.classList.toggle('dark-mode', isDarkMode);
  
  // 로컬 스토리지에 설정 저장
  localStorage.setItem('darkMode', isDarkMode);
  
  // 아이콘 변경
  updateDarkModeIcon(isDarkMode);
}

function updateDarkModeIcon(isDarkMode) {
  const icon = document.querySelector('#darkModeToggle').closest('.nav-link').querySelector('i');
  if (isDarkMode) {
    icon.classList.remove('bi-moon-stars');
    icon.classList.add('bi-sun');
  } else {
    icon.classList.remove('bi-sun');
    icon.classList.add('bi-moon-stars');
  }
}

function loadDarkModeSetting() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  document.getElementById('darkModeToggle').checked = isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);
  updateDarkModeIcon(isDarkMode);
}
// 페이지 로드 시 다크모드 설정 적용 및 파티 순번 마이그레이션
document.addEventListener('DOMContentLoaded', () => {
  loadDarkModeSetting();
  migratePartyOrder(); // 기존 파티 데이터에 순번 추가
});
