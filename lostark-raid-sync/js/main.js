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
    cleared: false, // 클리어 상태 기본값
    scheduledWeekday: null, // 약속 요일
    scheduledHour: null, // 약속 시간
    scheduledTime: null, // 기존 호환성 (ISO 문자열)
    scheduledTimeDisplay: '', // 기존 호환성 (표시용 시간 문자열)
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
      renderRaidParties();
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
    
    const raidId = state.selectedRaid?.id;
    const difficultyId = state.selectedDifficulty?.id;

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
  
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    const raidId = state.selectedRaid?.id;
    const difficultyId = state.selectedDifficulty?.id;
    const parties = getCurrentTabParties();
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
          `${partyId} 파티 삭제`
        );
      }
      
      // State Manager가 없으면 기존 방식으로 처리
      if (!window.stateManager || !window.stateManager.atomicUpdate) {
        parties.splice(index, 1);

        try {
          renderRaidParties();
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
            target: { raidId, difficultyId, partyId },
            description: `파티 삭제: ${removedParty.name}`
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
    const newRole = document.querySelector('input[name="editRole"]:checked').value;
    
    character.combatPower = newCombatPower;
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
    if (editCombatPowerInput && originalCombatPowerSpan) {
      editCombatPowerInput.value = newCombatPower;
      originalCombatPowerSpan.textContent = newCombatPower;
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
              <div class="card border-0 shadow-sm ${party.cleared ? 'bg-light' : ''}" style="font-size: 0.7rem;">
                <div class="card-header bg-light py-1 d-flex justify-content-between align-items-center">
                  <h6 class="card-title mb-0" style="font-size: 0.75rem;">
                    <i class="bi bi-people-fill me-1"></i>${party.name}
                  </h6>
                  ${party.cleared ? 
                    '<span class="badge bg-success" style="font-size: 0.6rem;"><i class="bi bi-check-circle-fill me-1"></i>클리어</span>' : 
                    '<span class="badge bg-secondary" style="font-size: 0.6rem;"><i class="bi bi-circle me-1"></i>미클리어</span>'
                  }
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
  const currentName = state.expeditionSlotNames[slotIndex];
  
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
      }
    }
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
  if (!isSyncMode) {
    window.modalManager.showAlert({
      title: '자동 추천 완료',
      message: `${assignedCount}명의 캐릭터를 공격대에 배치했습니다.\n서폿 우선 배치: ${supports.length}명 남음\nDPS 배치: ${dps.length}명 남음\n(모든 제약 조건 적용 완료)`
    });
  }
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
    
    // UI 업데이트
    renderRaidParties();
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    // 알림
    const message = isCleared ? 
      `${party.name || partyId} 클리어 완료!` : 
      `${party.name || partyId} 클리어 취소`;
    
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
  console.log('🔄 [WEEKLY RESET] 주간 리셋 실행...');
  
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
    
    console.log('✅ [WEEKLY RESET] 주간 리셋 완료');
    
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

// === 시간 스케줄러 기능 ===

// 🔥 **핵심 수정: 스케줄러 관련 함수 전역 노출**
window.updateRaidScheduledTime = updateRaidScheduledTime;
window.clearRaidScheduledTime = clearRaidScheduledTime;
window.openSchedulerModal = openSchedulerModal;
window.refreshScheduler = refreshScheduler;
window.exportSchedule = exportSchedule;

// 공격대 약속 시간 업데이트
async function updateRaidScheduledTime(partyId, weekday, hour) {
  // 작업 잠금 확인
  if (window.operationLock && typeof window.operationLock.isLocked === 'function' && window.operationLock.isLocked()) {
    return;
  }
  
  // 잠금 획득 시도
  let acquired = true;
  if (window.operationLock && typeof window.operationLock.acquire === 'function') {
    acquired = await window.operationLock.acquire('약속 시간 변경');
  }
  
  if (!acquired) return;
  
  try {
    // 파티 찾기
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    
    if (!party) {
      console.error('❌ [SCHEDULE] 파티를 찾을 수 없음:', partyId);
      return;
    }
    
    // 요일/시간 업데이트
    party.scheduledWeekday = weekday || null;
    party.scheduledHour = hour || null;
    
    // 표시용 시간 문자열 생성 (기존 호환성)
    if (weekday && hour) {
      const weekdayNames = {
        'monday': '월요일',
        'tuesday': '화요일',
        'wednesday': '수요일',
        'thursday': '목요일',
        'friday': '금요일',
        'saturday': '토요일',
        'sunday': '일요일'
      };
      party.scheduledTimeDisplay = `${weekdayNames[weekday]} ${hour}`;
      
      // 다음 해당 요일의 날짜 계산 (기존 호환성)
      const today = new Date();
      const todayDay = today.getDay(); // 0=일요일, 1=월요일, ...
      const weekdayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };
      
      const targetDay = weekdayMap[weekday];
      let daysUntilTarget = targetDay - todayDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // 다음 주로
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      
      const [hours, minutes] = hour.split(':');
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      party.scheduledTime = targetDate.toISOString();
    } else {
      party.scheduledTimeDisplay = '';
      party.scheduledTime = null;
    }
    
    // UI 업데이트
    renderRaidParties();
    
    // 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebaseWithLock();
    } else {
      scheduleAutoSave();
    }
    
    // 알림
    const message = (weekday && hour) ? 
      `${party.name || partyId} 약속 시간이 설정되었습니다.` : 
      `${party.name || partyId} 약속 시간이 초기화되었습니다.`;
    
    showNotification(message, 'info');
    
  } finally {
    // 잠금 해제
    if (window.operationLock && typeof window.operationLock.release === 'function') {
      window.operationLock.release('약속 시간 변경');
    }
  }
}

// 약속 시간 초기화
async function clearRaidScheduledTime(partyId) {
  const weekdaySelect = document.getElementById(`scheduledWeekday-${partyId}`);
  const hourInput = document.getElementById(`scheduledHour-${partyId}`);
  
  if (weekdaySelect) {
    weekdaySelect.value = '';
  }
  if (hourInput) {
    hourInput.value = '';
  }
  
  await updateRaidScheduledTime(partyId, null, null);
}

// 시간 스케줄러 모달 열기
function openSchedulerModal() {
  const modalId = 'schedulerModal';
  
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calendar-week me-2"></i>
              시간 스케줄러
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6>전체 공격대 일정</h6>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="refreshScheduler()">
                      <i class="bi bi-arrow-clockwise"></i> 새로고침
                    </button>
                    <button class="btn btn-outline-success" onclick="exportSchedule()">
                      <i class="bi bi-download"></i> 내보내기
                    </button>
                  </div>
                </div>
                <div id="schedulerContent" class="scheduler-container">
                  <!-- 스케줄 내용이 여기에 표시됨 -->
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modalElement = document.getElementById(modalId);
  const modal = new bootstrap.Modal(modalElement);
  
  // 모달 표시
  modal.show();
  
  // 스케줄 내용 로드
  loadSchedulerContent();
  
  // 모달 닫힐 때 정리
  modalElement.addEventListener('hidden.bs.modal', () => {
    modalElement.remove();
  }, { once: true });
}

// 스케줄 내용 로드
function loadSchedulerContent() {
  const container = document.getElementById('schedulerContent');
  if (!container) return;
  
  // 모든 파티 데이터 수집
  const allParties = [];
  
  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach(party => {
          if (party && party.scheduledWeekday && party.scheduledHour) {
            allParties.push({
              ...party,
              raidId,
              difficultyId
            });
          }
        });
      }
    });
  });
  
  // 요일순 정렬 (월요일부터 일요일까지)
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  allParties.sort((a, b) => {
    const aWeekdayIndex = weekdayOrder.indexOf(a.scheduledWeekday);
    const bWeekdayIndex = weekdayOrder.indexOf(b.scheduledWeekday);
    
    if (aWeekdayIndex !== bWeekdayIndex) {
      return aWeekdayIndex - bWeekdayIndex;
    }
    
    // 같은 요일이면 시간순 정렬
    return a.scheduledHour.localeCompare(b.scheduledHour);
  });
  
  // 요일별 그룹화 HTML 생성
  let timelineHtml = '';
  
  if (allParties.length === 0) {
    timelineHtml = `
      <div class="text-center text-muted py-5">
        <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
        <p class="mt-3">예약된 공격대가 없습니다.</p>
        <p>파티에 약속 시간을 설정해주세요.</p>
      </div>
    `;
  } else {
    timelineHtml = '<div class="schedule-by-weekday">';
    
    // 요일별로 그룹화
    const partiesByWeekday = {};
    allParties.forEach(party => {
      if (!partiesByWeekday[party.scheduledWeekday]) {
        partiesByWeekday[party.scheduledWeekday] = [];
      }
      partiesByWeekday[party.scheduledWeekday].push(party);
    });
    
    weekdayOrder.forEach(weekday => {
      const parties = partiesByWeekday[weekday];
      if (parties && parties.length > 0) {
        const weekdayNames = {
          'monday': '월요일',
          'tuesday': '화요일',
          'wednesday': '수요일',
          'thursday': '목요일',
          'friday': '금요일',
          'saturday': '토요일',
          'sunday': '일요일'
        };
        
        timelineHtml += `
          <div class="weekday-section mb-4">
            <h5 class="weekday-title">
              <i class="bi bi-calendar-week me-2"></i>${weekdayNames[weekday]}
            </h5>
            <div class="row g-3">
        `;
        
        parties.forEach(party => {
          timelineHtml += `
            <div class="col-md-6 col-lg-4">
              <div class="card ${party.cleared ? 'bg-light' : ''}">
                <div class="card-body">
                  <h6 class="card-title mb-1">
                    ${party.name || party.displayName || party.id}
                    ${party.cleared ? '<span class="badge bg-success ms-2">클리어</span>' : ''}
                  </h6>
                  <p class="card-text text-muted mb-2">
                    <i class="bi bi-geo-alt"></i> ${party.raidName} ${party.difficultyName}
                    <br>
                    <i class="bi bi-clock"></i> ${party.scheduledHour}
                  </p>
                  
                  <!-- 파티 멤버 정보 -->
                  <div class="mt-2">
                    <small class="text-muted">
                      멤버: ${party.members.filter(m => m !== null).length}/${party.size}명
                      ${party.members.filter(m => m !== null).length > 0 ? 
                        ` (${party.members.filter(m => m !== null).map(m => m.name).join(', ')})` : 
                        ' (미정)'
                      }
                    </small>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        
        timelineHtml += `
            </div>
          </div>
        `;
      }
    });
    
    timelineHtml += '</div>';
  }
  
  container.innerHTML = timelineHtml;
}

// 스케줄 새로고침
function refreshScheduler() {
  loadSchedulerContent();
  showNotification('스케줄이 새로고침되었습니다.', 'info');
}

// 스케줄 내보내기
function exportSchedule() {
  const allParties = [];
  
  Object.keys(state.raidTabs).forEach(raidId => {
    Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
      const parties = state.raidTabs[raidId][difficultyId];
      if (Array.isArray(parties)) {
        parties.forEach(party => {
          if (party && party.scheduledWeekday && party.scheduledHour) {
            allParties.push({
              ...party,
              raidId,
              difficultyId
            });
          }
        });
      }
    });
  });
  
  // 요일순 정렬
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  allParties.sort((a, b) => {
    const aWeekdayIndex = weekdayOrder.indexOf(a.scheduledWeekday);
    const bWeekdayIndex = weekdayOrder.indexOf(b.scheduledWeekday);
    
    if (aWeekdayIndex !== bWeekdayIndex) {
      return aWeekdayIndex - bWeekdayIndex;
    }
    
    return a.scheduledHour.localeCompare(b.scheduledHour);
  });
  
  // 텍스트 생성
  let scheduleText = '=== 공격대 스케줄 ===\n\n';
  
  // 요일별로 그룹화
  const partiesByWeekday = {};
  allParties.forEach(party => {
    if (!partiesByWeekday[party.scheduledWeekday]) {
      partiesByWeekday[party.scheduledWeekday] = [];
    }
    partiesByWeekday[party.scheduledWeekday].push(party);
  });
  
  const weekdayNames = {
    'monday': '월요일',
    'tuesday': '화요일',
    'wednesday': '수요일',
    'thursday': '목요일',
    'friday': '금요일',
    'saturday': '토요일',
    'sunday': '일요일'
  };
  
  weekdayOrder.forEach(weekday => {
    const parties = partiesByWeekday[weekday];
    if (parties && parties.length > 0) {
      scheduleText += `📅 ${weekdayNames[weekday]}\n`;
      scheduleText += '=' .repeat(20) + '\n';
      
      parties.forEach(party => {
        scheduleText += `⏰ ${party.scheduledHour} - ${party.name || party.displayName || party.id}\n`;
        scheduleText += `📍 ${party.raidName} ${party.difficultyName}\n`;
        scheduleText += `👥 멤버: ${party.members.filter(m => m !== null).length}/${party.size}명\n`;
        if (party.members.filter(m => m !== null).length > 0) {
          scheduleText += `   ${party.members.filter(m => m !== null).map(m => m.name).join(', ')}\n`;
        }
        scheduleText += `${party.cleared ? '✅ 클리어 완료' : '⏳ 진행 예정'}\n\n`;
      });
      
      scheduleText += '\n';
    }
  });
  
  if (allParties.length === 0) {
    scheduleText += '예약된 공격대가 없습니다.\n';
  }
  
  // 클립보드에 복사
  navigator.clipboard.writeText(scheduleText).then(() => {
    showNotification('스케줄이 클립보드에 복사되었습니다.', 'success');
  }).catch(() => {
    showNotification('클립보드 복사에 실패했습니다.', 'error');
  });
}

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

// 페이지 로드 시 다크모드 설정 적용
document.addEventListener('DOMContentLoaded', loadDarkModeSetting);
