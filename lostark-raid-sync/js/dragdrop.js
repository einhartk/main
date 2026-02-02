// 드래그 앤 드롭 핸들러
let draggedData = null;

// 클릭/더블클릭 구분을 위한 타이머
let clickTimer = null;
let clickCount = 0;

// ID로 캐릭터 정보 조회
function findCharacterById(charId) {
  // 모든 원정대 슬롯에서 캐릭터 검색
  for (const slot of state.expeditionSlots) {
    const character = slot.find(char => char.id === charId);
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
  
  clickCount++;
  
  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      // 싱글 클릭
      clickCount = 0;
      singleClickCallback();
    }, 250);
  } else if (clickCount === 2) {
    // 더블 클릭
    clearTimeout(clickTimer);
    clickCount = 0;
    doubleClickCallback();
  }
}

// 공격대 캐릭터 클릭 처리
function handleCharacterClick(event, charId, partyId, slotIndex) {
  handleClickEvent(
    event,
    // 싱글 클릭: 캐릭터 선택 모달
    () => {
      openRaidCharacterSelector(partyId, slotIndex);
    },
    // 더블 클릭: 캐릭터 삭제
    () => {
      confirmRemoveCharacter(charId, partyId, slotIndex);
    }
  );
}

function handleDragStart(event, charId, fromRaid, partyId, slotIndex, expeditionIndex, expeditionSlotIndex) {
  draggedData = {
    charId,
    fromRaid,
    partyId,
    slotIndex,
    expeditionIndex,
    expeditionSlotIndex
  };
  
  // ID만 전송
  event.dataTransfer.setData('text/plain', charId);
  if (event.target && event.target.classList) {
    event.target.classList.add('dragging');
  }
}

function handleDragEnd(event) {
  if (event.target && event.target.classList) {
    event.target.classList.remove('dragging');
  }
  // 드래그 데이터 초기화
  draggedData = null;
}

function handleDragOver(event) {
  event.preventDefault();
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
  
  // 중복 실행 방지 (드래그 데이터 초기화)
  if (draggedData.processed) {
    console.log('🔄 [DROP] Already processed, skipping');
    return;
  }
  draggedData.processed = true;
  
  try {
    // 원정대에서 온 캐릭터인 경우 공격대에 추가
    if (!draggedData || !draggedData.fromRaid) {
      const parties = getCurrentTabParties();
      
      // ID로 캐릭터 정보 조회
      const character = findCharacterById(charId);
      if (!character) {
        window.modalManager.showAlert({
          title: '오류',
          message: '캐릭터 정보를 찾을 수 없습니다.'
        });
        return;
      }
      
      // 모든 파티의 빈 슬롯 찾기
      for (const party of parties) {
        const emptyIndex = party.members.findIndex(m => m === null);
        if (emptyIndex !== -1) {
          // 제약 조건 확인
          const partyValidation = Constraints.canAddCharacterToParty(party, character);
          if (!partyValidation.valid) {
            window.modalManager.showAlert({
              title: '제약 조건 위반',
              message: partyValidation.message
            });
            continue;
          }
          
          // 공격대에는 캐릭터 ID와 이름 저장
          const oldMember = party.members[emptyIndex];
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
                id: `${party.id}_slot${emptyIndex}`,
                path: `party.members[${emptyIndex}]`
              },
              oldMember,
              newMember,
              `${party.id} 파티 ${emptyIndex}번 슬롯에 ${character.name} 캐릭터 추가`
            );
          }
          
          party.members[emptyIndex] = newMember;
          
          // 자동 저장
          scheduleAutoSave();
          
          window.modalManager.showAlert({
            title: '캐릭터 추가 완료',
            message: `${character.name} 캐릭터가 공격대에 추가되었습니다.`
          });
          
          // UI 업데이트 (마지막에 한 번만)
          renderRaidParties();
          renderExpedition();
          return; // 첫 번째 빈 슬롯에 추가 후 바로 종료
        }
      }
      
      if (!added) {
        window.modalManager.showAlert({
          title: '알림',
          message: '빈 슬롯이 없습니다. 새로운 공격대를 생성해주세요.'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ [DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터를 추가하는 중 오류가 발생했습니다.'
    });
  }
  
  draggedData = null;
}

// 원정대에서 공격대로 드래 앤 드롭 핸들러
async function handleExpeditionDrop(event, expeditionIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  
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
  }
}
