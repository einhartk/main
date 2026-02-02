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

  // 전체 컨테이너를 비우고 다시 렌더링 (중복 방지)
  container.innerHTML = '';

  const parties = getCurrentTabParties();

  parties.forEach((party) => {
    const partyDiv = document.createElement('div');
    partyDiv.className = 'col-md-6';
    container.appendChild(partyDiv);

    // 원정대에서 상세 정보를 가져와서 계산
    const validMembers = party.members.filter(m => m !== null);
    const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name)).filter(m => m !== null);
    
    const avgCombatPower = validMembersWithDetails.length > 0
      ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)
      : 0;

    const supportCount = validMembersWithDetails.filter(m => m?.role === 'support').length;
    const supportBadge = supportCount > party.maxSupports ? 'bg-danger' : 'bg-secondary';

    partyDiv.innerHTML = `
      <div class="card shadow-sm party-card">
        <div class="card-header" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); color: #2c3e50; border-bottom: 1px solid #dee2e6; padding: 15px;">
          <div class="row align-items-center mb-3">
            <div class="col-md-10">
              <div class="d-flex align-items-center gap-3">
                <div class="input-group" style="width: 350px; font-size: 0.85rem;">
                  <span class="input-group-text" style="background: white; color: #2c3e50; border: 1px solid #ced4da; font-size: 0.85rem;">
                    <i class="bi bi-people-fill"></i>
                  </span>
                  <input type="text" class="form-control" id="raidName-${party.id}" 
                         value="${party.name || `${party.raidName} ${party.difficultyName} ${party.displayName || party.id}`}" 
                         placeholder="파티 이름" 
                         oninput="updateRaidName('${party.id}', this.value)"
                         onchange="updateRaidName('${party.id}', this.value)">
                  <button class="btn btn-outline-secondary" type="button" onclick="this.previousElementSibling.focus()" style="font-size: 0.85rem;">
                    <i class="bi bi-pencil"></i>
                  </button>
                </div>
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
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 4)">
                  <label class="btn ${party.size === 4 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size4-${party.id}" style="font-size: 0.8rem;">
                    4인
                  </label>
                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 8)">
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
                         step="10"
                         onchange="updateRaidRequirements('${party.id}', 'minIlvl', this.value)">
                  <span class="input-group-text">Lv</span>
                </div>
                <div class="input-group input-group-sm" style="flex: 0 0 auto;">
                  <span class="input-group-text">최소 전투력</span>
                  <input type="number" class="form-control" id="minCombatPower-${party.id}" 
                         value="${party.minCombatPower || 0}" 
                         placeholder="0" 
                         min="0" 
                         style="width: 100px;"
                         oninput="updateRaidRequirements('${party.id}', 'minCombatPower', this.value)">
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
                    <div class="char-box ${charDetails.role} ${!meetsRequirements(charDetails, party) ? 'requirement-failed' : ''}" draggable="true" ondragstart="handleDragStart(event, '${charDetails.id}', '${party.id}', ${slotIndex})" ondragend="handleDragEnd(event)" onclick="event.stopPropagation(); handleCharacterClick(event, '${charDetails.id}', '${party.id}', ${slotIndex})" style="cursor: pointer;" title="클릭하여 캐릭터 변경, 더블클릭하여 삭제">
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

// 원정대에서 캐릭터 상세 정보 조회
function getCharacterDetailsFromExpedition(characterName) {
  if (!characterName) return null;
  
  // 모든 원정대 슬롯에서 캐릭터 검색
  for (const slot of state.expeditionSlots) {
    const character = slot.find(char => char.name === characterName);
    if (character) {
      return character;
    }
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

  
  container.innerHTML = '';

  state.expeditionSlots.forEach((slot, index) => {
    
    const slotDiv = document.createElement('div');
    slotDiv.className = 'col-12 col-md-6 col-lg-3'; 

    const slotClass = slot.length > 0 ? 'expedition-slot-filled' : 'expedition-slot-empty';

    slotDiv.innerHTML = `
      <div class="expedition-slot ${slotClass}" ondrop="handleExpeditionDrop(event, ${index})" ondragover="handleDragOver" ondragleave="handleDragLeave" style="cursor: default; min-height: 100px;">
        <h6 class="text-center mb-1" style="font-size: 0.75rem;">
          슬롯 ${index + 1} 
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
          슬롯 ${index + 1} 
          ${slot.length > 0 ? `<small class="text-success">(${slot.length}명)</small>` : '<small class="text-muted">(클릭하여 원정대 추가, 드래하여 공격대로 이동)</small>'}
        </h6>
        <div class="expedition-slots">
          ${slot.length > 0 ? slot.map((char, charIndex) => `
            <div class="expedition-char ${char.role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" onclick="event.stopPropagation(); editCharacter(${index}, ${charIndex})" style="cursor: pointer;" title="클릭하여 수정, 드래그하여 공격대로 이동">
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

// 서포터 수 업데이트
function updateSupportCount() {
  const parties = getCurrentTabParties();
  parties.forEach(party => {
    const count = party.members.filter(m => m?.role === "support").length;
    const badge = document.getElementById(`support-${party.uniqueId}`);
    if (badge) {
      badge.className = count > party.maxSupports ? "badge bg-danger text-white" : "badge bg-success text-white";
      badge.textContent = `서폿 ${count}/${party.maxSupports}`;
    }
  });
}
