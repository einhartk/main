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
  if (!container) {
    console.error('❌ [RENDER] raidParties 컨테이너를 찾을 수 없음');
    return;
  }

  // 전체 컨테이너를 비우고 다시 렌더링 (중복 방지)
  container.innerHTML = '';

  const parties = getCurrentTabParties();

  parties.forEach((party) => {
    const partyDiv = document.createElement('div');
    partyDiv.className = 'col-md-6';
    container.appendChild(partyDiv);

    // 원정대에서 상세 정보를 가져와서 계산 (이름 또는 id로 조회)
    const validMembers = party.members.filter(m => m !== null);
    const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name || m.id)).filter(m => m !== null);
    const avgCombatPower = validMembersWithDetails.length > 0
      ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
      : 0;
    // 서폿 수: 원정대 상세에서 role 확인 (이름으로 조회한 원정대 데이터 기준)
    const supportCount = validMembersWithDetails.filter(m => m && String(m.role || '').toLowerCase() === 'support').length;
    const maxSupports = party.size === 8 ? 2 : (party.maxSupports ?? 1); // 4인 1명, 8인 2명
    const supportBadge = supportCount > maxSupports ? 'bg-danger' : 'bg-secondary';

    partyDiv.innerHTML = `
      <div class="card shadow-sm party-card">
        <div class="card-header" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #2c3e50; border-bottom: 1px solid #dee2e6; padding: 15px;">
          <div class="row align-items-center">
            <div class="col-md-8">
              <div class="d-flex align-items-center gap-3">
                <div class="input-group" style="width: 350px; font-size: 0.85rem;">
                  <span class="input-group-text" style="background: white; color: #2c3e50; border: 1px solid #ced4da; font-size: 0.85rem;">
                    <i class="bi bi-people-fill"></i>
                  </span>
                  <input type="text" class="form-control" id="raidName-${party.id}" 
                         value="${party.name || `${party.raidName} ${party.difficultyName} ${party.displayName || party.id}`}" 
                         placeholder="파티 이름" 
                         onchange="updateRaidName('${party.id}', this.value)"
                         onblur="updateRaidName('${party.id}', this.value)">
                  <button class="btn btn-outline-secondary" type="button" onclick="this.previousElementSibling.focus()" style="font-size: 0.85rem;">
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
                ${party.scheduledWeekday && party.scheduledHour ? `
                  <div class="badge bg-info text-white" style="font-size: 0.75rem; padding: 4px 8px;">
                    <i class="bi bi-clock-fill me-1"></i>${getWeekdayName(party.scheduledWeekday)} ${party.scheduledHour}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="col-md-2">
              <div class="d-flex align-items-center justify-content-end">
                <button class="btn btn-sm btn-outline-danger" onclick="removeRaid('${party.id}')" style="padding: 6px 10px; font-size: 0.85rem;">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="row align-items-center mt-2">
            <!-- 왼쪽: 전투력 정보 -->
            <div class="col-md-3">
              <div class="d-flex align-items-center">
                <span class="badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: #000000; font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; font-weight: 700;">
                  <i class="bi bi-lightning-fill me-1"></i>
                  <span class="fw-bold">평균 CP</span> ${avgCombatPower.toLocaleString()}
                </span>
              </div>
            </div>
            
            <!-- 중앙: 서폿 정보 -->
            <div class="col-md-3">
              <div class="d-flex align-items-center justify-content-center">
                <span id="support-${party.id}" class="badge ${supportBadge === 'bg-success' ? 'bg-success' : 'bg-warning'} text-white" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; font-weight: 600;">
                  <i class="bi bi-shield-fill me-1"></i>
                  <span class="fw-bold">서폿</span> ${supportCount}/${maxSupports}
                </span>
              </div>
            </div>
            
            <!-- 오른쪽: 컨트롤 버튼 그룹 -->
            <div class="col-md-6">
              <div class="d-flex align-items-center justify-content-end gap-3">
                <!-- 클리어 상태 -->
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="cleared-${party.id}" 
                         ${party.cleared === true ? 'checked' : ''} 
                         onchange="toggleRaidClear('${party.id}', this.checked)"
                         style="cursor: pointer;">
                  <label class="form-check-label d-flex align-items-center" for="cleared-${party.id}" 
                         style="font-size: 0.8rem; color: ${party.cleared === true ? '#28a745' : '#6c757d'}; cursor: pointer; font-weight: 500; margin-left: 8px;">
                    <i class="bi ${party.cleared === true ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'} me-2"></i>
                    <span class="${party.cleared === true ? 'text-success' : 'text-secondary'}">클리어</span>
                  </label>
                </div>
                
                <!-- 구분선 -->
                <div class="border-start" style="height: 20px; border-color: #dee2e6;"></div>
                
                <!-- 파티 크기 선택 -->
                <div class="btn-group btn-group-sm" role="group" style="box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 4)">
                  <label class="btn ${party.size === 4 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size4-${party.id}" style="font-size: 0.75rem; padding: 4px 8px; font-weight: 500; border-top-left-radius: 6px !important; border-bottom-left-radius: 6px !important;">
                    <i class="bi bi-people-fill me-1"></i>4인
                  </label>
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 8)">
                  <label class="btn ${party.size === 8 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size8-${party.id}" style="font-size: 0.75rem; padding: 4px 8px; font-weight: 500; border-top-right-radius: 6px !important; border-bottom-right-radius: 6px !important;">
                    <i class="bi bi-people-fill me-1"></i>8인
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
                <!-- 약속 시간 설정 -->
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">
                    <i class="bi bi-clock"></i> 약속 시간
                  </span>
                  <select class="form-select" id="scheduledWeekday-${party.id}" 
                          onchange="updateRaidScheduledTime('${party.id}', this.value, document.getElementById('scheduledHour-${party.id}').value)">
                    <option value="">요일 선택</option>
                    <option value="monday" ${party.scheduledWeekday === 'monday' ? 'selected' : ''}>월요일</option>
                    <option value="tuesday" ${party.scheduledWeekday === 'tuesday' ? 'selected' : ''}>화요일</option>
                    <option value="wednesday" ${party.scheduledWeekday === 'wednesday' ? 'selected' : ''}>수요일</option>
                    <option value="thursday" ${party.scheduledWeekday === 'thursday' ? 'selected' : ''}>목요일</option>
                    <option value="friday" ${party.scheduledWeekday === 'friday' ? 'selected' : ''}>금요일</option>
                    <option value="saturday" ${party.scheduledWeekday === 'saturday' ? 'selected' : ''}>토요일</option>
                    <option value="sunday" ${party.scheduledWeekday === 'sunday' ? 'selected' : ''}>일요일</option>
                  </select>
                  <input type="time" class="form-control" id="scheduledHour-${party.id}" 
                         value="${party.scheduledHour || ''}" 
                         onchange="updateRaidScheduledTime('${party.id}', document.getElementById('scheduledWeekday-${party.id}').value, this.value)">
                  <button class="btn btn-outline-secondary" type="button" onclick="clearRaidScheduledTime('${party.id}')" title="시간 초기화">
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">최소 레벨</span>
                  <input type="number" class="form-control" id="minIlvl-${party.id}" 
                         value="${party.minIlvl || 0}" 
                         placeholder="0" 
                         min="0" 
                         step="10"
                         onchange="updateRaidRequirements('${party.id}', 'minIlvl', this.value)"
                         onblur="updateRaidRequirements('${party.id}', 'minIlvl', this.value)">
                  <span class="input-group-text">Lv</span>
                </div>
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">최소 전투력</span>
                  <input type="number" class="form-control" id="minCombatPower-${party.id}" 
                         value="${party.minCombatPower || 0}" 
                         placeholder="0" 
                         min="0" 
                         style="width: 100px;"
                         onchange="updateRaidRequirements('${party.id}', 'minCombatPower', this.value)"
                         onblur="updateRaidRequirements('${party.id}', 'minCombatPower', this.value)">
                  <span class="input-group-text">CP</span>
                </div>
              </div>
            </div>
          </div>

          <div class="raid-slots-grid ${party.size === 8 ? 'raid-slots-grid-8' : ''}">
            ${party.members.map((char, slotIndex) => {
              const partyNumber = party.size === 8 ? Math.floor(slotIndex / 4) + 1 : 1;
              const isFirstInParty = slotIndex % 4 === 0;
              
              // 원정대에서 캐릭터 상세 정보 조회
              const charDetails = char ? getCharacterDetailsFromExpedition(char.name) : null;
              
              return `
              <div class="raid-slot-wrapper" data-party="${party.id}" data-slot="${slotIndex}">
                ${isFirstInParty && party.size === 8 ? `<div class="party-label">파티 ${partyNumber}</div>` : ''}
                <div class="raid-slot" ondrop="handleDrop(event, '${party.id}', ${slotIndex})" ondragover="handleDragOver" ondragleave="handleDragLeave" onclick="event.stopPropagation(); openRaidCharacterSelector('${party.id}', ${slotIndex})" style="cursor: pointer;" title="클릭하여 캐릭터 선택">
                  ${charDetails ? `
                    <div class="char-box ${charDetails.role} ${!meetsRequirements(charDetails, party) ? 'requirement-failed' : ''}" draggable="true" ondragstart="handleDragStart(event, '${charDetails.id}', '${party.id}', ${slotIndex})" ondragend="handleDragEnd(event)" onclick="event.stopPropagation(); openRaidCharacterSelector('${party.id}', ${slotIndex})" oncontextmenu="handleRightClick(event, '${charDetails.id}', '${party.id}', ${slotIndex}, null, null)" style="cursor: pointer;" title="좌클릭: 캐릭터 변경, 우클릭: 삭제">
                      <img src="${charDetails.image || 'img/default-character.png'}" alt="${charDetails.name}" style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 5px; display: block; margin-left: auto; margin-right: auto;">
                      <div class="fw-bold small">${charDetails.name}</div>
                      <div class="small text-muted">Lv ${charDetails.ilvl || '0'}</div>
                      <div class="small text-muted">CP ${(charDetails.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                      <div class="badge ${charDetails.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1" style="font-size: 0.7rem;">${charDetails.role === 'support' ? '서폿' : '딜러'} (${charDetails.className || '알 수 없음'})</div>
                      ${!meetsRequirements(charDetails, party) ? '<div class="badge bg-danger mt-1" style="font-size: 0.65rem;">조건미달</div>' : ''}
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

// 🔥 **핵심 수정: 전역 함수로 노출**
window.renderRaidParties = renderRaidParties;
window.getCharacterDetailsFromExpedition = getCharacterDetailsFromExpedition;
window.getWeekdayName = getWeekdayName;

// 요일 이름 반환 함수
function getWeekdayName(weekday) {
  const weekdays = {
    'monday': '월요일',
    'tuesday': '화요일', 
    'wednesday': '수요일',
    'thursday': '목요일',
    'friday': '금요일',
    'saturday': '토요일',
    'sunday': '일요일'
  };
  return weekdays[weekday] || weekday;
}

// 원정대에서 캐릭터 상세 정보 조회 (캐릭터 이름으로 조회, 원정대에 저장된 데이터 반환)
function getCharacterDetailsFromExpedition(characterNameOrId) {
  if (characterNameOrId == null || characterNameOrId === '') return null;
  const slots = state && state.expeditionSlots;
  if (!Array.isArray(slots)) return null;
  const key = String(characterNameOrId).trim();
  if (!key) return null;
  for (const slot of slots) {
    if (!Array.isArray(slot)) continue;
    const character = slot.find(char => {
      if (!char) return false;
      const n = (char.name || char.CharacterName || '').toString().trim();
      const id = (char.id || '').toString().trim();
      return n === key || id === key || n === characterNameOrId || id === characterNameOrId;
    });
    if (character) return character;
  }
  return null;
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
  if (event.currentTarget && event.currentTarget.classList) {
    event.currentTarget.classList.remove('dragover');
  }
}

// 원정대 렌더링 (사이드 패널용 - 공격대 제작 전용)
function renderExpedition() {
  const container = document.getElementById('expeditionPanel');
  if (!container) return;
  
  // 원정대 관리 모달이 열려있으면 모달 내용도 업데이트
  const expeditionModal = document.getElementById('expeditionModal');
  if (expeditionModal && expeditionModal.classList.contains('show')) {
    renderExpeditionModal();
  }

  
  container.innerHTML = '';

  state.expeditionSlots.forEach((slot, index) => {
    
    const slotDiv = document.createElement('div');
    slotDiv.className = 'col-12 col-md-6 col-lg-3'; 

    const slotClass = slot.length > 0 ? 'expedition-slot-filled' : 'expedition-slot-empty';

    slotDiv.innerHTML = `
      <div class="expedition-slot ${slotClass}" ondrop="handleExpeditionDrop(event, ${index})" ondragover="handleDragOver" ondragleave="handleDragLeave" style="cursor: default; min-height: 100px;">
        <h6 class="text-center mb-1" style="font-size: 0.75rem;">
          <span onclick="event.stopPropagation(); renameExpeditionSlot(${index})" style="cursor: pointer; text-decoration: underline;" title="클릭하여 이름 변경">
            ${state.expeditionSlotNames[index]} 
          </span>
          ${slot.length > 0 ? `<small class="text-success">(${slot.length})</small>` : '<small class="text-muted">(비어있음)</small>'}
        </h6>
        <div class="expedition-slots">
          ${slot.length > 0 ? slot.map((char, charIndex) => {
            // 상세 정보 조회 (원정대 데이터)
            const charDetails = getCharacterDetailsFromExpedition(char.name);
            const role = charDetails?.role || 'dps';
            return `
            <div class="expedition-char ${role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" style="cursor: grab; font-size: 0.8rem;" title="드래그하여 공격대로 이동">
              <div class="d-flex align-items-center">
                <img src="${charDetails?.image || 'img/default-character.png'}" alt="${char.name}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 6px; flex-shrink: 0;">
                <div class="flex-grow-1">
                  <div class="fw-bold" style="font-size: 0.7rem; line-height: 1.2; color: #2c3e50;">${char.name.length > 7 ? char.name.substring(0, 7) + '..' : char.name}</div>
                  <div class="small text-warning" style="font-size: 0.6rem; font-weight: 600;">Lv${charDetails?.ilvl || '0'}</div>
                  <div class="small text-primary" style="font-size: 0.55rem; font-weight: 500;">${(charDetails?.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
                </div>
              </div>
              <div class="badge bg-secondary" style="font-size: 0.35rem; position: absolute; top: 2px; right: 2px; z-index: 10; padding: 2px 4px;">${Constraints.getCharacterUsageCount(char.name)}/3</div>
            </div>
          `;
          }).join('') : '<div class="text-muted text-center p-1" style="font-size: 0.6rem;">빈 슬롯</div>'}
        </div>
      </div>
    `;

    container.appendChild(slotDiv);
  });
  
  }

// 🔥 **핵심 수정: 전역 함수로 노출**
window.renderExpedition = renderExpedition;

// 원정대 모달 렌더링 (조회/수정용)
function renderExpeditionModal() {
  const container = document.getElementById('expedition');
  if (!container) return;

  
  container.innerHTML = '';

  state.expeditionSlots.forEach((slot, index) => {
    
    const slotDiv = document.createElement('div');
    slotDiv.className = 'col-md-3';

    const slotClass = slot.length > 0 ? 'expedition-slot-filled' : 'expedition-slot-empty';

    slotDiv.innerHTML = `
      <div class="expedition-slot ${slotClass}" onclick="openCharacterSearchModal(${index})" ondrop="handleExpeditionDrop(event, ${index})" ondragover="handleDragOver" ondragleave="handleDragLeave" style="cursor: pointer;">
        <h6 class="text-center mb-2">
          <span onclick="event.stopPropagation(); renameExpeditionSlot(${index})" style="cursor: pointer; text-decoration: underline;" title="클릭하여 이름 변경">
            ${state.expeditionSlotNames[index]} 
          </span>
          ${slot.length > 0 ? `<small class="text-success">(${slot.length}명)</small>` : '<small class="text-muted">(클릭하여 원정대 추가, 드래하여 공격대로 이동)</small>'}
        </h6>
        <div class="expedition-slots">
          ${slot.length > 0 ? slot.map((char, charIndex) => `
            <div class="expedition-char ${char.role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" ondrop="handleExpeditionCharacterDrop(event, ${index}, ${charIndex})" ondragover="handleDragOver" ondragleave="handleDragLeave" onclick="event.stopPropagation(); editCharacter(${index}, ${charIndex})" oncontextmenu="handleRightClick(event, '${char.id}', null, null, ${index}, ${charIndex})" style="cursor: pointer;" title="좌클릭: 수정, 우클릭: 삭제, 드래그: 공격대로 이동">
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
  
  }

// 🔥 **핵심 수정: 전역 함수로 노출**
window.renderExpeditionModal = renderExpeditionModal;

// 서포터 수 업데이트
function updateSupportCount() {
  const parties = getCurrentTabParties();
  parties.forEach(party => {
    // 🔥 **핵심 수정: 원정대 데이터에서 최신 role 정보 조회**
    const count = party.members.filter(m => {
      if (!m) return false;
      // 파티 멤버의 role이 없거나 undefined면 원정대에서 조회
      if (m.role === 'support') return true;
      if (m.role === 'dps') return false;
      // role 정보가 없으면 원정대에서 조회
      const charFromExpedition = findCharacterByIdFromExpedition(m.name);
      return charFromExpedition?.role === 'support';
    }).length;
    const maxSupports = party.size === 8 ? 2 : (party.maxSupports ?? 1);
    const badge = document.getElementById(`support-${party.id}`);
    if (badge) {
      badge.className = count > maxSupports ? "badge bg-danger text-white" : "badge bg-success text-white";
      badge.innerHTML = `<i class="bi bi-shield-fill me-1"></i>서폿 ${count}/${maxSupports}`;
    }
  });
}
