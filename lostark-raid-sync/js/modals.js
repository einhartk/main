// 캐릭터 삭제 확인 함수
async function confirmRemoveCharacter(characterId, partyId, slotIndex) {
  // 캐릭터 정보 찾기
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || !party.members[slotIndex]) return;

  // 슬롯 단위 락: 타인이 해당 공격대 슬롯 편집 중이면 삭제 차단
  if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
    if (state.selectedRaid && state.selectedDifficulty) {
      const slotLockKey = `raidSlot:${state.selectedRaid.id}:${state.selectedDifficulty.id}:${partyId}:${slotIndex}`;
      const lockedByOther = await window.realtimeSync.isSlotLockedByOther(slotLockKey);
      if (lockedByOther) {
        window.modalManager.showAlert({
          title: '편집 중',
          message: '다른 사용자가 이 공격대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
        });
        return;
      }
    }
  }
  
  const character = party.members[slotIndex];
  const characterName = character.name;
  
  // 삭제 확인 모달 표시
  window.modalManager.showConfirm({
    title: '캐릭터 삭제',
    message: `${characterName} 캐릭터를 공격대에서 삭제하시겠습니까?`,
    confirmText: '삭제',
    cancelText: '취소',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      // 캐릭터 삭제
      party.members[slotIndex] = null;

      // 드래그 상태가 남아 있으면 정리
      if (draggedData && draggedData.fromRaid && draggedData.partyId === partyId && draggedData.slotIndex === slotIndex) {
        draggedData = null;
      }
      
      // UI 업데이트
      renderRaidParties();
      renderExpedition();
      
      // 자동 저장
      scheduleAutoSave();
      
      window.modalManager.showAlert({
        title: '삭제 완료',
        message: `${characterName} 캐릭터가 공격대에서 삭제되었습니다.`
      });
    }
  });
}

// 캐릭터 조회 모달 열기
let currentTargetSlot = null;

async function openCharacterSearchModal(slotIndex) {
  currentTargetSlot = slotIndex;

  // 슬롯 단위 락 (동기화 모드에서만)
  let slotLockKey = null;
  if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
    slotLockKey = `expeditionSearch:${slotIndex}`;
    const lockedByOther = await window.realtimeSync.isSlotLockedByOther(slotLockKey);
    if (lockedByOther) {
      window.modalManager.showAlert({
        title: '편집 중',
        message: '다른 사용자가 이 원정대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
      });
      return;
    }

    const ok = await window.realtimeSync.acquireSlotLock(slotLockKey);
    if (!ok) {
      window.modalManager.showAlert({
        title: '편집 충돌',
        message: '다른 사용자가 이 원정대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
      });
      return;
    }
  }
  
  // 모달에 현재 슬롯 정보 표시
  document.getElementById('targetSlotInfo').value = `슬롯 ${slotIndex + 1}`;
  document.getElementById('searchCharacterName').value = '';
  document.getElementById('searchProgress').style.display = 'none';
  
  // 모달 열기
  const modalEl = document.getElementById('characterSearchModal');
  const modal = new bootstrap.Modal(modalEl);

  // 모달 닫힘 시 슬롯 락 해제
  if (slotLockKey) {
    modalEl.addEventListener('hidden.bs.modal', async () => {
      try {
        if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
          await window.realtimeSync.releaseSlotLock(slotLockKey);
        }
      } catch (_) {}
    }, { once: true });
  }

  modal.show();
  
  // 입력 필드에 포커스
  setTimeout(() => {
    document.getElementById('searchCharacterName').focus();
  }, 200);
}

async function searchCharacters() {
  // 중복 클릭 방지 - 즉시 버튼 비활성화
  const searchButton = document.getElementById('searchButton');
  if (searchButton.disabled) {
    console.log('🚫 [SEARCH] Search already in progress, ignoring duplicate click');
    return;
  }
  
  // 즉시 버튼 비활성화 (다른 코드보다 먼저 실행)
  searchButton.disabled = true;
  searchButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>조회 중...';
  
  // API 키 설정 확인
  if (!isLostArkApiKeyConfigured()) {
    searchButton.disabled = false;
    searchButton.innerHTML = '<i class="bi bi-search"></i> 조회';
    window.modalManager.showAlert({
      title: 'API 설정 오류',
      message: 'Lost Ark API 키가 설정되지 않았습니다. api-config.js 파일에서 API_KEY를 설정해주세요.'
    });
    return;
  }
  
  const characterNames = document.getElementById('searchCharacterName').value.trim();
  
  if (!characterNames) {
    searchButton.disabled = false;
    searchButton.innerHTML = '<i class="bi bi-search"></i> 조회';
    window.modalManager.showAlert({
      title: '입력 오류',
      message: '캐릭터명을 입력해주세요.'
    });
    return;
  }
  
  try {
    // 여러 캐릭터명 분리
    const names = characterNames.split(',').map(name => name.trim()).filter(name => name);
    
    if (names.length === 0) {
      throw new Error('유효한 캐릭터명을 입력해주세요.');
    }
    
    // 프로그레스 표시
    document.getElementById('searchProgress').style.display = 'block';
    document.getElementById('searchProgressText').textContent = `${names.length}개 캐릭터 정보를 조회 중입니다...`;
    
    // 약간의 지연을 주어 프로그레스 모달이 먼저 표시되도록 함
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const progressModal = window.modalManager.showProgress({
      title: '캐릭터 조회 중...',
      message: `${names.length}개 캐릭터 정보를 조회하고 있습니다.`
    });
    
    let allCharacters = [];
    let successCount = 0;
    let failCount = 0;
    const failedNames = [];
    
    // 각 캐릭터별로 조회
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      progressModal.updateMessage(`${i + 1}/${names.length}: ${name} 조회 중...`);
      
      try {
        const characters = await fetchCharacterData(name);
        if (characters && characters.length > 0) {
          allCharacters.push(...characters);
          successCount++;
        } else {
          failCount++;
          failedNames.push(name);
        }
      } catch (error) {
        console.error(`캐릭터 ${name} 조회 실패:`, error);
        failCount++;
        failedNames.push(name);
      }
    }
    
    progressModal.close();
    
    // 결과 표시
    displaySearchResults(allCharacters, successCount, failCount, failedNames);
    
  } catch (error) {
    // 프로그레스 모달 강제 닫기
    const progressModals = document.querySelectorAll('#progressModal');
    progressModals.forEach(modal => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    });
    
    document.getElementById('searchProgress').style.display = 'none';
    console.error('캐릭터 조회 중 오류:', error);
    
    // 더 상세한 오류 메시지
    let errorMessage = '캐릭터 조회 중 오류가 발생했습니다.';
    if (error.message.includes('CORS')) {
      errorMessage += '\n\nCORS 오류: 브라우저 보안 정책으로 인해 API 호출이 차단됩니다.\n서버를 통해 실행하거나 CORS 확장 프로그램을 사용하세요.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
      errorMessage += '\n\n인증 오류: API 키가 유효하지 않거나 만료되었습니다.';
    } else if (error.message.includes('404')) {
      errorMessage += '\n\n찾을 수 없는 캐릭터입니다.';
    }
    
    window.modalManager.showAlert({
      title: '조회 오류',
      message: errorMessage + '\n\n상세 오류: ' + error.message
    });
  } finally {
    // 버튼 활성화 (지연된 활성화로 빠른 클릭 방지)
    setTimeout(() => {
      searchButton.disabled = false;
      searchButton.innerHTML = '<i class="bi bi-search"></i> 조회';
    }, 300);
    
    // 추가 안전장치: 프로그레스 모달이 남아있으면 강제로 닫기
    setTimeout(() => {
      const remainingModals = document.querySelectorAll('#progressModal');
      remainingModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
          modalInstance.hide();
        }
      });
      document.getElementById('searchProgress').style.display = 'none';
    }, 100);
  }
}

// 캐릭터 정보 수정 함수
async function editCharacter(expeditionIndex, characterIndex, partyId = null, slotIndex = null) {
  try {
    // 캐릭터 정보 찾기
    let character = null;
    
    if (partyId !== null && slotIndex !== null) {
      // 공격대 파티 캐릭터
      const parties = getCurrentTabParties();
      const party = parties.find(p => p.id === partyId);
      if (party && party.members[slotIndex]) {
        character = party.members[slotIndex];
      }
    } else {
      // 원정대 캐릭터
      if (state.expeditionSlots[expeditionIndex] && state.expeditionSlots[expeditionIndex][characterIndex]) {
        character = state.expeditionSlots[expeditionIndex][characterIndex];
      }
    }
    
    if (!character) {
      console.warn('⚠️ [EDIT] 캐릭터를 찾을 수 없습니다:', { expeditionIndex, characterIndex, partyId, slotIndex });
      return;
    }
    
    // 수정 모달에 정보 표시
    document.getElementById('editName').value = character.name;
    document.getElementById('editCombatPower').value = character.combatPower || '0';
    document.getElementById('originalCombatPower').textContent = character.combatPower || '0';
    
    // 역할 라디오 버튼 설정
    const roleRadio = document.querySelector(`input[name="editRole"][value="${character.role}"]`);
    if (roleRadio) roleRadio.checked = true;
    
    // 저장 함수에 현재 위치 정보 저장
    window.currentEditPosition = { expeditionIndex, characterIndex, partyId, slotIndex };

    // 슬롯 단위 락 (공격대 캐릭터 슬롯 / 원정대 캐릭터 수정)
    let slotLockKey = null;
    if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
      if (partyId !== null && slotIndex !== null && state.selectedRaid && state.selectedDifficulty) {
        slotLockKey = `raidSlot:${state.selectedRaid.id}:${state.selectedDifficulty.id}:${partyId}:${slotIndex}`;
      } else if (partyId === null && expeditionIndex !== null && characterIndex !== null) {
        // 원정대 캐릭 수정도 동일하게 보호(요청 범위 밖이지만 충돌 방지)
        slotLockKey = `expeditionChar:${expeditionIndex}:${characterIndex}`;
      }

      if (slotLockKey) {
        const lockedByOther = await window.realtimeSync.isSlotLockedByOther(slotLockKey);
        if (lockedByOther) {
          window.modalManager.showAlert({
            title: '편집 중',
            message: '다른 사용자가 이 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
          });
          return;
        }

        const ok = await window.realtimeSync.acquireSlotLock(slotLockKey);
        if (!ok) {
          window.modalManager.showAlert({
            title: '편집 충돌',
            message: '다른 사용자가 이 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
          });
          return;
        }
      }
    }
    
    // 모달 열기
    const modalEl = document.getElementById('characterEditModal');
    const modal = new bootstrap.Modal(modalEl);

    if (slotLockKey) {
      modalEl.addEventListener('hidden.bs.modal', async () => {
        try {
          if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
            await window.realtimeSync.releaseSlotLock(slotLockKey);
          }
        } catch (_) {}
      }, { once: true });
    }

    modal.show();
    
  } catch (error) {
    console.error('❌ [CHARACTER EDIT ERROR]:', error);
    try {
      // 예외로 모달이 정상적으로 안 열렸을 때도 락이 남지 않게 정리
      if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
        await window.realtimeSync.releaseSlotLock();
      }
    } catch (_) {}
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 정보 수정 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 캐릭터 데이터 조회
async function fetchCharacterData(characterName) {
  try {
    // 1단계: 원정대 캐릭터 목록 조회
    const response = await fetch(`${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`, {
      headers: getLostArkHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const siblingsData = await response.json();
    
    if (!siblingsData || !Array.isArray(siblingsData) || siblingsData.length === 0) {
      return [];
    }
    
    // 2단계: 상세 정보 조회 (상위 6명)
    const topCharacters = siblingsData
      .sort((a, b) => parseFloat((b.ItemAvgLevel || '0').replace(',', '')) - parseFloat((a.ItemAvgLevel || '0').replace(',', '')))
      .slice(0, 6);
    
    const characterPromises = topCharacters.map(async (char) => {
      try {
        const [profileResponse, arkpassiveResponse] = await Promise.all([
          fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`, {
            headers: getLostArkHeaders()
          }),
          fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/arkpassive`, {
            headers: getLostArkHeaders()
          })
        ]);
        
        const profile = profileResponse.ok ? await profileResponse.json() : null;
        const arkpassive = arkpassiveResponse.ok ? await arkpassiveResponse.json() : null;
        
        return {
          id: char.CharacterName,
          name: char.CharacterName,
          ilvl: char.ItemAvgLevel || '0',
          combatPower: profile?.CombatPower || char.CombatPower || '0',
          role: guessRole(char.CharacterClassName, arkpassive),
          image: profile?.CharacterImage || 'img/default-character.png',
          className: char.CharacterClassName,
          level: char.CharacterLevel
        };
      } catch (error) {
        console.error(`캐릭터 ${char.CharacterName} 상세 정보 조회 실패:`, error);
        return null;
      }
    });
    
    const characters = await Promise.all(characterPromises);
    return characters.filter(char => char !== null)
      .sort((a, b) => parseFloat((b.ilvl || '0').replace(',', '')) - parseFloat((a.ilvl || '0').replace(',', '')));
    
  } catch (error) {
    console.error(`캐릭터 ${characterName} 조회 실패:`, error);
    throw error;
  }
}

// 직업 추측 함수
function guessRole(className, arkpassive) {
  // 아크패시브 Effects에서 축복의 여신 확인
  if (arkpassive && arkpassive.Effects) {
    const hasGoddessBlessing = arkpassive.Effects.some(effect => 
      effect.Description && effect.Description.includes("축복의 여신")
    );

    if (hasGoddessBlessing) {
      return "support";
    }
  }
  
  // 기존 직업명 기준 구분 (백업)
  return ["바드","홀리나이트","도화가"].includes(className) ? "support" : "dps";
}

// 공격대 캐릭터 선택 모달 열기
async function openRaidCharacterSelector(partyId, slotIndex) {
  try {
    // 슬롯 단위 락 확인
    if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
      if (state.selectedRaid && state.selectedDifficulty) {
        const slotLockKey = `raidSlot:${state.selectedRaid.id}:${state.selectedDifficulty.id}:${partyId}:${slotIndex}`;
        const lockedByOther = await window.realtimeSync.isSlotLockedByOther(slotLockKey);
        if (lockedByOther) {
          window.modalManager.showAlert({
            title: '편집 중',
            message: '다른 사용자가 이 공격대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
          });
          return;
        }

        const ok = await window.realtimeSync.acquireSlotLock(slotLockKey);
        if (!ok) {
          window.modalManager.showAlert({
            title: '편집 충돌',
            message: '다른 사용자가 이 공격대 슬롯을 편집 중입니다. 잠시 후 다시 시도해주세요.'
          });
          return;
        }
      }
    }

    // 현재 파티 정보 가져오기
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    if (!party) return;

    // 원정대에서 사용 가능한 캐릭터 목록 가져오기
    const availableCharacters = [];
    for (const slot of state.expeditionSlots) {
      for (const char of slot) {
        // 제약 조건 확인
        const partyValidation = Constraints.canAddCharacterToParty(party, char);
        if (partyValidation.valid) {
          availableCharacters.push(char);
        }
      }
    }

    // 중복 제거 (이름 기준)
    const uniqueCharacters = availableCharacters.filter((char, index, self) => 
      index === self.findIndex(c => c.name === char.name)
    );

    // 현재 슬롯에 있는 캐릭터는 목록에서 제외
    const currentChar = party.members[slotIndex];
    if (currentChar) {
      const currentIndex = uniqueCharacters.findIndex(c => c.name === currentChar.name);
      if (currentIndex !== -1) {
        uniqueCharacters.splice(currentIndex, 1);
      }
    }

    if (uniqueCharacters.length === 0) {
      window.modalManager.showAlert({
        title: '선택 가능한 캐릭터 없음',
        message: '제약 조건을 만족하는 캐릭터가 없습니다.'
      });
      return;
    }

    // 캐릭터 선택 모달 생성
    showRaidCharacterSelectorModal(uniqueCharacters, partyId, slotIndex);

  } catch (error) {
    console.error('❌ [RAID CHARACTER SELECTOR ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 선택 모달을 여는 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 공격대 캐릭터 선택 모달 표시
function showRaidCharacterSelectorModal(characters, partyId, slotIndex) {
  const modalHtml = `
    <div class="modal fade" id="raidCharacterSelectorModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">캐릭터 선택</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- 검색 기능 추가 -->
            <div class="mb-3">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control" id="characterSearchInput" placeholder="캐릭터 이름으로 검색..." onkeyup="filterCharacterList()">
                <button class="btn btn-outline-secondary" type="button" onclick="clearCharacterSearch()">초기화</button>
              </div>
            </div>
            
            <!-- 캐릭터 목록 -->
            <div id="characterListContainer" class="row">
              ${characters.map(char => `
                <div class="col-md-6 mb-3 character-item" data-character-name="${char.name.toLowerCase()}">
                  <div class="card h-100 cursor-pointer" onclick="selectRaidCharacter('${partyId}', ${slotIndex}, '${char.name}')" style="cursor: pointer;">
                    <div class="card-body">
                      <div class="d-flex align-items-center">
                        <img src="${char.image || 'img/default-character.png'}" alt="${char.name}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 15px;">
                        <div class="flex-grow-1">
                          <h6 class="card-title mb-1">${char.name}</h6>
                          <p class="card-text mb-1">
                            <small class="text-muted">Lv ${char.ilvl || '0'} | CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</small>
                          </p>
                          <span class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}">${char.role === 'support' ? '서폿' : '딜러'}</span>
                          <span class="badge bg-secondary">${char.className || '알 수 없음'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- 검색 결과 없음 메시지 -->
            <div id="noSearchResults" class="text-center py-4" style="display: none;">
              <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
              <p class="text-muted mt-2">검색 결과가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('raidCharacterSelectorModal');
  if (existingModal) {
    existingModal.remove();
  }

  // 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 모달 열기
  const modal = new bootstrap.Modal(document.getElementById('raidCharacterSelectorModal'));
  
  // 검색 입력창에 포커스
  setTimeout(() => {
    document.getElementById('characterSearchInput')?.focus();
  }, 500);

  modal.show();

  // 모달 닫힐 때 슬롯 락 해제
  const modalEl = document.getElementById('raidCharacterSelectorModal');
  if (window.realtimeSync && window.realtimeSync.isSyncActive && window.realtimeSync.isSyncActive()) {
    const slotLockKey = `raidSlot:${state.selectedRaid.id}:${state.selectedDifficulty.id}:${partyId}:${slotIndex}`;
    modalEl.addEventListener('hidden.bs.modal', async () => {
      try {
        await window.realtimeSync.releaseSlotLock(slotLockKey);
      } catch (_) {}
    }, { once: true });
  }

  modal.show();
}

// 캐릭터 검색 필터링
function filterCharacterList() {
  const searchInput = document.getElementById('characterSearchInput');
  const searchTerm = searchInput.value.toLowerCase().trim();
  const characterItems = document.querySelectorAll('.character-item');
  const noResults = document.getElementById('noSearchResults');
  const container = document.getElementById('characterListContainer');
  
  let visibleCount = 0;
  
  characterItems.forEach(item => {
    const characterName = item.dataset.characterName;
    if (characterName.includes(searchTerm)) {
      item.style.display = 'block';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // 검색 결과 없음 메시지 표시/숨김
  if (visibleCount === 0 && searchTerm !== '') {
    noResults.style.display = 'block';
    container.style.display = 'none';
  } else {
    noResults.style.display = 'none';
    container.style.display = 'flex';
  }
}

// 캐릭터 검색 초기화
function clearCharacterSearch() {
  const searchInput = document.getElementById('characterSearchInput');
  searchInput.value = '';
  filterCharacterList();
}

// 공격대 캐릭터 선택 처리
async function selectRaidCharacter(partyId, slotIndex, characterName) {
  try {
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    if (!party) return;

    // 원정대에서 캐릭터 상세 정보 가져오기
    const charDetails = getCharacterDetailsFromExpedition(characterName);
    if (!charDetails) {
      window.modalManager.showAlert({
        title: '오류',
        message: '캐릭터 정보를 찾을 수 없습니다.'
      });
      return;
    }

    // 제약 조건 최종 확인
    const partyValidation = Constraints.canAddCharacterToParty(party, charDetails);
    if (!partyValidation.valid) {
      window.modalManager.showAlert({
        title: '제약 조건 위반',
        message: partyValidation.message
      });
      return;
    }

    // 공격대에 캐릭터 이름만 저장
    party.members[slotIndex] = { name: characterName };

    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('raidCharacterSelectorModal'));
    modal.hide();

    // UI 업데이트
    renderRaidParties();
    renderExpedition();

    // 자동 저장
    scheduleAutoSave();

    window.modalManager.showAlert({
      title: '캐릭터 배정 완료',
      message: `${characterName} 캐릭터가 공격대에 배정되었습니다.`
    });

  } catch (error) {
    console.error('❌ [SELECT RAID CHARACTER ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 배정 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 조회 결과 표시
function displaySearchResults(characters, successCount, failCount, failedNames) {
  // 프로그레스 모달 닫기
  const progressModals = document.querySelectorAll('#progressModal');
  progressModals.forEach(modal => {
    const modalInstance = bootstrap.Modal.getInstance(modal);
    if (modalInstance) {
      modalInstance.hide();
    }
  });
  
  // 프로그레스 표시 숨기기
  document.getElementById('searchProgress').style.display = 'none';
  
  if (characters.length === 0) {
    // 조회된 캐릭터가 없는 경우
    let errorMessage = '조회된 캐릭터가 없습니다.';
    if (failCount > 0) {
      errorMessage += `\n\n조회 실패: ${failedNames.join(', ')}`;
    }
    
    window.modalManager.showAlert({
      title: '조회 결과 없음',
      message: errorMessage
    });
    return;
  }
  
  // 캐릭터들을 평탄화하여 현재 슬롯에 설정
  const flattenedCharacters = characters.map(char => ({
    id: char.id,
    name: char.name,
    ilvl: char.ilvl || '0',
    combatPower: char.combatPower || '0',
    role: char.role,
    image: char.image || 'img/default-character.png',
    className: char.className,
    level: char.level
  }));
  
  // 현재 슬롯을 조회된 캐릭터들로 교체
  state.expeditionSlots[currentTargetSlot] = flattenedCharacters;
  
  // UI 업데이트
  renderExpedition();
  
  // 결과 메시지
  let message = `${characters.length}명의 원정대가 슬롯 ${currentTargetSlot + 1}에 설정되었습니다.`;
  if (failCount > 0) {
    message += `\n\n조회 실패: ${failedNames.join(', ')}`;
  }
  
  window.modalManager.showAlert({
    title: '원정대 설정 완료',
    message: message
  });
  
  // 모달 닫기
  const modal = bootstrap.Modal.getInstance(document.getElementById('characterSearchModal'));
  modal.hide();

  // 자동 저장/동기화
  scheduleAutoSave();
}
