// 드래그 앤 드롭 핸들러
let draggedData = null;

// 클릭/더블클릭 구분을 위한 타이머
let clickTimer = null;
let clickCount = 0;

// 캐릭터 선택 모달 중복 방지 플래그
let isCharacterSelectorModalOpen = false;

// 드롭 처리 중복 방지 플래그
let isDropProcessing = false;

// 우클릭 이벤트 핸들러 (반응성 개선)
function handleRightClick(event, charId, partyId, slotIndex, expeditionIndex, characterIndex) {
  event.preventDefault();
  // event.stopPropagation(); // 제거하여 이벤트 전파 허용
  
  if (partyId !== null && slotIndex !== null) {
    // 공격대 캐릭터 삭제
    confirmRemoveCharacter(charId, partyId, slotIndex);
  } else if (expeditionIndex !== null && characterIndex !== null) {
    // 원정대 캐릭터 삭제
    confirmRemoveExpeditionCharacter(expeditionIndex, characterIndex);
  }
}

// 전역 우클릭 이벤트 리스너 추가 (브라우저 기본 우클릭 메뉴 방지)
document.addEventListener('contextmenu', function(event) {
  // 캐릭터 관련 요소에서만 우클릭 허용 (하지만 이벤트는 막지 않음)
  if (event.target.closest('.char-box') || event.target.closest('.expedition-char')) {
    // 기본 동작은 막지만, 이벤트 전파는 막지 않음
    event.preventDefault();
    // event.stopPropagation(); // 이 줄을 제거하여 핸들러가 호출되도록 함
  }
}, true);

// ID로 캐릭터 정보 조회
function findCharacterById(charId) {
  for (const slot of state.expeditionSlots) {
    const character = slot.find(char => char.id === charId);
    if (character) return character;
  }

  const parties = getCurrentTabParties();
  for (const party of parties) {
    for (const member of party.members) {
      if (member && (member.id === charId || member.name === charId)) {
        const detailedCharacter = findCharacterByIdFromExpedition(member.name);
        if (detailedCharacter) return detailedCharacter;
        return member;
      }
    }
  }

  return null;
}

// 🔥 **핵심 수정: 전역 함수로 노출**
window.findCharacterById = findCharacterById;

// 원정대에서 이름으로 캐릭터 정보 조회
function findCharacterByIdFromExpedition(charName) {
  for (const slot of state.expeditionSlots) {
    const character = slot.find(char => char.name === charName);
    if (character) {
      return character;
    }
  }
  return null;
}

// 클릭/더블클릭 구분 함수
function handleClickEvent(event, singleClickCallback, doubleClickCallback) {
  event.preventDefault();
  event.stopPropagation();
  
  // 이미 처리 중인 클릭이 있으면 무시
  if (clickTimer) {
    return;
  }
  
  clickCount++;
  
  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      // 싱글 클릭
      clickCount = 0;
      clickTimer = null;
      singleClickCallback();
    }, 250);
  } else if (clickCount === 2) {
    // 더블 클릭
    clearTimeout(clickTimer);
    clickCount = 0;
    clickTimer = null;
    doubleClickCallback();
  }
}

function handleCharacterClick(event, charId, partyId, slotIndex) {
  // 더 이상 사용되지 않음 (우클릭으로 삭제)
}

function handleDragStart(event, charId, partyId, slotIndex, fromRaid = true, expeditionIndex, expeditionSlotIndex) {
  // 시작 지점 오브젝트 명 체크
  const sourceObjectName = fromRaid ? `raid_${partyId}_${slotIndex}` : `expedition_${expeditionIndex}_${expeditionSlotIndex}`;
  
  draggedData = {
    charId,
    fromRaid,
    partyId,
    slotIndex,
    expeditionIndex,
    expeditionSlotIndex,
    sourceObjectName, // 시작 지점 오브젝트 명 추가
    processed: false
  };

  // ID만 전송 (최소한의 데이터)
  event.dataTransfer.setData('text/plain', charId);
  event.dataTransfer.effectAllowed = 'move';
  
  // 드래그 시작 시간 기록 (성능 측정용)
  draggedData.startTime = performance.now();
  
  // CSS 클래스 추가 (애니메이션 최적화)
  if (event.target && event.target.classList) {
    event.target.classList.add('dragging');
    // 하드웨어 가속 활성화
    event.target.style.transform = 'translateZ(0)';
    event.target.style.willChange = 'transform';
  }
}

function handleDragEnd(event) {
  if (event.target && event.target.classList) {
    event.target.classList.remove('dragging');
    // 하드웨어 가속 정리
    event.target.style.transform = '';
    event.target.style.willChange = '';
  }

  // 드래그 데이터 및 플래그 초기화
  draggedData = null;
  isDropProcessing = false;
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  // 쓰로틀링으로 성능 최적화
  if (draggedData && draggedData.lastOverTime) {
    const now = performance.now();
    if (now - draggedData.lastOverTime < 16) { // 60fps 제한
      return;
    }
    draggedData.lastOverTime = now;
  } else if (draggedData) {
    draggedData.lastOverTime = performance.now();
  }
  
  if (event.currentTarget && event.currentTarget.classList) {
    event.currentTarget.classList.add('dragover');
  }
}

async function handleDrop(event, partyId, slotIndex) {
  event.preventDefault();
  event.stopPropagation(); // 이벤트 버블링 방지
  
  if (event.currentTarget && event.currentTarget.classList) {
    event.currentTarget.classList.remove('dragover');
  }
  
  if (!draggedData) return;
  
  const charId = event.dataTransfer.getData('text/plain');
  if (!charId) return;
  
  if (isDropProcessing) return;

  if (draggedData.processed) return;

  // 중복 방지 플래그 설정
  isDropProcessing = true;
  draggedData.processed = true;
  
  // 드롭 처리 시작 시간 기록
  const dropStartTime = performance.now();
  
  // 타겟 오브젝트 명 생성
  const targetObjectName = `raid_${partyId}_${slotIndex}`;
  
  if (draggedData && draggedData.sourceObjectName === targetObjectName) return;

  try {
    const parties = getCurrentTabParties();

    if (draggedData && draggedData.fromRaid && draggedData.partyId) {
      await handleRaidToRaidDrop(draggedData, partyId, slotIndex, parties);
    } else {
      await handleExpeditionToRaidDrop(charId, partyId, slotIndex, parties);
    }
  } catch (error) {
    console.error('❌ [DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터를 추가하는 중 오류가 발생했습니다.'
    });
  } finally {
    isDropProcessing = false;
    draggedData = null;
  }
}

// 공격대 -> 공격대 드롭 처리
async function handleRaidToRaidDrop(draggedData, targetPartyId, targetSlotIndex, parties) {
  const { partyId: sourcePartyId, slotIndex: sourceSlotIndex } = draggedData;

  // 🔥 **중요 수정**: 상세한 디버깅 정보 출력
  console.log(`🔍 [RAID TO RAID] 드롭 요청:`, {
    sourcePartyId,
    targetPartyId,
    sourceSlotIndex,
    targetSlotIndex,
    availableParties: parties.map(p => ({ id: p.id, displayName: p.displayName }))
  });

  // 🔥 **중요 수정**: 다양한 ID 매칭 시도
  let sourceParty = null;
  let targetParty = null;
  
  // 1. 정확한 ID 매칭
  sourceParty = parties.find(p => p.id === sourcePartyId);
  targetParty = parties.find(p => p.id === targetPartyId);
  
  // 2. uniqueId 매칭 (fallback)
  if (!sourceParty) {
    sourceParty = parties.find(p => p.uniqueId === sourcePartyId);
    if (sourceParty) {
      console.log(`✅ [RAID TO RAID] 소스 uniqueId 매칭 성공`);
    }
  }
  
  if (!targetParty) {
    targetParty = parties.find(p => p.uniqueId === targetPartyId);
    if (targetParty) {
      console.log(`✅ [RAID TO RAID] 타겟 uniqueId 매칭 성공`);
    }
  }
  
  if (!sourceParty) {
    console.error(`❌ [RAID TO RAID] 소스 파티 찾기 실패:`, { 
      sourcePartyId, 
      availableIds: parties.map(p => p.id) 
    });
    window.modalManager.showAlert({
      title: '오류',
      message: `소스 파티를 찾을 수 없습니다. (ID: ${sourcePartyId})`
    });
    return;
  }
  
  if (!targetParty) {
    console.error(`❌ [RAID TO RAID] 타겟 파티 찾기 실패:`, { 
      targetPartyId, 
      availableIds: parties.map(p => p.id) 
    });
    window.modalManager.showAlert({
      title: '오류',
      message: `타겟 파티를 찾을 수 없습니다. (ID: ${targetPartyId})`
    });
    return;
  }
  
  const sourceCharacter = sourceParty.members[sourceSlotIndex];

  if (!sourceCharacter) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 슬롯에 캐릭터가 없습니다.'
    });
    return;
  }
  
  // 🔥 **핵심 수정: sourceCharacter.id가 undefined면 name으로 검색**
  let sourceCharacterDetails = null;
  if (sourceCharacter.id) {
    sourceCharacterDetails = findCharacterById(sourceCharacter.id);
  } else if (sourceCharacter.name) {
    sourceCharacterDetails = findCharacterById(sourceCharacter.name);
  }

  if (!sourceCharacterDetails) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 캐릭터 정보를 찾을 수 없습니다.'
    });
    return;
  }
  
  const targetCharacter = targetParty.members[targetSlotIndex];

  // 모든 관련 데이터 백업
  const backupData = {
    sourceParty: {
      id: sourceParty.id,
      members: [...sourceParty.members], // 깊은 복사
      slotIndex: sourceSlotIndex,
      character: sourceCharacter
    },
    targetParty: {
      id: targetParty.id,
      members: [...targetParty.members], // 깊은 복사
      slotIndex: targetSlotIndex,
      character: targetCharacter
    }
  };
  
  console.log('🔄 [RAID TO RAID] 백업 데이터:', {
    sourceBackup: {
      partyId: backupData.sourceParty.id,
      slotIndex: backupData.sourceParty.slotIndex,
      characterName: backupData.sourceParty.character?.name
    },
    targetBackup: {
      partyId: backupData.targetParty.id,
      slotIndex: backupData.targetParty.slotIndex,
      characterName: backupData.targetParty.character?.name
    }
  });
  
  sourceParty.members[sourceSlotIndex] = null;
  if (targetCharacter) {
    targetParty.members[targetSlotIndex] = null;
  }

  try {
    const currentParties = getCurrentTabParties();
    const sourceValidation = Constraints.canAddCharacterToParty(targetParty, sourceCharacterDetails, currentParties, targetSlotIndex);
    
    let targetValidation = { valid: true, message: '' };
    if (targetCharacter) {
      // 🔥 **핵심 수정: targetCharacter.id가 undefined면 name으로 검색**
      let targetCharacterDetails = null;
      if (targetCharacter.id) {
        targetCharacterDetails = findCharacterById(targetCharacter.id);
      } else if (targetCharacter.name) {
        targetCharacterDetails = findCharacterById(targetCharacter.name);
      }
      
      if (targetCharacterDetails) {
        targetValidation = Constraints.canAddCharacterToParty(sourceParty, targetCharacterDetails, currentParties, sourceSlotIndex);
      }
    }

    if (!sourceValidation.valid || !targetValidation.valid) {
      // 백업 데이터로 롤백
      sourceParty.members[sourceSlotIndex] = backupData.sourceParty.character;
      if (targetCharacter) {
        targetParty.members[targetSlotIndex] = backupData.targetParty.character;
      }

      let errorMessage = '';
      if (!sourceValidation.valid && !targetValidation.valid) {
        errorMessage = `교체 실패:\n${sourceCharacterDetails.name}: ${sourceValidation.message}\n${targetCharacter?.name}: ${targetValidation.message}`;
      } else if (!sourceValidation.valid) {
        errorMessage = `${sourceCharacterDetails.name} 캐릭터를 ${targetPartyId} 파티에 배치할 수 없습니다: ${sourceValidation.message}`;
      } else if (!targetValidation.valid) {
        errorMessage = `${targetCharacter?.name} 캐릭터를 ${sourcePartyId} 파티에 배치할 수 없습니다: ${targetValidation.message}`;
      }
      
      window.modalManager.showAlert({
        title: '제약 조건 위반',
        message: errorMessage
      });
      return;
    }
    
    // 제약 조건 통과 시 캐릭터 배치
    //  [RAID TO RAID] 타겟 캐릭터가 있으면 교체, 없으면 이동
    if (targetCharacter) {
      // 교체
      sourceParty.members[sourceSlotIndex] = backupData.targetParty.character;
      targetParty.members[targetSlotIndex] = backupData.sourceParty.character;
      
    } else {
      sourceParty.members[sourceSlotIndex] = null;
      targetParty.members[targetSlotIndex] = backupData.sourceParty.character;
    }

    if (typeof window.renderRaidParties === 'function') window.renderRaidParties();
    if (typeof window.renderExpedition === 'function') window.renderExpedition();
    if (typeof window.scheduleAutoSave === 'function') window.scheduleAutoSave();

    window.modalManager.showAlert({
      title: '성공',
      message: `${sourceCharacterDetails.name} 캐릭터를 성공적으로 이동했습니다.`
    });
    
  } catch (error) {
    console.error('❌ [RAID TO RAID] 처리 중 오류 발생:', error);
    
    // 오류 발생 시 롤백
    sourceParty.members[sourceSlotIndex] = backupData.sourceParty.character;
    if (targetCharacter) {
      targetParty.members[targetSlotIndex] = backupData.targetParty.character;
    }
    
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 이동 중 오류가 발생했습니다.'
    });
    return;
  }

  if (typeof recordHistory === 'function') {
    const historyType = targetCharacter ? 'character_swap' : 'character_move';
    const historyId = targetCharacter 
      ? `raid_swap_${sourcePartyId}_${sourceSlotIndex}_to_${targetPartyId}_${targetSlotIndex}`
      : `raid_move_${sourcePartyId}_${sourceSlotIndex}_to_${targetPartyId}_${targetSlotIndex}`;
    
    await recordHistory(
      'update',
      {
        type: historyType,
        id: historyId,
        path: `raid_${historyType}`
      },
      {
        source: { partyId: sourcePartyId, slotIndex: sourceSlotIndex, character: sourceCharacter },
        target: { partyId: targetPartyId, slotIndex: targetSlotIndex, character: targetCharacter }
      },
      {
        source: { partyId: sourcePartyId, slotIndex: sourceSlotIndex, character: targetCharacter ? targetCharacter : null },
        target: { partyId: targetPartyId, slotIndex: targetSlotIndex, character: sourceCharacter }
      },
      `${historyType === 'character_swap' ? '캐릭터 교체' : '캐릭터 이동'}: ${sourceCharacterDetails.name} ${targetCharacter ? `↔ ${targetCharacter.name}` : `→ ${targetPartyId}-${targetSlotIndex}`}`
    );
  }

  renderRaidParties();
  renderExpedition();
  setTimeout(() => scheduleAutoSave(), 0);

  // 성공 메시지
  let message = '';
  if (targetCharacter) {
    message = `${sourceCharacter.name}와 ${targetCharacter.name} 캐릭터가 교체되었습니다.`;
  } else {
    message = `${sourceCharacter.name} 캐릭터가 ${targetPartyId} 파티 ${targetSlotIndex}번 슬롯으로 이동되었습니다.`;
  }
  
  window.modalManager.showAlert({
    title: '완료',
    message: message
  });
}

// 원정대 -> 공격대 드롭 처리
async function handleExpeditionToRaidDrop(charId, targetPartyId, targetSlotIndex, parties) {
  
  // ID로 캐릭터 정보 조회
  const character = findCharacterById(charId);
  if (!character) {
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 정보를 찾을 수 없습니다.'
    });
    return;
  }
  
  // 타겟 파티 찾기
  const targetParty = parties.find(p => p.id === targetPartyId);
  if (!targetParty) {
    window.modalManager.showAlert({
      title: '오류',
      message: `타겟 파티 ${targetPartyId}를 찾을 수 없습니다.`
    });
    return;
  }
  
  // 🔥 **핵심 개선: 기존 캐릭터가 있으면 교체 처리**
  const existingCharacter = targetParty.members[targetSlotIndex];
  
  // 백업 데이터 생성
  const backupData = {
    targetParty: {
      id: targetParty.id,
      members: [...targetParty.members], // 깊은 복사
      slotIndex: targetSlotIndex,
      existingCharacter: existingCharacter
    },
    newCharacter: character
  };

  // 🔥 **제약조건 충돌 방지: 기존 캐릭터 제거**
  if (existingCharacter) {
    targetParty.members[targetSlotIndex] = null;
  }

  // 제약 조건 확인
  const currentParties = getCurrentTabParties();
  const partyValidation = Constraints.canAddCharacterToParty(targetParty, character, currentParties, targetSlotIndex);

  if (!partyValidation.valid) {
    
    // 롤백: 기존 캐릭터 복원
    if (existingCharacter) {
      targetParty.members[targetSlotIndex] = backupData.targetParty.existingCharacter;
    }
    
    window.modalManager.showAlert({
      title: '제약 조건 위반',
      message: partyValidation.message
    });
    return;
  }

  // 🔥 **제약 조건 통과 시 캐릭터 배치**
  // 공격대에는 캐릭터 ID와 이름 저장
  const oldMember = targetParty.members[targetSlotIndex];
  const newMember = { 
    id: character.id,
    name: character.name 
  };
  
  // 히스토리 기록
  if (typeof recordHistory === 'function') {
    await recordHistory(
      'add',
      {
        type: 'character',
        id: `${targetPartyId}_slot${targetSlotIndex}`,
        path: `party.members[${targetSlotIndex}]`
      },
      oldMember,
      newMember,
      `${targetPartyId} 파티 ${targetSlotIndex}번 슬롯에 ${character.name} 캐릭터 추가`
    );
  }

  // 캐릭터 배치
  targetParty.members[targetSlotIndex] = newMember;

  // UI 업데이트 (즉시 반영)
  renderRaidParties(true); // 즉시 렌더링
  renderExpedition();

  // 비동기 저장 (UI 블로킹 방지)
  setTimeout(() => {
    scheduleAutoSave();
  }, 0);
  
  window.modalManager.showAlert({
    title: '캐릭터 추가 완료',
    message: `${character.name} 캐릭터가 ${targetPartyId} 파티 ${targetSlotIndex}번 슬롯에 추가되었습니다.`
  });
}

// 원정대에서 공격대로 드래 앤 드롭 핸들러
async function handleExpeditionDrop(event, expeditionIndex) {
  event.preventDefault();
  event.stopPropagation(); // 이벤트 버블링 방지
  event.currentTarget.classList.remove('dragover');
  
  // 전역 중복 방지 플래그 확인
  if (isDropProcessing) return;

  // 드래그 데이터 중복 실행 방지
  if (draggedData && draggedData.processed) return;

  // 타겟 오브젝트 명 생성
  const targetObjectName = `expedition_${expeditionIndex}`;

  // 충돌 체크: 시작 지점과 타겟 지점이 같은지 확인
  if (draggedData && draggedData.sourceObjectName === targetObjectName) return;

  // 중복 방지 플래그 설정
  isDropProcessing = true;
  if (draggedData) draggedData.processed = true;

  try {
    // 슬롯 단위 락: 원정대 슬롯(검색/등록 대상)에 타인 락이면 차단
    if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
      const slotLockKey = `expeditionSearch:${expeditionIndex}`;
      const lockedByOther = await window.realtimeSync.isSlotLockedByOther(slotLockKey);
      if (lockedByOther) {
        window.modalManager.showAlert({
          title: '편집 중',
          message: '다른 사용자가 이 원정대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
        });
        return;
      }
    }

    const data = JSON.parse(event.dataTransfer.getData('text/plain'));

    // 공격대에서 온 캐릭터인 경우 원정대에 추가
    if (draggedData && draggedData.fromRaid) {
      const parties = getCurrentTabParties();
      
      // 해당 캐릭터를 원정대에서 제거
      if (draggedData.partyId && draggedData.slotIndex !== null) {
        const party = parties.find(p => p.id === draggedData.partyId);
        if (party) {
          party.members[draggedData.slotIndex] = null;
        }
      }
      
      // 원정대에 빈 슬롯 찾기
      const targetSlot = state.expeditionSlots[expeditionIndex];
      const emptyIndex = targetSlot.findIndex(char => char === null);
      
      if (emptyIndex !== -1) {
        targetSlot[emptyIndex] = data;
        renderRaidParties();
        renderExpedition();
        
        // 자동 저장
        scheduleAutoSave();
        
        window.modalManager.showAlert({
          title: '캐릭터 이동 완료',
          message: `${data.name} 캐릭터가 원정대 슬롯 ${expeditionIndex + 1}로 이동되었습니다.`
        });
      } else {
        window.modalManager.showAlert({
          title: '슬롯 가득 참',
          message: `원정대 슬롯 ${expeditionIndex + 1}이 가득 찼습니다.`
        });
      }
    }
    
    // 실시간 동기화는 scheduleAutoSave() -> autoSaveToDatabase()에서 처리
  } catch (error) {
    console.error('❌ [EXPEDITION DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '캐릭터 이동 오류',
      message: '캐릭터를 이동하는 중 오류가 발생했습니다: ' + error.message
    });
  } finally {
    // 중복 방지 플래그 초기화
    isDropProcessing = false;
  }
}

// 원정대 캐릭터 드롭 핸들러 (원정대 내 캐릭터 간 교체)
async function handleExpeditionCharacterDrop(event, expeditionIndex, characterIndex) {
  event.preventDefault();
  event.stopPropagation(); // 이벤트 버블링 방지
  event.currentTarget.classList.remove('dragover');
  
  // 전역 중복 방지 플래그 확인
  if (isDropProcessing) return;

  // 드래그 데이터 중복 실행 방지
  if (draggedData && draggedData.processed) return;

  // 타겟 오브젝트 명 생성
  const targetObjectName = `expedition_${expeditionIndex}_${characterIndex}`;

  // 충돌 체크: 시작 지점과 타겟 지점이 같은지 확인
  if (draggedData && draggedData.sourceObjectName === targetObjectName) return;

  // 중복 방지 플래그 설정
  isDropProcessing = true;
  if (draggedData) draggedData.processed = true;

  try {
    // 원정대에서 온 캐릭터인 경우 (원정대 -> 원정대 이동)
    if (draggedData && !draggedData.fromRaid) {
      await handleExpeditionToExpeditionDrop(draggedData, expeditionIndex, characterIndex);
    }
    // 공격대에서 온 캐릭터인 경우 (공격대 -> 원정대 이동)
    else if (draggedData && draggedData.fromRaid) {
      await handleRaidToExpeditionDrop(draggedData, expeditionIndex, characterIndex);
    }
    
  } catch (error) {
    console.error('❌ [EXPEDITION CHARACTER DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터를 이동하는 중 오류가 발생했습니다: ' + error.message
    });
  } finally {
    // 중복 방지 플래그 초기화
    isDropProcessing = false;
  }
}

// 원정대 -> 원정대 드롭 처리 (캐릭터 교체)
async function handleExpeditionToExpeditionDrop(draggedData, targetExpeditionIndex, targetCharacterIndex) {
  const { expeditionIndex: sourceExpeditionIndex, expeditionSlotIndex: sourceCharacterIndex } = draggedData;
  
  // 소스 캐릭터 정보
  const sourceSlot = state.expeditionSlots[sourceExpeditionIndex];
  const sourceCharacter = sourceSlot[sourceCharacterIndex];
  
  if (!sourceCharacter) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 캐릭터를 찾을 수 없습니다.'
    });
    return;
  }
  
  // 타겟 캐릭터 정보
  const targetSlot = state.expeditionSlots[targetExpeditionIndex];
  const targetCharacter = targetSlot[targetCharacterIndex];
  
  // 히스토리 기록
  if (typeof recordHistory === 'function') {
    await recordHistory(
      'update',
      {
        type: 'expedition_character_swap',
        id: `expedition_swap_${sourceExpeditionIndex}_${sourceCharacterIndex}_to_${targetExpeditionIndex}_${targetCharacterIndex}`,
        path: `expedition_swap`
      },
      {
        source: { expeditionIndex: sourceExpeditionIndex, characterIndex: sourceCharacterIndex, character: sourceCharacter },
        target: { expeditionIndex: targetExpeditionIndex, characterIndex: targetCharacterIndex, character: targetCharacter }
      },
      {
        source: { expeditionIndex: sourceExpeditionIndex, characterIndex: sourceCharacterIndex, character: targetCharacter },
        target: { expeditionIndex: targetExpeditionIndex, characterIndex: targetCharacterIndex, character: sourceCharacter }
      },
      `원정대 슬롯 ${sourceExpeditionIndex + 1}-${sourceCharacterIndex + 1}와 ${targetExpeditionIndex + 1}-${targetCharacterIndex + 1} 캐릭터 교체`
    );
  }
  
  // 캐릭터 교체 실행
  sourceSlot[sourceCharacterIndex] = targetCharacter;
  targetSlot[targetCharacterIndex] = sourceCharacter;
  
  // UI 업데이트
  renderExpedition();
  
  // 원정대 관리 모달이 열려있으면 모달 내용도 업데이트
  const expeditionModal = document.getElementById('expeditionModal');
  if (expeditionModal && expeditionModal.classList.contains('show')) {
    renderExpeditionModal();
  }
  
  // 비동기 저장
  setTimeout(() => {
    scheduleAutoSave();
  }, 0);
  
  // 성공 메시지
  let message = '';
  if (targetCharacter) {
    message = `${sourceCharacter.name}와 ${targetCharacter.name} 캐릭터가 교체되었습니다.`;
  } else {
    message = `${sourceCharacter.name} 캐릭터가 원정대 슬롯 ${targetExpeditionIndex + 1}-${targetCharacterIndex + 1}로 이동되었습니다.`;
  }
  
  window.modalManager.showAlert({
    title: '캐릭터 이동 완료',
    message: message
  });
}

// 공격대 -> 원정대 드롭 처리 (공격대 캐릭터를 원정대 특정 위치에 추가)
async function handleRaidToExpeditionDrop(draggedData, targetExpeditionIndex, targetCharacterIndex) {
  const { partyId: sourcePartyId, slotIndex: sourceSlotIndex } = draggedData;
  
  // 소스 파티 찾기
  const parties = getCurrentTabParties();
  const sourceParty = parties.find(p => p.id === sourcePartyId);
  
  if (!sourceParty) {
    window.modalManager.showAlert({
      title: '오류',
      message: `소스 파티 ${sourcePartyId}를 찾을 수 없습니다.`
    });
    return;
  }
  
  // 소스 캐릭터 정보
  const sourceCharacter = sourceParty.members[sourceSlotIndex];
  
  if (!sourceCharacter) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 슬롯에 캐릭터가 없습니다.'
    });
    return;
  }
  
  // 타겟 캐릭터 정보
  const targetSlot = state.expeditionSlots[targetExpeditionIndex];
  const targetCharacter = targetSlot[targetCharacterIndex];
  
  // 타겟 슬롯이 비어있는 경우에만 허용
  if (targetCharacter) {
    window.modalManager.showAlert({
      title: '오류',
      message: '해당 슬롯은 이미 캐릭터가 있습니다. 빈 슬롯에만 드롭해주세요.'
    });
    return;
  }
  
  // 히스토리 기록
  if (typeof recordHistory === 'function') {
    await recordHistory(
      'update',
      {
        type: 'raid_to_expedition',
        id: `raid_${sourcePartyId}_${sourceSlotIndex}_to_expedition_${targetExpeditionIndex}_${targetCharacterIndex}`,
        path: `raid_to_expedition`
      },
      {
        source: { partyId: sourcePartyId, slotIndex: sourceSlotIndex, character: sourceCharacter },
        target: { expeditionIndex: targetExpeditionIndex, characterIndex: targetCharacterIndex, character: null }
      },
      {
        source: { partyId: sourcePartyId, slotIndex: sourceSlotIndex, character: null },
        target: { expeditionIndex: targetExpeditionIndex, characterIndex: targetCharacterIndex, character: sourceCharacter }
      },
      `${sourcePartyId} 파티 ${sourceSlotIndex}번 슬롯 캐릭터를 원정대 슬롯 ${targetExpeditionIndex + 1}-${targetCharacterIndex + 1}로 이동`
    );
  }
  
  // 캐릭터 이동 실행
  sourceParty.members[sourceSlotIndex] = null;
  targetSlot[targetCharacterIndex] = sourceCharacter;
  
  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 원정대 관리 모달이 열려있으면 모달 내용도 업데이트
  const expeditionModal = document.getElementById('expeditionModal');
  if (expeditionModal && expeditionModal.classList.contains('show')) {
    renderExpeditionModal();
  }
  
  // 비동기 저장
  setTimeout(() => {
    scheduleAutoSave();
  }, 0);
  
  window.modalManager.showAlert({
    title: '캐릭터 이동 완료',
    message: `${sourceCharacter.name} 캐릭터가 원정대 슬롯 ${targetExpeditionIndex + 1}-${targetCharacterIndex + 1}로 이동되었습니다.`
  });
}
