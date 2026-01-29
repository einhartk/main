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

// 실시간 동기화 세션 생성
function createSyncSession() {
  if (window.realtimeSync) {
    window.realtimeSync.createSession();
  }
}

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
    
    // 기존 파티 초기화
    const raidId = state.selectedRaid.id;
    const difficultyId = state.selectedDifficulty.id;
    if (!state.raidTabs[raidId]) state.raidTabs[raidId] = {};
    state.raidTabs[raidId][difficultyId] = [];
    
    // 레드 크기에 따라 파티 자동 생성
    const raidSize = raid.size || 4;
    const partyCount = raidSize === 8 ? 2 : 1;
    
    for (let i = 0; i < partyCount; i++) {
      addRaidParty();
    }
    
    applyRecommendedRequirements();
    renderRaidTabs();
    renderRaidParties();
    
    // 저장
    autoSaveToDatabase();
  }
}

// 난이도 선택
function selectDifficulty(difficultyId) {
  if (!state.selectedRaid) return;
  const difficulty = state.selectedRaid.difficulties.find(d => d.id === difficultyId);
  if (difficulty) {
    state.selectedDifficulty = difficulty;
    applyRecommendedRequirements();
    renderRaidTabs();
    renderRaidParties();
    
    // 저장
    autoSaveToDatabase();
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
  
  return state.raidTabs[raidId][difficultyId];
}

// 공격대 파티 추가
function addRaidParty() {
  if (!state.selectedRaid || !state.selectedDifficulty) {
    window.modalManager.showAlert({
      title: '알림',
      message: '먼저 레이드와 난이도를 선택해주세요.'
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
  
  const newParty = {
    id: partyId,
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
  
  // 저장
  autoSaveToDatabase();
}

// 레이드 탭 렌더링
function renderRaidTabs() {
  const container = document.getElementById('raidTabs');
  if (!container) return;
  
  let tabsHtml = '<ul class="nav nav-tabs mb-3" id="raidTabsList" role="tablist">';
  
  state.raidsData.forEach((raid) => {
    const isActive = state.selectedRaid?.id === raid.id;
    tabsHtml += `
      <li class="nav-item" role="presentation">
        <button class="nav-link ${isActive ? 'active' : ''}" 
                id="raid-tab-${raid.id}" 
                data-bs-toggle="tab" 
                data-bs-target="#raid-${raid.id}" 
                type="button" 
                role="tab"
                onclick="selectRaid('${raid.id}')">
          ${raid.name}
        </button>
      </li>
    `;
  });
  
  tabsHtml += '</ul>';
  
  if (state.selectedRaid) {
    tabsHtml += '<ul class="nav nav-pills mb-3" id="difficultyTabsList" role="tablist">';
    
    state.selectedRaid.difficulties.forEach((difficulty) => {
      const isActive = state.selectedDifficulty?.id === difficulty.id;
      tabsHtml += `
        <li class="nav-item" role="presentation">
          <button class="nav-link ${isActive ? 'active' : ''}" 
                  id="diff-tab-${difficulty.id}" 
                  data-bs-toggle="pill" 
                  type="button" 
                  role="tab"
                  onclick="selectDifficulty('${difficulty.id}')">
            ${difficulty.name} (Lv${difficulty.minIlvl})
          </button>
        </li>
      `;
    });
    
    tabsHtml += '</ul>';
  }
  
  container.innerHTML = tabsHtml;
}

// 공격대 파티 렌더링
function renderRaidParties() {
  const container = document.getElementById('raidParties');
  if (!container) return;
  
  container.innerHTML = '';
  
  const parties = getCurrentTabParties();
  
  parties.forEach((party) => {
    const partyDiv = document.createElement('div');
    partyDiv.className = 'col-md-6';
    
    const validMembers = party.members.filter(m => m !== null);
    const avgCombatPower = validMembers.length > 0 
      ? Math.round(validMembers.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembers.length)
      : 0;
    
    const supportCount = party.members.filter(m => m?.role === 'support').length;
    const supportBadge = supportCount > party.maxSupports ? 'bg-danger' : 'bg-secondary';
    
    partyDiv.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #2c3e50; border-bottom: 1px solid #dee2e6; padding: 15px;">
          <div class="row align-items-center mb-3">
            <div class="col-md-10">
              <div class="d-flex align-items-center gap-3">
                <div class="input-group" style="width: 350px; font-size: 0.85rem;">
                  <span class="input-group-text" style="background: white; color: #2c3e50; border: 1px solid #ced4da; font-size: 0.85rem;">
                    <i class="bi bi-people-fill"></i>
                  </span>
                  <input type="text" class="form-control" id="partyName-${party.id}" 
                         value="${party.name || `${party.raidName} ${party.difficultyName} ${party.id}`}" 
                         placeholder="공대 이름" 
                         style="font-size: 0.9rem;"
                         onchange="updatePartyName('${party.id}', this.value)">
                  <button class="btn btn-outline-secondary" type="button" onclick="this.previousElementSibling.focus()" style="font-size: 0.85rem;">
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="col-md-2">
              <div class="d-flex align-items-center justify-content-end">
                <button class="btn btn-sm btn-outline-danger" onclick="removeRaidParty('${party.id}')" style="padding: 6px 10px; font-size: 0.85rem;">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div class="row align-items-center">
            <div class="col-md-4">
              <div class="d-flex align-items-center gap-3">
                <span class="badge" style="background: #6c757d; color: white; font-size: 0.8rem; padding: 5px 10px;">
                  <i class="bi bi-lightning-fill me-1"></i>평균 CP ${avgCombatPower.toLocaleString()}
                </span>
              </div>
            </div>
            <div class="col-md-4">
              <div class="d-flex align-items-center justify-content-center">
                <span id="support-${party.id}" class="badge ${supportBadge === 'bg-success' ? 'bg-success' : 'bg-warning'} text-white" style="font-size: 0.8rem; padding: 5px 10px;">
                  <i class="bi bi-shield-fill me-1"></i>서폿 ${supportCount}/${party.maxSupports}
                </span>
              </div>
            </div>
            <div class="col-md-4">
              <div class="d-flex align-items-center justify-content-end gap-2">
                <div class="btn-group btn-group-sm" role="group">
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="setPartySize('${party.id}', 4)">
                  <label class="btn ${party.size === 4 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size4-${party.id}" style="font-size: 0.8rem;">
                    4인
                  </label>
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="setPartySize('${party.id}', 8)">
                  <label class="btn ${party.size === 8 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size8-${party.id}" style="font-size: 0.8rem;">
                    8인
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-12">
              <div class="d-flex flex-column gap-2">
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">최소 레벨</span>
                  <input type="number" class="form-control" id="minIlvl-${party.id}" 
                         value="${party.minIlvl || 0}" 
                         placeholder="0" 
                         min="0" 
                         style="width: 80px;"
                         onchange="updatePartyRequirements('${party.id}', 'minIlvl', this.value)">
                  <span class="input-group-text">Lv</span>
                </div>
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">최소 전투력</span>
                  <input type="number" class="form-control" id="minCombatPower-${party.id}" 
                         value="${party.minCombatPower || 0}" 
                         placeholder="0" 
                         min="0" 
                         style="width: 100px;"
                         onchange="updatePartyRequirements('${party.id}', 'minCombatPower', this.value)">
                  <span class="input-group-text">CP</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="raid-slots-grid ${party.size === 8 ? 'raid-slots-grid-8' : ''}">
            ${party.members.map((char, slotIndex) => {
              const partyNumber = party.size === 8 ? Math.floor(slotIndex / 4) + 1 : 1;
              const isFirstInParty = slotIndex % 4 === 0;
              return `
              <div class="raid-slot-wrapper" data-party="${party.id}" data-slot="${slotIndex}">
                ${isFirstInParty && party.size === 8 ? `<div class="party-label">파티 ${partyNumber}</div>` : ''}
                <div class="raid-slot" ondrop="handleDrop(event, '${party.id}', ${slotIndex})" ondragover="handleDragOver" ondragleave="handleDragLeave">
                  ${char ? `
                    <div class="char-box ${char.role} ${!meetsRequirements(char, party) ? 'requirement-failed' : ''}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', '${party.id}', ${slotIndex})" ondragend="handleDragEnd(event)" ondblclick="event.stopPropagation(); confirmRemoveCharacter('${char.id}', '${party.id}', ${slotIndex})" onclick="event.stopPropagation(); editCharacter('${char.id}', '${party.id}', ${slotIndex})" style="cursor: pointer;" title="클릭하여 수정, 더블클릭하여 삭제">
                      <img src="${char.image || 'img/default-character.png'}" alt="${char.name}" style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;">
                      <div class="fw-bold small">${char.name}</div>
                      <div class="small text-muted">Lv ${char.ilvl || '0'}</div>
                      <div class="small text-muted">CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                      <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1" style="font-size: 0.7rem;">${char.role === 'support' ? '서폿' : '딜러'} (${char.className || '알 수 없음'})</div>
                      ${!meetsRequirements(char, party) ? '<div class="badge bg-danger mt-1" style="font-size: 0.65rem;">조건미달</div>' : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(partyDiv);
  });
  
  updateSupportCount();
  setupRaidEventListeners();
}

// 드래그 앤 드롭 이벤트 설정
function setupRaidEventListeners() {
  // 드래그 앤 드롭 이벤트 리스너 설정
  document.addEventListener('dragover', handleDragOver);
  document.addEventListener('drop', handleDrop);
  
  // 드래그 리프 이벤트 방지
  document.addEventListener('dragleave', handleDragLeave);
}

// 드래그 리프 이벤트 핸들러
function handleDragLeave(event) {
  event.currentTarget.classList.remove('dragover');
}

// 드래그 앤 드롭 핸들러
let draggedData = null;

function handleDragStart(event, charId, fromRaid, partyId, slotIndex, expeditionIndex, expeditionSlotIndex) {
  draggedData = {
    charId,
    fromRaid,
    partyId,
    slotIndex,
    expeditionIndex,
    expeditionSlotIndex
  };
  
  // 캐릭터 데이터 찾기
  let character = null;
  
  if (fromRaid) {
    // 공격대에서 온 캐릭터
    const parties = getCurrentTabParties();
    const party = parties.find(p => p.id === partyId);
    character = party?.members[slotIndex];
  } else {
    // 원정대에서 온 캐릭터
    character = state.expeditionSlots[expeditionIndex][expeditionSlotIndex];
  }
  
  if (character) {
    event.dataTransfer.setData('text/plain', JSON.stringify(character));
    event.target.classList.add('dragging');
  }
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
  draggedData = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add('dragover');
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    console.log(`📊 [RAID DROP] Received:`, { name: data.name, id: data.id });
    
    // 원정대에서 온 캐릭터인 경우 공격대에 추가
    if (!draggedData || !draggedData.fromRaid) {
      const parties = getCurrentTabParties();
      
      // 모든 파티의 빈 슬롯 찾기
      let added = false;
      for (const party of parties) {
        const emptyIndex = party.members.findIndex(m => m === null);
        if (emptyIndex !== -1) {
          // 파티별 제약 조건 확인
          const partyValidation = Constraints.canAddCharacterToParty(party, data);
          if (!partyValidation.valid) {
            window.modalManager.showAlert({
              title: '제약 조건 위반',
              message: partyValidation.message
            });
            continue;
          }
          
          party.members[emptyIndex] = data;
          renderRaidParties();
          renderExpedition();
          added = true;
          
          // 자동 저장
          autoSaveToDatabase();
          
          window.modalManager.showAlert({
            title: '캐릭터 추가 완료',
            message: `${data.name} 캐릭터가 공격대에 추가되었습니다.`
          });
          break;
        }
      }
      
      if (!added) {
        window.modalManager.showAlert({
          title: '배치 실패',
          message: '조건을 만족하는 빈 슬롯을 찾지 못했습니다. (슬롯이 가득 찼거나 제약 조건/요구사항 위반)'
        });
      }
    }
    
    // 실시간 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      window.realtimeSync.syncToFirebase();
    }
  } catch (error) {
    console.error('❌ [RAID DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '캐릭터 추가 오류',
      message: '캐릭터를 추가하는 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 원정대에서 공격대로 드래 앤 드롭 핸들러
function handleExpeditionDrop(event, expeditionIndex) {
  event.preventDefault();
  event.currentTarget.classList.remove('dragover');
  
  try {
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
        autoSaveToDatabase();
        
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
    
    // 실시간 동기화
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      window.realtimeSync.syncToFirebase();
    }
  } catch (error) {
    console.error('❌ [EXPEDITION DROP ERROR]:', error);
    window.modalManager.showAlert({
      title: '캐릭터 이동 오류',
      message: '캐릭터를 이동하는 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 서포터 수 업데이트
function updateSupportCount() {
  const parties = getCurrentTabParties();
  parties.forEach(party => {
    const count = party.members.filter(m => m?.role === "support").length;
    const badge = document.getElementById(`support-${party.id}`);
    if (badge) {
      badge.innerText = `서폿 ${count}/${party.maxSupports}`;
      badge.className = `badge ms-2 ${count > party.maxSupports ? 'bg-danger' : 'bg-secondary'}`;
    }
  });
}

// 파티 이름 업데이트
function updatePartyName(partyId, newName) {
  if (!state.selectedRaid || !state.selectedDifficulty) return;
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    party.name = newName.trim() || `${state.selectedRaid.name} ${state.selectedDifficulty.name} ${partyId}`;
    renderRaidParties();
  }
}

// 파티 요구사항 업데이트
function updatePartyRequirements(partyId, requirementType, value) {
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  if (party) {
    party[requirementType] = parseInt(value) || 0;
    renderRaidParties();
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
}

async function setPartySize(partyId, size) {
  // 충돌 감지
  if (!window.realtimeSync || !window.realtimeSync.isSyncActive()) {
    // 일반 모드에서는 바로 실행
    updatePartySize(partyId, size);
    // 저장
    autoSaveToDatabase();
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
    autoSaveToDatabase();
    
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
    autoSaveToDatabase();
    
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

// 원정대 렌더링
function renderExpedition() {
  const container = document.getElementById('expedition');
  if (!container) return;
  
  console.log('🔄 [EXPEDITION] Rendering expedition, slots:', state.expeditionSlots.length);
  
  container.innerHTML = '';
  
  state.expeditionSlots.forEach((slot, index) => {
    console.log(`🔄 [EXPEDITION] Rendering slot ${index}:`, slot.length, 'characters');
    
    const slotDiv = document.createElement('div');
    slotDiv.className = 'col-md-3';
    
    const slotClass = slot.length > 0 ? 'expedition-slot-filled' : 'expedition-slot-empty';
    
    slotDiv.innerHTML = `
      <div class="expedition-slot ${slotClass}" onclick="openCharacterSearchModal(${index})" ondrop="handleExpeditionDrop(event, ${index})" ondragover="handleDragOver" ondragleave="handleDragLeave" style="cursor: pointer;">
        <h6 class="text-center mb-2">
          슬롯 ${index + 1} 
          ${slot.length > 0 ? `<small class="text-success">(${slot.length}명)</small>` : '<small class="text-muted">(클릭하여 원정대 추가, 드래하여 공격대로 이동)</small>'}
        </h6>
        <div class="expedition-slots">
          ${slot.length > 0 ? slot.map((char, charIndex) => `
            <div class="expedition-char ${char.role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" onclick="event.stopPropagation(); editCharacter(${index}, ${charIndex})" style="cursor: pointer;" title="클릭하여 수정, 드래하여 공격대로 이동">
              <img src="${char.image || 'img/default-character.png'}" alt="${char.name}" style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 2px; display: block;">
              <div class="flex-grow-1" style="font-size: 0.7rem;">
                <div class="fw-bold">${char.name}</div>
                <div class="small text-muted">Lv ${char.ilvl || '0'}</div>
                <div class="small text-info">CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}" style="font-size: 0.5rem;">${char.role === 'support' ? '서폿' : '딜러'} (${char.className || '알 수 없음'})</div>
              </div>
              <div class="badge bg-secondary" style="font-size: 0.45rem; position: absolute; bottom: 4px; right: 4px; z-index: 10;">${Constraints.getCharacterUsageCount(char.name)}/3</div>
            </div>
          `).join('') : '<div class="text-muted text-center p-3">빈 슬롯</div>'}
        </div>
      </div>
    `;
    
    container.appendChild(slotDiv);
  });
  
  console.log('🔄 [EXPEDITION] Expedition rendering completed');
}

// 캐릭터 삭제 확인 함수
function confirmRemoveCharacter(characterId, partyId, slotIndex) {
  // 캐릭터 정보 찾기
  const parties = getCurrentTabParties();
  const party = parties.find(p => p.id === partyId);
  
  if (!party || !party.members[slotIndex]) return;
  
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
      autoSaveToDatabase();
      
      // 실시간 동기화
      if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
        window.realtimeSync.syncToFirebase();
      }
      
      window.modalManager.showAlert({
        title: '삭제 완료',
        message: `${characterName} 캐릭터가 공격대에서 삭제되었습니다.`
      });
    }
  });
}

// 캐릭터 조회 모달 열기
let currentTargetSlot = null;

function openCharacterSearchModal(slotIndex) {
  currentTargetSlot = slotIndex;
  
  // 모달에 현재 슬롯 정보 표시
  document.getElementById('targetSlotInfo').value = `슬롯 ${slotIndex + 1}`;
  document.getElementById('searchCharacterName').value = '';
  document.getElementById('searchProgress').style.display = 'none';
  
  // 모달 열기
  const modal = new bootstrap.Modal(document.getElementById('characterSearchModal'));
  modal.show();
  
  // 입력 필드에 포커스
  setTimeout(() => {
    document.getElementById('searchCharacterName').focus();
  }, 200);
}

// 제약 조건 유효성 검사 함수들
const Constraints = {
  // 캐릭터 중복 확인 (최대 3개까지 허용)
  isCharacterDuplicate: function(characterName, parties = null) {
    const targetParties = parties || getCurrentTabParties();
    let count = 0;
    targetParties.forEach(party => {
      party.members.forEach(member => {
        if (member && member.name === characterName) {
          count++;
        }
      });
    });
    return count >= 3; // 3개 이상이면 중복으로 간주
  },

  // 캐릭터 사용 횟수 확인
  getCharacterUsageCount: function(characterName, parties = null) {
    const targetParties = parties || getCurrentTabParties();
    let count = 0;
    targetParties.forEach(party => {
      party.members.forEach(member => {
        if (member && member.name === characterName) {
          count++;
        }
      });
    });
    return count;
  },

  // 1공격대 = 1원정대 제약 확인 (원정대 슬롯당 1캐릭터)
  exceedsOneRaidOneExpedition: function() {
    const usedCharacters = {};
    
    // 현재 공격대의 모든 파티 확인
    getCurrentTabParties().forEach(party => {
      party.members.forEach(member => {
        if (member) {
          // 각 캐릭터가 어느 원정대 슬롯에서 왔는지 확인
          state.expeditionSlots.forEach((slot, slotIndex) => {
            if (slot.some(char => char && char.name === member.name)) {
              if (!usedCharacters[slotIndex]) {
                usedCharacters[slotIndex] = [];
              }
              usedCharacters[slotIndex].push(member.name);
            }
          });
        }
      });
    });
    
    // 각 원정대 슬롯에서 1캐릭터 초과 확인
    for (const slotIndex in usedCharacters) {
      if (usedCharacters[slotIndex].length > 1) {
        return true; // 위반
      }
    }
    
    return false; // 정상
  },

  getExpeditionSlotIndexByCharacterName: function(characterName) {
    for (let slotIndex = 0; slotIndex < state.expeditionSlots.length; slotIndex++) {
      const slot = state.expeditionSlots[slotIndex];
      if (slot && slot.some(c => c && c.name === characterName)) {
        return slotIndex;
      }
    }
    return null;
  },

  // 원정대 슬롯당 1캐릭 제약: "공격대(=party.id)" 단위로만 적용
  exceedsOneRaidOneExpeditionForCharacter: function(characterName, party) {
    const slotIndex = this.getExpeditionSlotIndexByCharacterName(characterName);
    if (slotIndex === null) return false;
    if (!party) return false;

    let usedCount = 0;
    party.members.forEach(member => {
      if (!member) return;
      const memberSlotIndex = this.getExpeditionSlotIndexByCharacterName(member.name);
      if (memberSlotIndex === slotIndex) usedCount++;
    });

    return usedCount >= 1;
  },

  // 같은 레이드 탭, 같은 캐릭터명 제약 확인
  exceedsSameRaidSameCharacter: function(characterName, currentRaidId = null) {
    if (!currentRaidId) currentRaidId = state.selectedRaid?.id;
    if (!currentRaidId) return false;
    
    let count = 0;
    
    // 현재 레이드 탭의 모든 난이도에서 확인
    Object.keys(state.raidTabs).forEach(raidId => {
      if (raidId === currentRaidId) {
        Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
          const parties = state.raidTabs[raidId][difficultyId] || [];
          parties.forEach(party => {
            party.members.forEach(member => {
              if (member && member.name === characterName) {
                count++;
              }
            });
          });
        });
      }
    });
    
    return count >= 1; // 같은 레이드 탭에서는 1곳만 허용
  },

  // 캐릭터 배치 가능 여부 확인
  canAddCharacterToParty: function(party, character) {
    // 중복 확인 (최대 3개)
    const currentCount = this.getCharacterUsageCount(character.name);
    if (currentCount >= 3) {
      return { valid: false, reason: 'duplicate_limit', message: `${character.name} 캐릭터는 최대 3개의 공격대에만 배치할 수 있습니다. (현재: ${currentCount}/3)` };
    }
    
    // 같은 레이드, 같은 캐릭터명 확인
    if (this.exceedsSameRaidSameCharacter(character.name)) {
      return { valid: false, reason: 'same_raid_same_character', message: `${character.name} 캐릭터는 ${state.selectedRaid?.name || '이 레이드'}에서 1곳에만 배치할 수 있습니다.` };
    }
    
    // 원정대 슬롯당 1캐릭터 (공격대=party 단위)
    if (this.exceedsOneRaidOneExpeditionForCharacter(character.name, party)) {
      return { valid: false, reason: 'one_raid_one_expedition', message: '1원정대 슬롯당 1캐릭터만 사용할 수 있습니다.' };
    }
    
    // 아이템 레벨 제한 확인
    const characterIlvl = parseCompareNumber(character.ilvl || '0');
    const requiredIlvl = party.minIlvl || 0;
    if (characterIlvl < requiredIlvl) {
      return { valid: false, reason: 'ilvl_requirement', message: `${character.name} 캐릭터의 아이템 레벨(${characterIlvl})이 부족합니다. 필요 레벨: ${requiredIlvl} 이상` };
    }
    
    // 전투력 제한 확인
    const characterCp = parseCompareNumber(character.combatPower || '0');
    const requiredCp = party.minCombatPower || 0;
    if (characterCp < requiredCp) {
      return { valid: false, reason: 'cp_requirement', message: `${character.name} 캐릭터의 전투력(${characterCp.toLocaleString()})이 부족합니다. 필요 전투력: ${requiredCp.toLocaleString()} 이상` };
    }
    
    // 서폿 제한 확인
    if (this.exceedsSupportLimit(party, character)) {
      return { valid: false, reason: 'support_limit', message: `이 파티에는 서포터를 ${party.maxSupports}명만 배치할 수 있습니다.` };
    }
    
    return { valid: true };
  },

  // 서폿 제한 확인
  exceedsSupportLimit: function(party, newCharacter = null) {
    const currentSupports = party.members.filter(m => m?.role === 'support').length;
    const additionalSupport = newCharacter?.role === 'support' ? 1 : 0;
    return (currentSupports + additionalSupport) > party.maxSupports;
  },

  // 원정대당 1캐릭터 제한 확인
  exceedsExpeditionLimit: function() {
    const usedCharacters = new Set();
    let totalCharacters = 0;
    
    state.expeditionSlots.forEach(slot => {
      slot.forEach(char => {
        if (char) {
          totalCharacters++;
          usedCharacters.add(char.name);
        }
      });
    });
    
    return totalCharacters > 8; // 원정대 슬롯 수 초과
  },

  // 원정대 중복 캐릭터 확인
  hasDuplicateInExpedition: function() {
    const usedCharacters = new Set();
    const duplicates = [];
    
    state.expeditionSlots.forEach(slot => {
      slot.forEach(char => {
        if (char) {
          if (usedCharacters.has(char.name)) {
            duplicates.push(char.name);
          } else {
            usedCharacters.add(char.name);
          }
        }
      });
    });
    
    return duplicates;
  },

  // 파티 크기에 따른 서폿 제한 확인 (항상 1서폿)
  getSupportLimit: function(partySize) {
    return 1; // 파티당 항상 1서폿만 가능
  },

  // 모든 파티의 캐릭터 중복 확인
  getDuplicateCharacters: function() {
    const characterCounts = {};
    const duplicates = [];
    
    getCurrentTabParties().forEach(party => {
      party.members.forEach(member => {
        if (member) {
          characterCounts[member.name] = (characterCounts[member.name] || 0) + 1;
          if (characterCounts[member.name] > 3) {
            if (!duplicates.includes(member.name)) {
              duplicates.push(member.name);
            }
          }
        }
      });
    });
    
    return duplicates;
  },

  // 원정대에서 사용 가능한 캐릭터 목록 (모든 제약 조건 적용)
  getAvailableCharacters: function() {
    const usedCharacters = {};
    const availableCharacters = [];
    const currentRaidId = state.selectedRaid?.id;
    
    // 현재 공격대에서 사용 중인 캐릭터 횟수 확인 (현재 공격대만)
    if (currentRaidId) {
      Object.keys(state.raidTabs).forEach(raidId => {
        if (raidId === currentRaidId) {
          Object.keys(state.raidTabs[raidId]).forEach(difficultyId => {
            const parties = state.raidTabs[raidId][difficultyId] || [];
            parties.forEach(party => {
              party.members.forEach(member => {
                if (member) {
                  usedCharacters[member.name] = (usedCharacters[member.name] || 0) + 1;
                }
              });
            });
          });
        }
      });
    }
    
    // 원정대에서 제약 조건에 맞는 캐릭터 수집
    state.expeditionSlots.forEach((slot, slotIndex) => {
      slot.forEach(char => {
        if (char) {
          // 3개 제한 확인 (전체 공격대)
          if (this.getCharacterUsageCount(char.name) >= 3) return;
          
          // 같은 레이드 탭, 같은 캐릭터명 제한 확인
          if (this.exceedsSameRaidSameCharacter(char.name, currentRaidId)) return;
          
          // 아이템 레벨과 전투력 필터링 (모든 파티의 최소 요구사항 확인)
          let meetsRequirements = false;
          const currentTabParties = getCurrentTabParties();
          
          for (const party of currentTabParties) {
            const characterIlvl = parseCompareNumber(char.ilvl || '0');
            const requiredIlvl = party.minIlvl || 0;
            const characterCp = parseCompareNumber(char.combatPower || '0');
            const requiredCp = party.minCombatPower || 0;
            
            if (characterIlvl >= requiredIlvl && characterCp >= requiredCp) {
              meetsRequirements = true;
              break;
            }
          }
          
          if (!meetsRequirements) return;
          
          availableCharacters.push(char);
          usedCharacters[char.name] = (usedCharacters[char.name] || 0) + 1; // 중복 방지를 위해 카운트 증가
        }
      });
    });
    
    return availableCharacters;
  },

  // 제약 조건 위반 메시지 생성
  getViolationMessage: function(violation, characterName = '', partyName = '') {
    const messages = {
      duplicate_limit: `${characterName} 캐릭터는 최대 3개의 공격대에만 배치할 수 있습니다.`,
      same_raid_same_character: `${characterName} 캐릭터는 ${state.selectedRaid?.name || '이 레이드'}에서 1곳에만 배치할 수 있습니다.`,
      one_raid_one_expedition: '1원정대 슬롯당 1캐릭터만 사용할 수 있습니다.',
      ilvl_requirement: `${characterName} 캐릭터의 아이템 레벨이 부족합니다.`,
      cp_requirement: `${characterName} 캐릭터의 전투력이 부족합니다.`,
      duplicate: `${characterName} 캐릭터는 이미 배치되어 있습니다.`,
      support_limit: `${partyName} 파티의 서포터 제한을 초과했습니다.`,
      expedition_limit: '원정대당 1캐릭터만 사용할 수 있습니다.'
    };
    
    return messages[violation] || '제약 조건을 위반했습니다.';
  }
};

// 제약 조건 적용 헬퍼 함수
function applyConstraints(character, party, operation = 'add') {
  // 파티가 없는 경우
  if (!party) {
    return { valid: false, reason: 'no_party', message: '파티가 존재하지 않습니다.' };
  }

  // 모든 제약/요구사항은 canAddCharacterToParty로 단일화
  return Constraints.canAddCharacterToParty(party, character);
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
  const supportClasses = ['바드', '도화가', '홀리나이트'];
  
  // 클래스명으로 확인
  if (supportClasses.some(support => className.includes(support))) {
    return 'support';
  }
  
  // 아크패시브 정보로 확인 (있는 경우)
  if (arkpassive && arkpassive.Effects) {
    const hasSupportSkill = arkpassive.Effects.some(effect => 
      effect.Name && (effect.Name.includes('버프') || effect.Name.includes('데미지 증가'))
    );
    if (hasSupportSkill) {
      return 'support';
    }
  }
  
  return 'dps';
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
  
  // 실시간 동기화
  if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
    window.realtimeSync.syncToFirebase();
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
    
    // 모달 열기
    const modal = new bootstrap.Modal(document.getElementById('characterEditModal'));
    modal.show();
    
  } catch (error) {
    console.error('❌ [CHARACTER EDIT ERROR]:', error);
    window.modalManager.showAlert({
      title: '오류',
      message: '캐릭터 정보 수정 중 오류가 발생했습니다: ' + error.message
    });
  }
}

// 캐릭터 데이터 업데이트 함수
async function updateCharacterData(character, location) {
  // 수정 모달에 정보 표시
  document.getElementById('editName').value = character.name;
  document.getElementById('editCombatPower').value = character.combatPower || '0';
  document.getElementById('originalCombatPower').textContent = character.combatPower || '0';
  
  // 역할 라디오 버튼 설정
  const roleRadio = document.querySelector(`input[name="editRole"][value="${character.role}"]`);
  if (roleRadio) roleRadio.checked = true;
  
  // 저장 함수에 현재 위치 정보 저장
  window.currentEditPosition = location;
  
  // 모달 열기
  const modal = new bootstrap.Modal(document.getElementById('characterEditModal'));
  modal.show();
  
  // 모달이 닫힐 때 데이터 저장
  modal.addEventListener('hidden.bs.modal', async () => {
    try {
      // 실제 데이터 업데이트
      character.combatPower = document.getElementById('editCombatPower').value || '0';
      character.role = document.querySelector('input[name="editRole"]:checked').value;
      
      // UI 업데이트
      if (location.type === 'raid') {
        renderRaidParties();
      } else {
        renderExpedition();
      }
      
      // 저장
      autoSaveToDatabase();
      
      // 실시간 동기화
      if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
        await window.realtimeSync.syncToFirebase();
      }
      
      window.modalManager.showAlert({
        title: '수정 완료',
        message: `${character.name} 캐릭터 정보가 수정되었습니다.`
      });
      
    } catch (error) {
      console.error('❌ [CHARACTER SAVE ERROR]:', error);
      window.modalManager.showAlert({
        title: '오류',
        message: '캐릭터 정보 저장 중 오류가 발생했습니다: ' + error.message
      });
    }
  });
}

// 캐릭터 정보 저장
async function saveCharacterEdit() {
  // 중복 클릭 방지
  const saveButton = document.getElementById('saveCharacterButton');
  if (saveButton.disabled) {
    return;
  }
  
  if (!window.currentEditPosition) return;
  
  const { slotIndex, characterIndex } = window.currentEditPosition;
  const character = state.expeditionSlots[slotIndex][characterIndex];
  
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
    
    // 실시간 동기화 및 잠금 해제
    if (window.realtimeSync && window.realtimeSync.isSyncActive()) {
      await window.realtimeSync.syncToFirebase();
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
  const modal = new bootstrap.Modal(document.getElementById('expeditionModal'));
  modal.show();
}

function showRaidListModal() {
  const modal = new bootstrap.Modal(document.getElementById('raidListModal'));
  modal.show();
}

function shareRaidData() {
  const modal = new bootstrap.Modal(document.getElementById('shareRaidModal'));
  document.getElementById('shareId').value = '';
  modal.show();
}

function downloadRaidData() {
  const modal = new bootstrap.Modal(document.getElementById('downloadRaidModal'));
  document.getElementById('downloadId').value = '';
  modal.show();
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
          state.selectedDifficulty = raid.difficulties[0];
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

// 전체 초기화
function clearAllRaidsCompletely() {
  window.modalManager.showConfirm({
    title: '전체 초기화',
    message: '모든 공대 데이터를 초기화하시겠습니까?',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      state.raidTabs = {};
      state.selectedRaid = null;
      state.selectedDifficulty = null;
      renderRaidTabs();
      renderRaidParties();
    }
  });
}

// 자동 DB 저장 함수 - 실시간 동기화 전용 (Realtime Database)
async function autoSaveToDatabase() {
  try {
    // Realtime Database는 중첩 배열을 지원하지 않으므로 JSON 문자열로 직렬화
    const serializedRaidTabs = JSON.stringify(state.raidTabs);
    const serializedExpedition = JSON.stringify(state.expeditionSlots);
    
    const saveData = {
      rt: serializedRaidTabs, // raidTabs -> rt (JSON string)
      es: serializedExpedition, // expeditionSlots -> es (JSON string)
      sr: state.selectedRaid ? state.selectedRaid.id : null, // selectedRaid -> sr
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

// DB 저장 함수 (수동 저장)
async function saveRaidData() {
  try {
    await autoSaveToDatabase();
    
    window.modalManager.showAlert({
      title: '저장 완료',
      message: '모든 데이터가 Realtime Database에 저장되었습니다.\n실시간 동기화로 다른 사용자에게도 전파됩니다.'
    });
  } catch (error) {
    console.error('❌ [SAVE ERROR]:', error);
    window.modalManager.showAlert({
      title: '저장 오류',
      message: '데이터 저장 중 오류가 발생했습니다: ' + error.message
    });
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
    // 기존 멤버 초기화
    party.members = Array(party.size).fill(null);
    
    // 서폿 우선 배치 (파티당 최대 서폿 수)
    let supportCount = 0;
    
    // 서폿 배치 (제약 조건 확인)
    for (let i = 0; i < party.size && supportCount < party.maxSupports && supports.length > 0; i++) {
      // 유효한 캐릭터가 나올 때까지 스킵
      while (supports.length > 0) {
        const support = supports[0];
        const validation = Constraints.canAddCharacterToParty(party, support);
        if (!validation.valid) {
          supports.shift();
          continue;
        }
        party.members[i] = supports.shift();
        supportCount++;
        assignedCount++;
        break;
      }
    }
    
    // DPS 배치 (제약 조건 확인)
    for (let i = 0; i < party.size && dps.length > 0; i++) {
      if (!party.members[i]) {
        while (dps.length > 0) {
          const dp = dps[0];
          const validation = Constraints.canAddCharacterToParty(party, dp);
          if (!validation.valid) {
            dps.shift();
            continue;
          }
          party.members[i] = dps.shift();
          assignedCount++;
          break;
        }
      }
    }
  });

  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 저장
  autoSaveToDatabase();

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

  // 전체 슬롯 수 계산
  const totalSlots = parties.reduce((sum, party) => sum + party.size, 0);
  
  // 캐릭터를 전투력 순으로 정렬
  const sortedCharacters = allCharacters.sort((a, b) => {
    const cpA = parseCompareNumber(a.combatPower || '0');
    const cpB = parseCompareNumber(b.combatPower || '0');
    return cpB - cpA; // 내림차순 (높은 CP 우선)
  });

  // 역할별로 분리
  const supports = sortedCharacters.filter(char => char.role === 'support');
  const dps = sortedCharacters.filter(char => char.role === 'dps');

  // 각 파티에 균등하게 분배
  let assignedCount = 0;
  const totalParties = parties.length;
  
  // 서폿 균등 분배
  const supportsPerParty = Math.floor(supports.length / totalParties);
  const remainingSupports = supports.length % totalParties;
  
  let supportIndex = 0;
  parties.forEach((party, partyIndex) => {
    // 기존 멤버 초기화
    party.members = Array(party.size).fill(null);
    
    // 이 파티에 배치할 서폿 수
    const supportsForThisParty = supportsPerParty + (partyIndex < remainingSupports ? 1 : 0);
    
    // 서폿 균등하게 분배
    for (let i = 0; i < party.size && supportIndex < supports.length && i < supportsForThisParty; i++) {
      const character = supports[supportIndex];
      
      // 제약 조건 확인
      const validation = Constraints.canAddCharacterToParty(party, character);
      if (validation.valid) {
        party.members[i] = character;
        assignedCount++;
      } else {
        console.log(`⚠️ [BALANCED ASSIGN] 서폿 제약 조건 위반: ${character.name} - ${validation.message}`);
      }
      supportIndex++;
    }
  });

  // DPS 균등 분배
  const dpsPerParty = Math.floor(dps.length / totalParties);
  const remainingDps = dps.length % totalParties;
  
  let dpIndex = 0;
  parties.forEach((party, partyIndex) => {
    // 이 파티에 배치할 DPS 수
    const dpsForThisParty = dpsPerParty + (partyIndex < remainingDps ? 1 : 0);
    
    // DPS 균등하게 분배
    for (let i = 0; i < party.size && dpIndex < dps.length; i++) {
      if (!party.members[i]) {
        const character = dps[dpIndex];
        
        // 제약 조건 확인
        const validation = Constraints.canAddCharacterToParty(party, character);
        if (validation.valid) {
          party.members[i] = character;
          assignedCount++;
        } else {
          console.log(`⚠️ [BALANCED ASSIGN] DPS 제약 조건 위반: ${character.name} - ${validation.message}`);
        }
        dpIndex++;
      }
    }
  });

  // UI 업데이트
  renderRaidParties();
  renderExpedition();
  
  // 저장
  autoSaveToDatabase();

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
