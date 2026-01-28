const state = {
  expeditionSlots: Array.from({length:8}, () => []),
  raidParties: [], // 동적 공격대 파티 배열
  raidPartyCounter: 0 // 파티 ID 카운터
};

// 초기 공격대 파티 2개 생성
function initializeRaids() {
  addRaidParty(); // 첫 번째 파티
  addRaidParty(); // 두 번째 파티
}

// 공격대 파티 추가
function addRaidParty() {
  const partyId = String.fromCharCode(65 + state.raidPartyCounter); // A, B, C, ...
  state.raidPartyCounter++;
  
  const newParty = {
    id: partyId,
    name: `공대 ${partyId}`,
    members: Array(4).fill(null), // 기본 4인
    maxSupports: 1, // 4인당 1서폿
    size: 4, // 현재 파티 크기
    minIlvl: 0,        // 최소 아이템 레벨 제한
    minCombatPower: 0  // 최소 전투력 제한
  };
  
  state.raidParties.push(newParty);
  renderRaidParties();
}

// 공격대 파티 삭제
function removeRaidParty(partyId) {
  // 삭제 애니메이션 적용
  const partyCard = document.querySelector(`[data-party="${partyId}"]`).closest('.card');
  if (partyCard) {
    partyCard.classList.add('removing');
    
    // 애니메이션 완료 후 실제 삭제
    setTimeout(() => {
      state.raidParties = state.raidParties.filter(p => p.id !== partyId);
      renderRaidParties();
    }, 300);
  } else {
    // 애니메이션을 적용할 수 없는 경우 즉시 삭제
    state.raidParties = state.raidParties.filter(p => p.id !== partyId);
    renderRaidParties();
  }
}

// 공격대 파티 이름 업데이트
function updatePartyName(partyId, newName) {
  const party = state.raidParties.find(p => p.id === partyId);
  if (party) {
    const oldName = party.name;
    party.name = newName.trim() || `공대 ${partyId}`;
    console.log(`📝 [PARTY NAME] ${partyId}: "${oldName}" → "${party.name}"`);
    renderRaidParties();
  }
}

// 공격대 요구사항 업데이트
function updatePartyRequirements(partyId, requirementType, value) {
  const party = state.raidParties.find(p => p.id === partyId);
  if (party) {
    const oldValue = party[requirementType];
    party[requirementType] = parseInt(value) || 0;
    console.log(`📝 [REQUIREMENT] ${partyId} ${requirementType}: ${oldValue} → ${party[requirementType]}`);
    renderRaidParties();
  }
}

// 캐릭터가 공격대 요구사항을 만족하는지 확인
function meetsRequirements(character, party) {
  const charIlvl = parseFloat((character.ilvl || '0').replace(/,/g, ''));
  const charCombatPower = parseFloat((character.combatPower || '0').replace(/,/g, ''));
  
  return charIlvl >= party.minIlvl && charCombatPower >= party.minCombatPower;
}

// 전체 공격대 초기화
function clearAllRaids() {
  state.raidParties.forEach(party => {
    party.members.fill(null);
  });
  renderRaidParties();
}

// 특정 파티의 크기 변경
function changePartySize(partyId, size) {
  const newSize = parseInt(size);
  const party = state.raidParties.find(p => p.id === partyId);
  
  if (!party || party.size === newSize) return;
  
  party.size = newSize;
  
  if (newSize > party.members.length) {
    // 파티 확장
    party.members.push(...Array(newSize - party.members.length).fill(null));
  } else {
    // 파티 축소 (초과 멤버 제거)
    party.members = party.members.slice(0, newSize);
  }
  
  party.maxSupports = Math.ceil(newSize / 4);
  renderRaidParties();
}

// 공격대 파티 렌더링
function renderRaidParties() {
  const container = document.getElementById('raidParties');
  container.innerHTML = '';
  
  state.raidParties.forEach((party, index) => {
    const partyDiv = document.createElement('div');
    partyDiv.className = 'col-12';
    
    // 평균 전투력 계산
    const validMembers = party.members.filter(m => m !== null);
    const avgCombatPower = validMembers.length > 0 
      ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)
      : 0;
    
    const supportCount = party.members.filter(m => m?.role === 'support').length;
    const supportBadge = supportCount > party.maxSupports ? 'bg-danger' : 'bg-secondary';
    
    partyDiv.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center flex-wrap">
          <div class="d-flex align-items-center flex-wrap mb-2 mb-md-0">
            <div class="input-group input-group-sm me-3" style="width: 200px;">
              <input type="text" class="form-control" id="partyName-${party.id}" 
                     value="${party.name || `공대 ${party.id}`}" 
                     placeholder="공대 이름" 
                     onchange="updatePartyName('${party.id}', this.value)">
              <button class="btn btn-outline-secondary" type="button" onclick="this.previousElementSibling.focus()">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
            <span class="badge bg-info">평균 전투력 ${avgCombatPower.toLocaleString()}</span>
          </div>
          <div class="d-flex align-items-center gap-3 flex-wrap">
            <div class="d-flex align-items-center gap-2">
              <label class="form-label mb-0 small">크기:</label>
              <div class="btn-group btn-group-sm" role="group">
                <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="changePartySize('${party.id}', 4)">
                <label class="btn btn-outline-primary" for="size4-${party.id}">4인</label>
                
                <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="changePartySize('${party.id}', 8)">
                <label class="btn btn-outline-primary" for="size8-${party.id}">8인</label>
              </div>
            </div>
            <span id="support-${party.id}" class="badge ${supportBadge}">서폿 ${supportCount}/${party.maxSupports}</span>
            ${state.raidParties.length > 2 ? `
              <button class="btn btn-sm btn-outline-danger" onclick="removeRaidParty('${party.id}')">
                <i class="bi bi-x-lg"></i>
              </button>
            ` : ''}
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
          <div class="raid-slots-grid">
            ${party.members.map((char, slotIndex) => {
              const partyNumber = party.size === 8 ? Math.floor(slotIndex / 4) + 1 : 1;
              const isFirstInParty = slotIndex % 4 === 0;
              return `
              <div class="raid-slot-wrapper" data-party="${party.id}" data-slot="${slotIndex}">
                ${isFirstInParty && party.size === 8 ? `<div class="party-label">파티 ${partyNumber}</div>` : ''}
                <div class="raid-slot">
                  ${char ? `
                    <div class="char-box ${char.role} ${!meetsRequirements(char, party) ? 'requirement-failed' : ''}" draggable="true">
                      <div class="fw-bold small">${char.name}</div>
                      <div class="small text-muted">Lv ${char.ilvl || '0'}</div>
                      <div class="small text-muted">CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                      <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1" style="font-size: 0.7rem;">${char.role === 'support' ? '서폿' : '딜러'}</div>
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
  
  setupRaidEventListeners();
  updateSupportCount();
}

// 공격대 데이터 저장
function saveRaidData() {
  try {
    const saveData = {
      raidParties: state.raidParties,
      expeditionSlots: state.expeditionSlots,
      raidPartyCounter: state.raidPartyCounter,
      saveTime: new Date().toISOString()
    };
    
    localStorage.setItem('lostArkRaidData', JSON.stringify(saveData));
    console.log('💾 [SAVE] 공격대 데이터가 저장되었습니다.');
    alert('공격대 정보가 저장되었습니다!\n(원정대 정보 포함)');
  } catch (error) {
    console.error('❌ [SAVE ERROR]:', error);
    alert('저장 중 오류가 발생했습니다: ' + error.message);
  }
}

// 공격대 데이터 불러오기
function loadRaidData() {
  try {
    const savedData = localStorage.getItem('lostArkRaidData');
    
    if (!savedData) {
      alert('저장된 데이터가 없습니다.');
      return;
    }
    
    const data = JSON.parse(savedData);
    
    // 데이터 복원
    state.raidParties = data.raidParties || [];
    state.expeditionSlots = data.expeditionSlots || Array.from({length:8}, () => []);
    state.raidPartyCounter = data.raidPartyCounter || 0;
    
    // UI 업데이트
    renderRaidParties();
    renderExpedition();
    
    const saveTime = new Date(data.saveTime).toLocaleString('ko-KR');
    console.log('📂 [LOAD] 공격대 데이터가 불러와졌습니다. 저장 시간:', saveTime);
    alert(`공격대 정보가 불러와졌습니다!\n저장 시간: ${saveTime}`);
  } catch (error) {
    console.error('❌ [LOAD ERROR]:', error);
    alert('불러오기 중 오류가 발생했습니다: ' + error.message);
  }
}

// 공격대 리스트 모달창 표시
function showRaidListModal() {
  // 모달창 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="raidListModal" tabindex="-1" aria-labelledby="raidListModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-fullscreen-lg-down">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="raidListModalLabel">공대 리스트</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>공대</th>
                    <th>이름</th>
                    <th>크기</th>
                    <th>서폿</th>
                    <th>평균 전투력</th>
                    <th>캐릭터 목록</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.raidParties.map(party => {
                    const validMembers = party.members.filter(m => m !== null);
                    const avgCombatPower = validMembers.length > 0 
                      ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)
                      : 0;
                    const supportCount = party.members.filter(m => m?.role === 'support').length;
                    
                    return `
                      <tr>
                        <td><span class="badge bg-primary">${party.id}</span></td>
                        <td><strong>${party.name}</strong></td>
                        <td>${party.size}인</td>
                        <td>
                          <span class="badge ${supportCount > party.maxSupports ? 'bg-danger' : 'bg-success'}">
                            ${supportCount}/${party.maxSupports}
                          </span>
                        </td>
                        <td>${avgCombatPower.toLocaleString()}</td>
                        <td>
                          ${party.size === 8 ? `
                            <div class="party-group">
                              <div class="party-section">
                                <span class="party-label-text">P1</span>
                                <div class="d-flex flex-wrap gap-1">
                                  ${party.members.slice(0, 4).map((char, index) => char ? `
                                    <span class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}" 
                                          title="Lv ${char.ilvl || '0'} | 전투력 ${char.combatPower || '0'}">
                                      ${char.name}
                                    </span>
                                  ` : `
                                    <span class="badge bg-secondary">빈 슬롯 ${index + 1}</span>
                                  `).join('')}
                                </div>
                              </div>
                              <div class="party-section">
                                <span class="party-label-text">P2</span>
                                <div class="d-flex flex-wrap gap-1">
                                  ${party.members.slice(4, 8).map((char, index) => char ? `
                                    <span class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}" 
                                          title="Lv ${char.ilvl || '0'} | 전투력 ${char.combatPower || '0'}">
                                      ${char.name}
                                    </span>
                                  ` : `
                                    <span class="badge bg-secondary">빈 슬롯 ${index + 5}</span>
                                  `).join('')}
                                </div>
                              </div>
                            </div>
                          ` : `
                            <div class="d-flex flex-wrap gap-1">
                              ${party.members.map((char, index) => char ? `
                                <span class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}" 
                                      title="Lv ${char.ilvl || '0'} | 전투력 ${char.combatPower || '0'}">
                                  ${char.name}
                                </span>
                              ` : `
                                <span class="badge bg-secondary">빈 슬롯 ${index + 1}</span>
                              `).join('')}
                            </div>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="mt-3">
              <h6>요약 정보</h6>
              <div class="row">
                <div class="col-md-3">
                  <div class="card text-center">
                    <div class="card-body">
                      <h3 class="card-title">${state.raidParties.length}</h3>
                      <p class="card-text">전체 공대 수</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card text-center">
                    <div class="card-body">
                      <h3 class="card-title">${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m !== null).length, 0)}</h3>
                      <p class="card-text">배치된 캐릭터</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card text-center">
                    <div class="card-body">
                      <h3 class="card-title">${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'support').length, 0)}</h3>
                      <p class="card-text">전체 서폿 수</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="card text-center">
                    <div class="card-body">
                      <h3 class="card-title">${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'dps').length, 0)}</h3>
                      <p class="card-text">전체 딜러 수</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
            <button type="button" class="btn btn-primary" onclick="exportRaidList()">내보내기</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById('raidListModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달을 body에 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Bootstrap 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('raidListModal'));
  modal.show();
}

// 공대 리스트 내보내기
function exportRaidList() {
  let exportText = "=== 공대 리스트 ===\n\n";
  
  state.raidParties.forEach(party => {
    const validMembers = party.members.filter(m => m !== null);
    const avgCombatPower = validMembers.length > 0 
      ? Math.round(validMembers.reduce((sum, m) => sum + parseFloat((m.combatPower || '0').replace(',', '')), 0) / validMembers.length)
      : 0;
    const supportCount = party.members.filter(m => m?.role === 'support').length;
    
    exportText += `【${party.name} (${party.id})】\n`;
    exportText += `크기: ${party.size}인 | 서폿: ${supportCount}/${party.maxSupports} | 평균 전투력: ${avgCombatPower.toLocaleString()}\n`;
    
    party.members.forEach((char, index) => {
      if (char) {
        exportText += `  ${index + 1}. ${char.name} (${char.role === 'support' ? '서폿' : '딜러'}) - Lv ${char.ilvl || '0'} | 전투력 ${char.combatPower || '0'}\n`;
      }
    });
    exportText += "\n";
  });
  
  exportText += `=== 요약 ===\n`;
  exportText += `전체 공대: ${state.raidParties.length}개\n`;
  exportText += `배치된 캐릭터: ${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m !== null).length, 0)}명\n`;
  exportText += `전체 서폿: ${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'support').length, 0)}명\n`;
  exportText += `전체 딜러: ${state.raidParties.reduce((sum, party) => sum + party.members.filter(m => m?.role === 'dps').length, 0)}명\n`;
  
  // 텍스트 파일로 다운로드
  const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `공대리스트_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert('공대 리스트가 내보내기 되었습니다!');
}

function guessRole(cls, arkpassive) {
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
  return ["바드","홀리나이트","도화가"].includes(cls) ? "support" : "dps";
}

function updateSupportCount() {
  state.raidParties.forEach(party => {
    const count = party.members.filter(m => m?.role === "support").length;
    const badge = document.getElementById(`support-${party.id}`);
    if (badge) {
      badge.innerText = `서폿 ${count}/${party.maxSupports}`;
      badge.className = `badge ms-2 ${count > party.maxSupports ? 'bg-danger' : 'bg-secondary'}`;
    }
  });
}

function renderRaids() {
  const container = document.getElementById('raidParties');
  container.innerHTML = '';
  
  state.raidParties.forEach(party => {
    const partyCard = document.createElement('div');
    partyCard.className = 'raid-party-card';
    
    partyCard.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0">${party.name}</h6>
          <span id="support-${party.id}" class="badge bg-secondary ms-2">서폿 0/${party.maxSupports}</span>
        </div>
        <div class="card-body">
          <div class="raid-slots-grid">
            ${party.members.map((char, slotIndex) => `
              <div class="raid-slot-wrapper" data-party="${party.id}" data-slot="${slotIndex}">
                <div class="raid-slot">
                  ${char ? `
                    <div class="char-box ${char.role}" draggable="true">
                      <div class="fw-bold">${char.name}</div>
                      <div class="small">Lv ${char.ilvl || '0'}</div>
                      <div class="small">전투력 ${char.combatPower || '0'}</div>
                      <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1">${char.role === 'support' ? '서폿' : '딜러'}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(partyCard);
  });
  
  setupRaidEventListeners();
  updateSupportCount();
}

function setupRaidEventListeners() {
  document.querySelectorAll('[data-party]').forEach(el => {
    const partyId = el.dataset.party;
    const slotIndex = parseInt(el.dataset.slot);
    const party = state.raidParties.find(p => p.id === partyId);
    const char = party ? party.members[slotIndex] : null;
    const slot = el.querySelector('.raid-slot');

    if (char) {
      const charBox = el.querySelector('.char-box');
      
      // 공격대 캐릭터 드래그 기능
      charBox.ondragstart = function(e) {
        console.log(`🎯 [DRAG START] Raid character: ${char.name}, Party: ${partyId}, Slot: ${slotIndex}`);
        const dragData = JSON.stringify({...char, fromRaid: true, partyId: partyId, slotIndex: slotIndex});
        e.dataTransfer.setData('text/plain', dragData);
        e.dataTransfer.effectAllowed = 'move';
        console.log(`📤 [DRAG DATA] Set:`, dragData);
        
        // 드래그 중인 스타일 추가
        charBox.classList.add('dragging');
      };
      
      charBox.ondragend = function(e) {
        // 드래그 스타일 제거
        charBox.classList.remove('dragging');
        console.log(`🏁 [DRAG END] Raid character: ${char.name}`);
      };
      
      // 더블클릭으로 캐릭터 제거
      charBox.ondblclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🗑️ [DBL CLICK REMOVE] Raid character: ${char.name}, Party: ${partyId}, Slot: ${slotIndex}`);
        
        showRemoveCharacterModal(char, partyId, slotIndex);
      };
    }

    slot.ondragover = e => {
      console.log(`🔄 [DRAG OVER] Party: ${partyId}, Slot: ${slotIndex}`);
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      slot.classList.add('drag-over');
    };

    slot.ondragleave = () => {
      slot.classList.remove('invalid');
      slot.classList.remove('drag-over');
    };

    slot.ondrop = e => {
      console.log(`🎯 [DROP START] Party: ${partyId}, Slot: ${slotIndex}`);
      e.preventDefault();
      e.stopPropagation();
      
      try {
        console.log(`📥 [DROP PARSE] Starting data parse for Party: ${partyId}, Slot: ${slotIndex}`);
        
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        console.log(`📊 [DROP DATA] Received:`, { name: data.name, id: data.id, role: data.role, fromRaid: data.fromRaid });
        
        if (!data || !data.id) {
          console.error(`❌ [DROP ERROR] Invalid data:`, data);
          alert('유효하지 않은 캐릭터 데이터입니다.');
          return;
        }
        
        if (party.members[slotIndex]) {
          console.log(`❌ [DROP ERROR] Slot occupied by: ${party.members[slotIndex].name}`);
          alert('이미 캐릭터가 배치된 슬롯입니다.');
          return;
        }
        
        // 공격대당 1원정대만 가능한지 체크
        const currentExpeditions = new Set();
        party.members.forEach(m => {
          if (m && m.id) {
            // 원정대 인덱스 찾기
            for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {
              const expedition = state.expeditionSlots[expIndex];
              if (expedition.some(c => c && c.id === m.id)) {
                currentExpeditions.add(expIndex);
                break;
              }
            }
          }
        });
        
        // 새 캐릭터의 원정대 인덱스 찾기
        let newCharacterExpeditionIndex = -1;
        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {
          const expedition = state.expeditionSlots[expIndex];
          if (expedition.some(c => c && c.id === data.id)) {
            newCharacterExpeditionIndex = expIndex;
            break;
          }
        }
        
        if (currentExpeditions.has(newCharacterExpeditionIndex)) {
          console.log(`❌ [DROP ERROR] Same expedition already in raid: ${newCharacterExpeditionIndex}`);
          alert('이미 같은 원정대의 캐릭터가 이 공격대에 있습니다.\n(공격대 1개당 1원정대만 가능합니다)');
          return;
        }
        
        // 1캐릭터 최대 3개 공격대 제한 체크
        let characterRaidCount = 0;
        state.raidParties.forEach(p => {
          if (p.members.some(m => m && m.id === data.id)) {
            characterRaidCount++;
          }
        });
        
        if (characterRaidCount >= 3) {
          console.log(`❌ [DROP ERROR] Character ${data.name} already in ${characterRaidCount} raids`);
          alert('이 캐릭터는 이미 3개의 공격대에 배치되어 있습니다.\n(1캐릭터당 최대 3개 공격대 가능)');
          return;
        }
        
        // 서폿 수 체크 (파티당 1명, 8인은 각 파티별 1명씩)
        if (data.role === 'support') {
          if (party.size === 8) {
            // 8인 공격대: 각 파티별로 서폿 1명씩 체크
            const partyNumber = Math.floor(slotIndex / 4) + 1;
            const partyStartIndex = (partyNumber - 1) * 4;
            const partyEndIndex = partyNumber * 4;
            const partyMembers = party.members.slice(partyStartIndex, partyEndIndex);
            const supportsInParty = partyMembers.filter(m => m?.role === 'support').length;
            
            if (supportsInParty >= 1) {
              console.log(`❌ [DROP ERROR] Support limit reached in Party ${partyNumber}: ${supportsInParty}/1`);
              alert(`파티 ${partyNumber}에는 서포터를 1명만 배치할 수 있습니다.`);
              return;
            }
          } else {
            // 4인 공격대: 전체 파티에서 서폿 1명 체크
            const currentSupports = party.members.filter(m => m?.role === 'support').length;
            if (currentSupports >= party.maxSupports) {
              console.log(`❌ [DROP ERROR] Support limit reached: ${currentSupports}/${party.maxSupports}`);
              alert(`이 공격대에는 서포터를 ${party.maxSupports}명만 배치할 수 있습니다.`);
              return;
            }
          }
        }
        
        console.log(`✅ [DROP SUCCESS] Adding ${data.name} to Party ${partyId}, Slot ${slotIndex}`);
        console.log(`📝 [BEFORE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));
        
        party.members[slotIndex] = data;
        
        console.log(`📝 [AFTER] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));
        console.log(`🔄 [RENDER] Calling renderRaidParties()`);
        
        renderRaidParties();
        renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시
        
        console.log(`✅ [DROP COMPLETE] Character ${data.name} successfully added`);
        
      } catch (error) {
        console.error('❌ Drop error:', error);
        alert('캐릭터를 추가하는 중 오류가 발생했습니다: ' + error.message);
      }
    };
  });
}

function removeCharacterFromRaid(partyId, slotIndex) {
  try {
    console.log(`🗑️ [REMOVE START] Party: ${partyId}, Slot: ${slotIndex}`);
    const party = state.raidParties.find(p => p.id === partyId);
    if (!party) {
      console.error(`❌ [REMOVE ERROR] Party not found: ${partyId}`);
      return;
    }
    
    const removedChar = party.members[slotIndex];
    if (!removedChar) {
      console.log(`ℹ️ [REMOVE INFO] No character to remove at slot: ${slotIndex}`);
      return;
    }
    
    console.log(`🗑️ [REMOVE] Character: ${removedChar.name} from Party ${partyId}, Slot ${slotIndex}`);
    console.log(`📝 [BEFORE REMOVE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));
    
    // 공격대에서 캐릭터 제거
    party.members[slotIndex] = null;
    
    console.log(`📝 [AFTER REMOVE] Party members:`, party.members.map((m, i) => m ? `${i}:${m.name}` : `${i}:null`));
    console.log(`🔄 [RENDER] Calling renderRaidParties()`);

    // UI 업데이트
    renderRaidParties();
    renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시
    
    console.log(`✅ [REMOVE COMPLETE] Character ${removedChar.name} successfully removed`);
    
  } catch (error) {
    console.error(`❌ [REMOVE ERROR]:`, error);
    alert('캐릭터를 제거하는 중 오류가 발생했습니다: ' + error.message);
  }
}

// 캐릭터 삭제 확인 모달창 표시
function showRemoveCharacterModal(character, partyId, slotIndex) {
  // 모달창 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="removeCharacterModal" tabindex="-1" aria-labelledby="removeCharacterModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="removeCharacterModalLabel">캐릭터 삭제</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-0"><span class="text-danger fw-bold">${character.name}</span> 캐릭터를 공격대에서 제거하시겠습니까?</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-danger" onclick="confirmRemoveCharacter('${partyId}', ${slotIndex})">삭제</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById('removeCharacterModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달을 body에 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Bootstrap 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('removeCharacterModal'));
  modal.show();
}

// 캐릭터 삭제 확정
function confirmRemoveCharacter(partyId, slotIndex) {
  try {
    removeCharacterFromRaid(partyId, slotIndex);
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('removeCharacterModal'));
    modal.hide();
    
  } catch (error) {
    console.error('캐릭터 삭제 중 오류:', error);
    alert('캐릭터를 삭제하는 중 오류가 발생했습니다: ' + error.message);
  }
}

function renderExpedition() {
  const root = document.getElementById('expedition');
  root.innerHTML = '';
  
  state.expeditionSlots.forEach((chars,i)=>{
    const col = document.createElement('div');
    col.className='expedition-slot';
    col.innerHTML=`
      <div class="card shadow-sm">
        <div class="card-header">
          <input class="form-control expedition-input" placeholder="캐릭터명" data-expedition-index="${i}" onkeypress="handleExpeditionKeyPress(event, ${i})">
          <button class="btn btn-sm btn-primary w-100 mt-1" onclick="fetchExpedition(${i})">검색</button>
        </div>
        <div class="card-body p-2 expedition-drop-zone" data-expedition-index="${i}"></div>
      </div>`;
    const body = col.querySelector('.card-body');

    // 원정대 드롭존 이벤트 추가
    body.ondragover = function(e) {
      console.log(`🔍 [EXPEDITION DRAG OVER] Expedition index: ${i}`);
      e.preventDefault();
      e.stopPropagation();
      body.classList.add('drag-over');
    };

    body.ondragleave = function(e) {
      body.classList.remove('drag-over');
    };

    body.ondrop = function(e) {
      try {
        console.log(`🎯 [EXPEDITION DROP START] Expedition index: ${i}`);
        e.preventDefault();
        e.stopPropagation();
        body.classList.remove('drag-over');
        
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        console.log(`📊 [EXPEDITION DROP DATA] Received:`, { name: data.name, id: data.id, fromRaid: data.fromRaid });
        
        // 공격대에서 온 캐릭터인 경우 제거
        if (data.fromRaid) {
          console.log(`🗑️ [EXPEDITION DROP] Removing raid character: ${data.name} from Party ${data.partyId}, Slot ${data.slotIndex}`);
          removeCharacterFromRaid(data.partyId, data.slotIndex);
          return;
        }
        
        // 일반 원정대 캐릭터 드롭은 기존 로직으로 처리
        console.log(`📌 [EXPEDITION DROP] Regular expedition character drop - no action needed`);
        
      } catch (error) {
        console.error(`❌ [EXPEDITION DROP ERROR]:`, error);
      }
    };

    chars.forEach(c=>{
      const div = document.createElement('div');
      div.className='char-item';
      div.draggable=true;
      
      // 전투력 정보만 간단히 출력
      if (c.combatPower && c.combatPower !== '0') {
        console.log(`📊 [CHARACTER] ${c.name}: 전투력 ${c.combatPower}`);
      }
      
      // 해당 캐릭터가 배치된 공격대 갯수 계산
      let raidCount = 0;
      state.raidParties.forEach(party => {
        if (party.members.some(m => m && m.id === c.id)) {
          raidCount++;
        }
      });
      
      // 캐릭터 이미지 또는 기본 아이콘
      const iconHtml = c.image 
        ? `<img src="${c.image}" class="char-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="char-icon ${c.role}" style="display:none;">
             <i class="bi bi-person-fill"></i>
           </div>`
        : `<div class="char-icon ${c.role}">
           <i class="bi bi-person-fill"></i>
         </div>`;
      
      div.innerHTML=`
        ${iconHtml}
        <div class="char-info">
          <div class="char-name-row">
            <span class="char-name">${c.name}</span>
            <span class="badge ${c.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}">${c.role === 'support' ? '서폿' : '딜러'}</span>
            <span class="badge ${raidCount >= 3 ? 'bg-danger' : raidCount > 0 ? 'bg-success' : 'bg-secondary'} ms-1">${raidCount}/3</span>
          </div>
          <span class="char-details">Lv ${c.ilvl || '0'} | 전투력 ${c.combatPower || '0'}</span>
        </div>`;
      
      div.ondragstart = function(e) {
        console.log(`🎯 [DRAG START] Expedition character: ${c.name}`);
        const dragData = JSON.stringify(c);
        e.dataTransfer.setData('text/plain', dragData);
        e.dataTransfer.effectAllowed = 'copy';
        console.log(`📤 [DRAG DATA] Set:`, { name: c.name, id: c.id, role: c.role });
        
        // 드래그 중인 스타일 추가
        div.classList.add('dragging');
      };
      
      div.ondragend = function(e) {
        // 드래그 스타일 제거
        div.classList.remove('dragging');
        console.log(`🏁 [DRAG END] Expedition character: ${c.name}`);
      };
      
      div.ondblclick = function(e) {
        e.preventDefault();
        console.log(`🔄 [DBL CLICK] Character: ${c.name}, Role: ${c.role}`);
        
        // 역할 수정 모달창 표시
        showCharacterEditModal(c, i);
      };
      
      body.appendChild(div);
    });

    // 원정대 슬롯에 추가
    root.appendChild(col);
  });
}

// 캐릭터 수정 모달창 표시
function showCharacterEditModal(character, expeditionIndex) {
  // 모달창 HTML 생성
  const modalHtml = `
    <div class="modal fade" id="characterEditModal" tabindex="-1" aria-labelledby="characterEditModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="characterEditModalLabel">캐릭터 정보 수정</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="characterEditForm">
              <div class="mb-3">
                <label class="form-label">캐릭터 이름</label>
                <input type="text" class="form-control" id="editName" value="${character.name}" readonly>
              </div>
              <div class="mb-3">
                <label class="form-label">전투력</label>
                <div class="input-group">
                  <input type="number" class="form-control" id="editCombatPower" value="${character.combatPower || '0'}" placeholder="전투력 입력">
                  <span class="input-group-text">원본: ${character.combatPower || '0'}</span>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">역할</label>
                <div class="btn-group w-100" role="group">
                  <input type="radio" class="btn-check" name="editRole" id="editRoleDps" value="dps" ${character.role === 'dps' ? 'checked' : ''}>
                  <label class="btn btn-outline-primary" for="editRoleDps">딜러</label>
                  
                  <input type="radio" class="btn-check" name="editRole" id="editRoleSupport" value="support" ${character.role === 'support' ? 'checked' : ''}>
                  <label class="btn btn-outline-warning" for="editRoleSupport">서폿</label>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-primary" onclick="saveCharacterEdit(${expeditionIndex})">저장</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById('characterEditModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 모달을 body에 추가
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Bootstrap 모달 표시
  const modal = new bootstrap.Modal(document.getElementById('characterEditModal'));
  modal.show();
}

// 캐릭터 정보 저장
function saveCharacterEdit(expeditionIndex) {
  try {
    const character = state.expeditionSlots[expeditionIndex].find(c => c.id === document.getElementById('editName').value);
    
    if (!character) {
      alert('캐릭터를 찾을 수 없습니다.');
      return;
    }
    
    // 전투력 업데이트
    const newCombatPower = document.getElementById('editCombatPower').value;
    character.combatPower = newCombatPower || '0';
    
    // 역할 업데이트
    const newRole = document.querySelector('input[name="editRole"]:checked').value;
    character.role = newRole;
    
    console.log(`📝 [CHARACTER EDIT] ${character.name}: CombatPower ${character.combatPower}, Role ${character.role}`);
    
    // UI 업데이트
    renderExpedition();
    renderRaidParties();
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.getElementById('characterEditModal'));
    modal.hide();
    
    alert('캐릭터 정보가 수정되었습니다.');
    
  } catch (error) {
    console.error('캐릭터 정보 수정 중 오류:', error);
    alert('캐릭터 정보 수정 중 오류가 발생했습니다: ' + error.message);
  }
}

// 엔터키 처리 함수
function handleExpeditionKeyPress(event, index) {
  if (event.key === 'Enter') {
    event.preventDefault();
    fetchExpedition(index);
  }
}

async function fetchExpedition(index){
  const input = document.querySelector(`.expedition-input[data-expedition-index="${index}"]`);
  const name = input ? input.value.trim() : '';
  
  if(!name) {
    alert('캐릭터명을 입력해주세요.');
    return;
  }

  // 쉼표로 구분된 여러 아이디 처리
  const names = name.split(',').map(n => n.trim()).filter(n => n);
  
  if (names.length > 1) {
    // 여러 아이디를 처리하는 경우 - 한 슬롯에 모든 캐릭터 합치기
    console.log(`🔍 [MULTI FETCH] Processing ${names.length} expedition IDs: ${names.join(', ')}`);
    
    try {
      // 각 아이디에 대해 원정대 정보 조회
      const expeditionPromises = names.map(async (expeditionName) => {
        try {
          // 1단계: 원정대 캐릭터 목록 조회
          const res = await fetch(`${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(expeditionName)}/siblings`,
            {headers:getLostArkHeaders()});
          
          if (!res.ok) {
            console.warn(`Failed to fetch expedition ${expeditionName}: ${res.status}`);
            return { expeditionName, success: false, error: `HTTP error! status: ${res.status}` };
          }
          
          const siblingsData = await res.json();
          
          if (!siblingsData || !Array.isArray(siblingsData) || siblingsData.length === 0) {
            console.warn(`No expedition data found for ${expeditionName}`);
            return { expeditionName, success: false, error: '원정대 정보를 찾을 수 없습니다' };
          }

          // 계정당 상위 6명 캐릭터의 상세 정보만 조회
          const topCharacters = siblingsData
            .sort((a,b)=>parseFloat((b.ItemAvgLevel||'0').replace(',',''))-parseFloat((a.ItemAvgLevel||'0').replace(',','')))
            .slice(0,6); // 계정당 6명으로 제한
          
          console.log(`📡 [FETCH] Getting detailed info for ${expeditionName}: ${topCharacters.map(c => c.CharacterName).join(', ')}`);
          
          const characterPromises = topCharacters.map(char => 
            Promise.all([
              fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`,
                {headers:getLostArkHeaders()})
                .then(res => {
                  if (!res.ok) {
                    console.warn(`Profile API failed for ${char.CharacterName}: ${res.status}`);
                    return null;
                  }
                  return res.json();
                })
                .catch(err => {
                  console.warn(`Profile fetch error for ${char.CharacterName}:`, err);
                  return null;
                }),
              fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/arkpassive`,
                {headers:getLostArkHeaders()})
                .then(res => {
                  if (!res.ok) {
                    console.warn(`ArkPassive API failed for ${char.CharacterName}: ${res.status}`);
                    return null;
                  }
                  return res.json();
                })
                .catch(err => {
                  console.warn(`ArkPassive fetch error for ${char.CharacterName}:`, err);
                  return null;
                })
            ])
          );

          const profiles = await Promise.all(characterPromises);

          // 데이터 결합
          const expeditionData = topCharacters.map((char, idx) => {
            const [profile, arkpassive] = profiles[idx];
            
            return {
              id: char.CharacterName,
              name: char.CharacterName,
              ilvl: char.ItemAvgLevel || '0',
              combatPower: profile?.CombatPower || char.CombatPower || '0', 
              role: guessRole(char.CharacterClassName, arkpassive), 
              image: profile?.CharacterImage || 'img/default-character.png', 
              className: char.CharacterClassName,
              level: char.CharacterLevel,
              arkpassive: arkpassive 
            };
          })
          .sort((a,b)=>parseFloat((b.combatPower||'0').replace(',',''))-parseFloat((a.combatPower||'0').replace(',','')));

          return { expeditionName, success: true, data: expeditionData };
        } catch (error) {
          console.error(`Error processing expedition ${expeditionName}:`, error);
          return { expeditionName, success: false, error: error.message };
        }
      });

      const results = await Promise.all(expeditionPromises);
      
      // 성공한 원정대들의 캐릭터를 모두 합쳐서 한 슬롯에 배치
      let successCount = 0;
      let failCount = 0;
      const failedExpeditions = [];
      const allCharacters = [];
      
      results.forEach((result) => {
        if (result.success) {
          allCharacters.push(...result.data);
          successCount++;
        } else {
          failCount++;
          failedExpeditions.push(`${result.expeditionName}: ${result.error}`);
        }
      });
      
      // 전체 캐릭터를 전투력 순으로 정렬하고 상위 18명만 선택
      const sortedCharacters = allCharacters
        .sort((a,b) => parseFloat((b.ilvl||'0').replace(',','')) - parseFloat((a.ilvl||'0').replace(',','')))
        .slice(0, 18);
      
      // 해당 슬롯에 배치
      if (sortedCharacters.length > 0 && index < 8) {
        state.expeditionSlots[index] = sortedCharacters;
        console.log(`✅ [COMBINED EXPEDITION] Slot ${index}: ${sortedCharacters.length} characters from ${successCount} expeditions`);
      }
      
      // UI 업데이트
      renderExpedition();
      
      // 결과 알림
      let message = `원정대 조회 완료!\n성공: ${successCount}개, 실패: ${failCount}개\n총 ${sortedCharacters.length}명의 캐릭터가 슬롯 ${index + 1}에 배치되었습니다.`;
      if (failedExpeditions.length > 0) {
        message += `\n\n실패한 원정대:\n${failedExpeditions.join('\n')}`;
      }
      alert(message);
      
      console.log(`✅ [MULTI FETCH COMPLETE] Success: ${successCount}, Failed: ${failCount}, Total Characters: ${sortedCharacters.length}`);
      
    } catch (error) {
      alert(`여러 원정대 조회 중 오류가 발생했습니다: ${error.message}`);
      console.error('Multi expedition fetch error:', error);
    }
    
    return;
  }

  // 단일 아이디 처리 (기존 로직)
  try {
    // 1단계: 원정대 캐릭터 목록 조회
    const res = await fetch(`${LOSTARK_API_CONFIG.BASE_URL}/characters/${encodeURIComponent(name)}/siblings`,
      {headers:getLostArkHeaders()});
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const siblingsData = await res.json();
    
    if (!siblingsData || !Array.isArray(siblingsData) || siblingsData.length === 0) {
      alert(`캐릭터 '${name}'의 원정대 정보를 찾을 수 없습니다.`);
      return;
    }

    // 2단계: 상위 6명 캐릭터의 상세 정보만 조회 (이미지, 전투력, 각인 포함)
    const topCharacters = siblingsData
      .sort((a,b)=>parseFloat((b.ItemAvgLevel||'0').replace(',',''))-parseFloat((a.ItemAvgLevel||'0').replace(',','')))
      .slice(0,6);
    
    console.log(`� [FETCH] Getting detailed info for: ${topCharacters.map(c => c.CharacterName).join(', ')}`);
    
    const characterPromises = topCharacters.map(char => 
      Promise.all([
        fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`,
          {headers:getLostArkHeaders()})
          .then(res => {
            if (!res.ok) {
              console.warn(`Profile API failed for ${char.CharacterName}: ${res.status}`);
              return null;
            }
            return res.json();
          })
          .catch(err => {
            console.warn(`Profile fetch error for ${char.CharacterName}:`, err);
            return null;
          }),
        fetch(`${LOSTARK_API_CONFIG.BASE_URL}/armories/characters/${encodeURIComponent(char.CharacterName)}/arkpassive`,
          {headers:getLostArkHeaders()})
          .then(res => {
            if (!res.ok) {
              console.warn(`ArkPassive API failed for ${char.CharacterName}: ${res.status}`);
              return null;
            }
            return res.json();
          })
          .catch(err => {
            console.warn(`ArkPassive fetch error for ${char.CharacterName}:`, err);
            return null;
          })
      ])
    );

    const profiles = await Promise.all(characterPromises);

    // 데이터 결합
    state.expeditionSlots[index] = topCharacters.map((char, idx) => {
      const [profile, arkpassive] = profiles[idx];
      
      return {
        id: char.CharacterName,
        name: char.CharacterName,
        ilvl: char.ItemAvgLevel || '0',
        combatPower: profile?.CombatPower || char.CombatPower || '0', 
        role: guessRole(char.CharacterClassName, arkpassive), 
        image: profile?.CharacterImage || 'img/default-character.png', 
        className: char.CharacterClassName,
        level: char.CharacterLevel,
        arkpassive: arkpassive 
      };
    })
    .sort((a,b)=>parseFloat((b.ilvl||'0').replace(',',''))-parseFloat((a.ilvl||'0').replace(',','')))
    .slice(0,6);

    console.log(`✅ [FETCH COMPLETE] Expedition ${index}: ${state.expeditionSlots[index].length} characters loaded`);
    renderExpedition();
  } catch (error) {
    alert(`원정대 정보를 가져오는 중 오류가 발생했습니다: ${error.message}`);
  }
}

function autoAssign(){
  // 모든 공격대 파티 초기화하지 않고 기존 배치된 캐릭터 유지
  // state.raidParties.forEach(party => {
  //   party.members.fill(null);
  // });
  
  // 모든 원정대 캐릭터 수집 (전투력 순으로 정렬)
  const allChars = [];
  state.expeditionSlots.forEach((expedition, expIndex) => {
    expedition.forEach(char => {
      if (char) {
        allChars.push(Object.assign({}, char, {
          expeditionIndex: expIndex // 원정대 인덱스 저장
        }));
      }
    });
  });
  
  // 전투력 높은 순으로 정렬
  allChars.sort((a,b) => parseFloat((b.ilvl||'0').replace(/,/g,'')) - parseFloat((a.ilvl||'0').replace(/,/g,'')));
  
  // 서포터와 DPS 분리
  const supports = allChars.filter(c => c.role === 'support');
  const dps = allChars.filter(c => c.role === 'dps');
  
  // 각 파티에 서포터 배치 (최대 1명, 1캐릭터당 최대 3공격대 제한)
  state.raidParties.forEach((party, partyIndex) => {
    // 이미 서포터가 배치되어 있으면 건너뛰기
    if (party.members[0] && party.members[0].role === 'support') {
      console.log(`ℹ️ [AUTO ASSIGN] Party ${partyIndex + 1} already has support: ${party.members[0].name}`);
      return;
    }
    
    let bestSupport = null;
    
    // 모든 서포터 중에서 가장 적은 공격대에 배치된 서포터 찾기
    for (let supportChar of supports) {
      // 이 서포터가 이미 3개 공격대에 배치되었는지 확인
      let supportRaidCount = 0;
      state.raidParties.forEach(p => {
        if (p.members.some(m => m && m.id === supportChar.id)) {
          supportRaidCount++;
        }
      });
      
      // 3개 미만으로 배치된 서포터 중에서 전투력이 가장 높은 서포터 선택
      if (supportRaidCount < 3) {
        if (!bestSupport || parseFloat(supportChar.ilvl.replace(/,/g, '')) > parseFloat(bestSupport.ilvl.replace(/,/g, ''))) {
          bestSupport = supportChar;
        }
      }
    }
    
    if (bestSupport) {
      party.members[0] = bestSupport;
      console.log(`✅ [AUTO ASSIGN] Added support ${bestSupport.name} to Party ${partyIndex + 1}`);
    }
  });
  
  // 나머지 슬롯에 DPS 배치 (각 파티당 다른 원정대, 1캐릭터당 최대 3공격대)
  let assignedCount = 0;
  
  // 각 파티별로 가능한 원정대 인덱스 목록 생성
  state.raidParties.forEach((party, partyIndex) => {
    // 이미 이 파티에 배치된 원정대 인덱스 찾기
    const usedExpeditions = new Set();
    party.members.forEach(m => {
      if (m && m.id) {
        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {
          const expedition = state.expeditionSlots[expIndex];
          if (expedition.some(c => c && c.id === m.id)) {
            usedExpeditions.add(expIndex);
            break;
          }
        }
      }
    });
    
    // 이 파티에 배치 가능한 DPS 찾기 (다른 원정대, 3공격대 미만)
    for (let slotIndex = 1; slotIndex < party.members.length; slotIndex++) {
      // 이미 캐릭터가 배치되어 있으면 건너뛰기
      if (party.members[slotIndex]) {
        console.log(`ℹ️ [AUTO ASSIGN] Party ${partyIndex + 1} Slot ${slotIndex} already has: ${party.members[slotIndex].name}`);
        continue;
      }
      
      let foundChar = null;
      
      for (let i = 0; i < dps.length; i++) {
        const dpsChar = dps[i];
        
        // 이 DPS가 이미 3개 공격대에 배치되었는지 확인
        let dpsRaidCount = 0;
        state.raidParties.forEach(p => {
          if (p.members.some(m => m && m.id === dpsChar.id)) {
            dpsRaidCount++;
          }
        });
        
        if (dpsRaidCount >= 3) continue; // 3공격대 초과시 건너뛰기
        
        // 이 DPS의 원정대 인덱스 찾기
        let dpsExpeditionIndex = -1;
        for (let expIndex = 0; expIndex < state.expeditionSlots.length; expIndex++) {
          const expedition = state.expeditionSlots[expIndex];
          if (expedition.some(c => c && c.id === dpsChar.id)) {
            dpsExpeditionIndex = expIndex;
            break;
          }
        }
        
        // 이 파티에 아직 이 원정대가 없고, DPS가 아직 이 파티에 배치되지 않은 경우
        if (dpsExpeditionIndex !== -1 && !usedExpeditions.has(dpsExpeditionIndex)) {
          foundChar = dpsChar;
          usedExpeditions.add(dpsExpeditionIndex);
          break;
        }
      }
      
      if (foundChar) {
        party.members[slotIndex] = foundChar;
        assignedCount++;
        console.log(`✅ [AUTO ASSIGN] Added DPS ${foundChar.name} to Party ${partyIndex + 1} Slot ${slotIndex}`);
      }
    }
  });
  
  renderRaidParties();
  renderExpedition();
  
  // 결과 요약
  const totalAssigned = state.raidParties.reduce((sum, party) => 
    sum + party.members.filter(m => m !== null).length, 0
  );
  
  alert(`공대 자동 추천 완료!\n총 ${totalAssigned}명의 캐릭터가 배치되었습니다.\n(기존 배치된 캐릭터 유지, 빈 슬롯만 채움)`);
}

// 균등 분배 기능 - 각 원정대 계정당 1명씩 순차적으로 분배
function balancedAssign() {
  // 모든 공격대 파티 초기화하지 않고 기존 배치된 캐릭터 유지
  // state.raidParties.forEach(party => {
  //   party.members.fill(null);
  // });
  
  // 원정대별로 캐릭터 그룹화 및 전투력 순 정렬
  const expeditionGroups = {};
  state.expeditionSlots.forEach((expedition, expIndex) => {
    if (expedition.length > 0) {
      expeditionGroups[expIndex] = expedition
        .filter(char => char !== null)
        .sort((a,b) => parseFloat((b.ilvl||'0').replace(/,/g,'')) - parseFloat((a.ilvl||'0').replace(/,/g,'')));
    }
  });
  
  const expeditionIndices = Object.keys(expeditionGroups).map(Number);
  if (expeditionIndices.length === 0) {
    alert('분배할 원정대 캐릭터가 없습니다.');
    return;
  }
  
  console.log(`🔄 [BALANCED ASSIGN] ${expeditionIndices.length}개 원정대로 균등 분배 시작`);
  
  // 각 파티에 서포터 먼저 배치 (균등 분배)
  const supportSlots = [];
  state.raidParties.forEach((party, partyIndex) => {
    // 이미 서포터가 배치되어 있으면 건너뛰기
    if (party.members[0] && party.members[0].role === 'support') {
      console.log(`ℹ️ [BALANCED ASSIGN] Party ${partyIndex + 1} already has support: ${party.members[0].name}`);
    } else {
      supportSlots.push({ partyIndex, slotIndex: 0, party: party });
    }
  });
  
  // 서포터 균등 분배
  let supportRound = 0;
  let supportAssigned = 0;
  
  while (supportAssigned < supportSlots.length && supportRound < 100) { // 무한 루프 방지
    let roundAssigned = false;
    
    expeditionIndices.forEach(expIndex => {
      if (supportAssigned >= supportSlots.length) return;
      
      const expedition = expeditionGroups[expIndex];
      const supports = expedition.filter(char => char.role === 'support');
      
      if (supports.length > 0) {
        const support = supports[0]; // 가장 전투력 높은 서포터
        
        // 이 서포터가 이미 3개 공격대에 배치되었는지 확인
        let raidCount = 0;
        state.raidParties.forEach(p => {
          if (p.members.some(m => m && m.id === support.id)) {
            raidCount++;
          }
        });
        
        if (raidCount < 3) {
          const targetSlot = supportSlots[supportAssigned];
          targetSlot.party.members[targetSlot.slotIndex] = support;
          console.log(`✅ [SUPPORT] ${support.name} → Party ${targetSlot.partyIndex + 1}`);
          supportAssigned++;
          roundAssigned = true;
          
          // 배치된 서포터는 원정대 목록에서 제거
          const charIndex = expedition.findIndex(c => c.id === support.id);
          if (charIndex !== -1) {
            expedition.splice(charIndex, 1);
          }
        }
      }
    });
    
    if (!roundAssigned) break;
    supportRound++;
  }
  
  // DPS 균등 분배
  const dpsSlots = [];
  state.raidParties.forEach((party, partyIndex) => {
    for (let slotIndex = 1; slotIndex < party.members.length; slotIndex++) {
      // 이미 캐릭터가 배치되어 있으면 건너뛰기
      if (!party.members[slotIndex]) {
        dpsSlots.push({ partyIndex, slotIndex, party: party });
      } else {
        console.log(`ℹ️ [BALANCED ASSIGN] Party ${partyIndex + 1} Slot ${slotIndex} already has: ${party.members[slotIndex].name}`);
      }
    }
  });
  
  let dpsRound = 0;
  let dpsAssigned = 0;
  
  while (dpsAssigned < dpsSlots.length && dpsRound < 100) { // 무한 루프 방지
    let roundAssigned = false;
    
    expeditionIndices.forEach(expIndex => {
      if (dpsAssigned >= dpsSlots.length) return;
      
      const expedition = expeditionGroups[expIndex];
      const dpsChars = expedition.filter(char => char.role === 'dps');
      
      if (dpsChars.length > 0) {
        const dps = dpsChars[0]; // 가장 전투력 높은 DPS
        
        // 이 DPS가 이미 3개 공격대에 배치되었는지 확인
        let raidCount = 0;
        state.raidParties.forEach(p => {
          if (p.members.some(m => m && m.id === dps.id)) {
            raidCount++;
          }
        });
        
        if (raidCount < 3) {
          const targetSlot = dpsSlots[dpsAssigned];
          targetSlot.party.members[targetSlot.slotIndex] = dps;
          console.log(`✅ [DPS] ${dps.name} → Party ${targetSlot.partyIndex + 1}`);
          dpsAssigned++;
          roundAssigned = true;
          
          // 배치된 DPS는 원정대 목록에서 제거
          const charIndex = expedition.findIndex(c => c.id === dps.id);
          if (charIndex !== -1) {
            expedition.splice(charIndex, 1);
          }
        }
      }
    });
    
    if (!roundAssigned) break;
    dpsRound++;
  }
  
  renderRaidParties();
  renderExpedition();
  
  // 결과 요약
  const totalAssigned = state.raidParties.reduce((sum, party) => 
    sum + party.members.filter(m => m !== null).length, 0);
  
  alert(`균등 분배 완료!\n총 ${totalAssigned}명의 캐릭터가 배치되었습니다.\n(기존 배치된 캐릭터 유지, 빈 슬롯만 균등 분배)`);
}

// 페이지 로드 시 저장된 데이터 확인 및 초기화
window.addEventListener('load', function() {
  const savedData = localStorage.getItem('lostArkRaidData');
  let shouldAutoLoad = false;
  
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      const saveTime = new Date(data.saveTime).toLocaleString('ko-KR');
      
      if (confirm(`저장된 데이터가 있습니다.\n저장 시간: ${saveTime}\n\n불러오시겠습니까?`)) {
        // 데이터 복원
        state.raidParties = data.raidParties || [];
        state.expeditionSlots = data.expeditionSlots || Array.from({length:8}, () => []);
        state.raidPartyCounter = data.raidPartyCounter || 0;
        shouldAutoLoad = true;
        console.log('📂 [AUTO LOAD] 저장된 데이터가 자동으로 불러와졌습니다.');
      }
    } catch (error) {
      console.error('❌ [AUTO LOAD ERROR]:', error);
    }
  }
  
  // 자동 불러오기하지 않은 경우에만 초기화 실행
  if (!shouldAutoLoad) {
    renderExpedition();
    initializeRaids(); // 초기 공격대 파티 생성
  } else {
    // 자동 불러오기한 경우 UI만 업데이트
    renderRaidParties();
    renderExpedition();
  }
});

document.body.addEventListener('drop', function(e) {
  try {
    console.log(`🎯 [BODY DROP START]`);
    e.preventDefault();
    e.stopPropagation();
    
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    console.log(`📊 [BODY DROP DATA] Received:`, { name: data.name, id: data.id, fromRaid: data.fromRaid });
    
    // 공격대에서 온 캐릭터인 경우 제거
    if (data.fromRaid) {
      console.log(`🗑️ [BODY DROP] Removing raid character: ${data.name} from Party ${data.partyId}, Slot ${data.slotIndex}`);
      removeCharacterFromRaid(data.partyId, data.slotIndex);
      return true;
    }
    
    // 원정대 캐릭터가 빈 공간에 드롭된 경우 - 첫 번째 빈 슬롯에 추가
    if (!data.fromRaid) {
      console.log(`🎯 [BODY DROP] Expedition character dropped in empty space, finding first available slot`);
      
      // 모든 공격대 파티의 빈 슬롯 찾기
      for (let party of state.raidParties) {
        for (let i = 0; i < party.members.length; i++) {
          if (!party.members[i]) {
            console.log(`✅ [AUTO ASSIGN] Adding ${data.name} to Party ${party.id}, Slot ${i}`);
            
            // 유효성 검사
            const currentSupports = party.members.filter(m => m?.role === 'support').length;
            if (data.role === 'support' && currentSupports >= 1) {
              console.log(`❌ [AUTO ASSIGN ERROR] Support limit reached for Party ${party.id}`);
              continue;
            }
            
            party.members[i] = data;
            renderRaidParties();
            renderExpedition(); // 원정대 UI도 업데이트하여 공격대 배치 갯수 표시
            console.log(`✅ [AUTO ASSIGN COMPLETE] ${data.name} added to Party ${party.id}, Slot ${i}`);
            return true;
          }
        }
      }
      
      console.log(`❌ [AUTO ASSIGN ERROR] No available slots found`);
      alert('모든 공격대 슬롯이 가득 찼습니다.');
    }
    
  } catch (error) {
    // 유효한 드래그 데이터가 아닌 경우 무시
    console.log(`ℹ️ [BODY DROP] No valid data:`, error.message);
  }
});

// 디버깅 도구 초기화만 남기고 상세 로그 제거
window.debugRaidSystem = {
  getState: () => state,
  renderDebug: () => {
    renderRaidParties();
    renderExpedition();
  }
};

// 페이지 로드 시 초기화 (저장된 데이터가 없는 경우에만)
if (!localStorage.getItem('lostArkRaidData')) {
  renderExpedition();
  initializeRaids(); // 초기 공격대 파티 생성
}