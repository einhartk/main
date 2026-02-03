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
  
  // 즉시 반응을 위해 디바운스 없이 바로 실행
  console.log(`🖱️ [RIGHT CLICK] 우클릭 감지:`, { charId, partyId, slotIndex, expeditionIndex, characterIndex });
  
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
  // 1. 모든 원정대 슬롯에서 캐릭터 검색
  for (const slot of state.expeditionSlots) {
    const character = slot.find(char => char.id === charId);
    if (character) {
      return character;
    }
  }
  
  // 2. 모든 공격대 파티에서 캐릭터 검색
  const parties = getCurrentTabParties();
  for (const party of parties) {
    for (const member of party.members) {
      if (member && member.id === charId) {
        // 공격대에는 ID와 이름만 저장되어 있으므로, 원정대에서 상세 정보 찾기
        const detailedCharacter = findCharacterByIdFromExpedition(member.name);
        if (detailedCharacter) {
          return detailedCharacter;
        }
        // 원정대에 없으면 최소한의 정보라도 반환
        return member;
      }
    }
  }
  
  return null;
}

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

// 공격대 캐릭터 클릭 처리 (더블클릭 기능 제거, 우클릭으로 변경)
function handleCharacterClick(event, charId, partyId, slotIndex) {
  // 이 함수는 더 이상 사용되지 않음 (우클릭으로 삭제 기능으로 변경)
  console.log('⚠️ [DEPRECATED] handleCharacterClick 함수는 더 이상 사용되지 않습니다. 우클릭을 사용하세요.');
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
  
  // 디버깅 로그 추가
  console.log(`🚀 [DRAG START] 드래그 시작:`, {
    charId,
    fromRaid,
    partyId,
    slotIndex,
    expeditionIndex,
    expeditionSlotIndex,
    sourceObjectName
  });
  
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
  
  // 성능 로그
  if (draggedData && draggedData.startTime) {
    const duration = performance.now() - draggedData.startTime;
    console.log(`🚀 [DRAG] 드래그 완료: ${duration.toFixed(2)}ms`);
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
  
  // 전역 중복 방지 플래그 확인
  if (isDropProcessing) {
    console.log('🔄 [DROP] Drop already processing, skipping');
    return;
  }
  
  // 드래그 데이터 중복 실행 방지
  if (draggedData.processed) {
    console.log('🔄 [DROP] Already processed, skipping');
    return;
  }
  
  // 중복 방지 플래그 설정
  isDropProcessing = true;
  draggedData.processed = true;
  
  // 드롭 처리 시작 시간 기록
  const dropStartTime = performance.now();
  
  // 타겟 오브젝트 명 생성
  const targetObjectName = `raid_${partyId}_${slotIndex}`;
  
  // 충돌 체크: 시작 지점과 타겟 지점이 같은지 확인
  if (draggedData && draggedData.sourceObjectName === targetObjectName) {
    console.log(`⚠️ [DROP] 자기 자신에게 드롭 무시: ${targetObjectName}`);
    return;
  }
  
  // 디버깅 로그 추가
  console.log(`🎯 [DROP] 드롭 대상:`, {
    partyId,
    slotIndex,
    charId,
    draggedData,
    sourceObjectName: draggedData?.sourceObjectName,
    targetObjectName
  });
  
  try {
    const parties = getCurrentTabParties();
    
    // 공격대에서 온 캐릭터인 경우 (공격대 -> 공격대 이동)
    if (draggedData && draggedData.fromRaid) {
      await handleRaidToRaidDrop(draggedData, partyId, slotIndex, parties);
    } 
    // 원정대에서 온 캐릭터인 경우 (원정대 -> 공격대 이동)
    else {
      await handleExpeditionToRaidDrop(charId, partyId, slotIndex, parties);
    }
    
  } catch (error) {
    console.error('❌ [DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터를 추가하는 중 오류가 발생했습니다.'
    });
  } finally {
    // 중복 방지 플래그 초기화
    isDropProcessing = false;
    draggedData = null;
  }
}

// 공격대 -> 공격대 드롭 처리
async function handleRaidToRaidDrop(draggedData, targetPartyId, targetSlotIndex, parties) {
  const { partyId: sourcePartyId, slotIndex: sourceSlotIndex } = draggedData;
  
  // 디버깅 로그 추가
  console.log(`🔍 [RAID TO RAID] 파티 정보:`, {
    sourcePartyId,
    targetPartyId,
    sourceSlotIndex,
    targetSlotIndex,
    draggedData,
    availableParties: parties.map(p => ({ id: p.id, name: p.name, displayName: p.displayName }))
  });
  
  // 소스 파티 찾기
  const sourceParty = parties.find(p => p.id === sourcePartyId);
  if (!sourceParty) {
    console.error(`❌ [RAID TO RAID] 소스 파티 찾기 실패:`, {
      sourcePartyId,
      availableIds: parties.map(p => p.id)
    });
    window.modalManager.showAlert({
      title: '오류',
      message: `소스 파티 ${sourcePartyId}를 찾을 수 없습니다.`
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
  
  // 소스 캐릭터 정보
  const sourceCharacter = sourceParty.members[sourceSlotIndex];
  if (!sourceCharacter) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 슬롯에 캐릭터가 없습니다.'
    });
    return;
  }
  
  // 타겟 슬롯 상태 확인
  const targetCharacter = targetParty.members[targetSlotIndex];
  
  // 소스 캐릭터의 상세 정보 조회
  const sourceCharacterDetails = findCharacterById(sourceCharacter.id);
  if (!sourceCharacterDetails) {
    window.modalManager.showAlert({
      title: '오류',
      message: '소스 캐릭터 정보를 찾을 수 없습니다.'
    });
    return;
  }
  
  // 캐릭터 교체인 경우: 두 캐릭터를 미리 제거 후 제약 조건 확인
  if (targetCharacter) {
    // 타겟 캐릭터의 상세 정보 조회
    const targetCharacterDetails = findCharacterById(targetCharacter.id);
    if (!targetCharacterDetails) {
      window.modalManager.showAlert({
        title: '오류',
        message: '타겟 캐릭터 정보를 찾을 수 없습니다.'
      });
      return;
    }
    
    // 두 캐릭터를 임시 저장
    const tempSourceMember = sourceParty.members[sourceSlotIndex];
    const tempTargetMember = targetParty.members[targetSlotIndex];
    
    console.log(`🔍 [CHARACTER SWAP] 교체 전 상태:`, {
      sourceCharacter: tempSourceMember?.name,
      targetCharacter: tempTargetMember?.name,
      sourcePartyId,
      targetPartyId,
      sourceSlotIndex,
      targetSlotIndex
    });
    
    // 두 캐릭터를 모두 제거 (제약 조건을 피하기 위함)
    sourceParty.members[sourceSlotIndex] = null;
    targetParty.members[targetSlotIndex] = null;
    
    // 소스 캐릭터를 타겟 파티에 배치할 수 있는지 확인
    const sourceValidation = Constraints.canAddCharacterToParty(targetParty, sourceCharacterDetails);
    
    // 타겟 캐릭터를 소스 파티에 배치할 수 있는지 확인
    const targetValidation = Constraints.canAddCharacterToParty(sourceParty, targetCharacterDetails);
    
    console.log(`🔍 [CHARACTER SWAP] 제약 조건 확인 결과:`, {
      sourceValidation: {
        valid: sourceValidation.valid,
        message: sourceValidation.message,
        character: sourceCharacterDetails.name,
        targetParty: targetPartyId
      },
      targetValidation: {
        valid: targetValidation.valid,
        message: targetValidation.message,
        character: targetCharacterDetails.name,
        targetParty: sourcePartyId
      }
    });
    
    // 제약 조건 위반 시 원상 복구
    if (!sourceValidation.valid || !targetValidation.valid) {
      // 원상 복구
      sourceParty.members[sourceSlotIndex] = tempSourceMember;
      targetParty.members[targetSlotIndex] = tempTargetMember;
      
      const errorMessage = !sourceValidation.valid 
        ? `${sourceCharacterDetails.name} 캐릭터를 ${targetPartyId} 파티에 배치할 수 없습니다: ${sourceValidation.message}`
        : `${targetCharacterDetails.name} 캐릭터를 ${sourcePartyId} 파티에 배치할 수 없습니다: ${targetValidation.message}`;
      
      window.modalManager.showAlert({
        title: '제약 조건 위반',
        message: errorMessage
      });
      return;
    }
    
    // 제약 조건 통과 시 교체 실행
    sourceParty.members[sourceSlotIndex] = tempTargetMember;
    targetParty.members[targetSlotIndex] = tempSourceMember;
    
    console.log(`🔍 [CHARACTER SWAP] 교체 완료:`, {
      sourceSlot: `${sourcePartyId}-${sourceSlotIndex}: ${tempTargetMember?.name}`,
      targetSlot: `${targetPartyId}-${targetSlotIndex}: ${tempSourceMember?.name}`
    });
    
  } else {
    // 빈 슬롯으로 이동하는 경우
    // 중복 제약 조건을 피하기 위해 일시적으로 소스 캐릭터를 제거하고 확인
    const tempSourceMember = sourceParty.members[sourceSlotIndex];
    sourceParty.members[sourceSlotIndex] = null; // 일시적 제거
    
    console.log(`🔍 [EMPTY SLOT MOVE] 빈 슬롯 이동 - 소스 캐릭터 제거 후 제약 조건 확인:`, {
      sourceCharacterName: sourceCharacterDetails.name,
      targetPartyId,
      removedSourceCharacter: tempSourceMember?.name
    });
    
    const sourceValidation = Constraints.canAddCharacterToParty(targetParty, sourceCharacterDetails);
    
    console.log(`🔍 [EMPTY SLOT MOVE] 제약 조건 결과:`, {
      valid: sourceValidation.valid,
      message: sourceValidation.message
    });
    
    if (!sourceValidation.valid) {
      // 원상 복구
      sourceParty.members[sourceSlotIndex] = tempSourceMember;
      
      window.modalManager.showAlert({
        title: '제약 조건 위반',
        message: `${sourceCharacter.name} 캐릭터를 ${targetPartyId} 파티에 배치할 수 없습니다: ${sourceValidation.message}`
      });
      return;
    }
    
    // 이동 실행
    sourceParty.members[sourceSlotIndex] = null;
    targetParty.members[targetSlotIndex] = tempSourceMember;
    
    console.log(`🔍 [EMPTY SLOT MOVE] 이동 완료:`, {
      from: `${sourcePartyId}-${sourceSlotIndex}`,
      to: `${targetPartyId}-${targetSlotIndex}`,
      character: sourceCharacterDetails.name
    });
  }
  
  // 히스토리 기록 (배치 작업)
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
        source: { partyId: sourcePartyId, slotIndex: sourceSlotIndex, character: targetCharacter },
        target: { partyId: targetPartyId, slotIndex: targetSlotIndex, character: sourceCharacter }
      },
      targetCharacter 
        ? `${sourcePartyId} 파티 ${sourceSlotIndex}번 슬롯과 ${targetPartyId} 파티 ${targetSlotIndex}번 슬롯 캐릭터 교체`
        : `${sourcePartyId} 파티 ${sourceSlotIndex}번 슬롯 캐릭터를 ${targetPartyId} 파티 ${targetSlotIndex}번 슬롯으로 이동`
    );
  }
  
  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 비동기 저장
  setTimeout(() => {
    scheduleAutoSave();
  }, 0);
  
  // 성공 메시지
  let message = '';
  if (targetCharacter) {
    message = `${sourceCharacter.name}와 ${targetCharacter.name} 캐릭터가 교체되었습니다.`;
  } else {
    message = `${sourceCharacter.name} 캐릭터가 ${targetPartyId} 파티 ${targetSlotIndex}번 슬롯으로 이동되었습니다.`;
  }
  
  window.modalManager.showAlert({
    title: '캐릭터 이동 완료',
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
  
  // 지정된 파티에 캐릭터 추가
  const targetParty = parties.find(p => p.id === targetPartyId);
  if (!targetParty) {
    window.modalManager.showAlert({
      title: '오류',
      message: `파티 ${targetPartyId}를 찾을 수 없습니다.`
    });
    return;
  }
  
  // 슬롯이 비어있는지 확인
  if (targetParty.members[targetSlotIndex] !== null) {
    window.modalManager.showAlert({
      title: '오류',
      message: `해당 슬롯은 이미 캐릭터가 있습니다. 빈 슬롯에만 드롭해주세요.`
    });
    return;
  }
  
  // 제약 조건 확인
  const partyValidation = Constraints.canAddCharacterToParty(targetParty, character);
  if (!partyValidation.valid) {
    window.modalManager.showAlert({
      title: '제약 조건 위반',
      message: partyValidation.message
    });
    return;
  }
  
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
  
  targetParty.members[targetSlotIndex] = newMember;
  
  // UI 업데이트 (즉시 반영)
  renderRaidParties();
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
  if (isDropProcessing) {
    console.log('🔄 [EXPEDITION DROP] Drop already processing, skipping');
    return;
  }
  
  // 드래그 데이터 중복 실행 방지
  if (draggedData && draggedData.processed) {
    console.log('🔄 [EXPEDITION DROP] Already processed, skipping');
    return;
  }
  
  // 타겟 오브젝트 명 생성
  const targetObjectName = `expedition_${expeditionIndex}`;
  
  // 충돌 체크: 시작 지점과 타겟 지점이 같은지 확인
  if (draggedData && draggedData.sourceObjectName === targetObjectName) {
    console.log(`⚠️ [EXPEDITION DROP] 자기 자신에게 드롭 무시: ${targetObjectName}`);
    return;
  }
  
  // 중복 방지 플래그 설정
  isDropProcessing = true;
  if (draggedData) {
    draggedData.processed = true;
  }
  
  // 디버깅 로그 추가
  console.log(`🎯 [EXPEDITION DROP] 드롭 대상:`, {
    expeditionIndex,
    draggedData,
    sourceObjectName: draggedData?.sourceObjectName,
    targetObjectName
  });
  
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
    console.log(`📊 [EXPEDITION DROP] Received:`, { name: data.name, id: data.id });
    
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
  if (isDropProcessing) {
    console.log('🔄 [EXPEDITION CHARACTER DROP] Drop already processing, skipping');
    return;
  }
  
  // 드래그 데이터 중복 실행 방지
  if (draggedData && draggedData.processed) {
    console.log('🔄 [EXPEDITION CHARACTER DROP] Already processed, skipping');
    return;
  }
  
  // 타겟 오브젝트 명 생성
  const targetObjectName = `expedition_${expeditionIndex}_${characterIndex}`;
  
  // 충돌 체크: 시작 지점과 타겟 지점이 같은지 확인
  if (draggedData && draggedData.sourceObjectName === targetObjectName) {
    console.log(`⚠️ [EXPEDITION CHARACTER DROP] 자기 자신에게 드롭 무시: ${targetObjectName}`);
    return;
  }
  
  // 중복 방지 플래그 설정
  isDropProcessing = true;
  if (draggedData) {
    draggedData.processed = true;
  }
  
  // 디버깅 로그 추가
  console.log(`🎯 [EXPEDITION CHARACTER DROP] 드롭 대상:`, {
    expeditionIndex,
    characterIndex,
    draggedData,
    sourceObjectName: draggedData?.sourceObjectName,
    targetObjectName
  });
  
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
