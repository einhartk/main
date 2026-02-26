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



// 🔥 성능 최적화: 디바운스 헬퍼 함수

function debounce(func, wait) {

  let timeout;

  return function executedFunction(...args) {

    const later = () => {

      clearTimeout(timeout);

      func(...args);

    };

    clearTimeout(timeout);

    timeout = setTimeout(later, wait);

  };

}



// 파티 드래그 앤 드롭 관련 전역 변수

let draggedPartyElement = null;

let draggedPartyData = null;



// 드래그 리프 이벤트 핸들러

function handleDragLeave(event) {

  if (event.currentTarget && event.currentTarget.classList) {

    event.currentTarget.classList.remove('drag-over');

  }

}



// 전체 클리어/해제 토글 함수

function toggleAllRaidClear(setCleared) {

  const parties = getCurrentTabParties();

  const changedParties = [];

  

  parties.forEach(party => {

    if (party.cleared !== setCleared) {

      party.cleared = setCleared;

      changedParties.push(party);

    }

  });

  

  if (changedParties.length > 0) {

    // 히스토리 기록

    if (typeof recordHistory === 'function') {

      recordHistory(

        'bulk_update',

        {

          type: 'bulk_raid_clear',

          path: 'raidTabs'

        },

        changedParties.map(p => ({ id: p.id, cleared: !setCleared })),

        changedParties.map(p => ({ id: p.id, cleared: setCleared })),

        `전체 공격대 클리어 상태 변경: ${setCleared ? '클리어' : '해제'} (${changedParties.length}개 파티)`

      );

    }

    

    // UI 업데이트

    renderRaidParties();

    renderExpedition();

    

    // 저장

    scheduleAutoSave();

    

    // 완료 알림

    window.modalManager.showAlert({

      title: '일괄 변경 완료',

      message: `${changedParties.length}개 공격대를 ${setCleared ? '클리어' : '해제'}했습니다.`

    });

  }

}



// 공격대 파티 렌더링 - 즉시 렌더링으로 변경 (사용자 경험 향상)

function renderRaidParties(forceRender = false) {

  renderRaidPartiesInternal(forceRender);

}



// 🔥 내부 렌더링 함수 (기존 로직 그대로 유지)

function renderRaidPartiesInternal(forceRender = false) {

  const container = document.getElementById('raidParties');

  if (!container) {

    console.error('❌ [RENDER] raidParties 컨테이너를 찾을 수 없음');

    return;

  }



  // 전체 컨테이너를 비우고 다시 렌더링 (중복 방지)

  container.innerHTML = '';



  const parties = getCurrentTabParties();

  

  // 순서(order) 기준으로 정렬, 클리어 안된 파티 우선

  const sortedParties = parties.sort((a, b) => {

    // 클리어 상태 우선 정렬 (클리어 안된 파티가 먼저)

    if (a.cleared !== b.cleared) {

      return a.cleared ? 1 : -1;

    }

    

    // 클리어 상태가 같으면 순번으로 정렬

    const orderA = a.order !== undefined ? a.order : 999;

    const orderB = b.order !== undefined ? b.order : 999;

    return orderA - orderB;

  });



  // 클리어 상태 통계 계산

  const clearedCount = sortedParties.filter(p => p.cleared).length;

  const unclearedCount = sortedParties.length - clearedCount;



  // 상단에 클리어 상태 요약 정보 추가

  const summaryDiv = document.createElement('div');

  summaryDiv.className = 'row mb-3';

  summaryDiv.innerHTML = `

    <div class="col-12">

      <div class="d-flex justify-content-between align-items-center p-3 rounded raid-summary" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 1px solid #dee2e6;">

        <div class="d-flex align-items-center">

          <i class="bi bi-clipboard-check me-2" style="font-size: 1.2rem; color: #28a745;"></i>

          <span class="fw-bold" style="color: #495057;">공격대 현황</span>

        </div>

        <div class="d-flex gap-4">

          <div class="text-center">

            <div class="badge bg-success text-white px-3 py-2" style="font-size: 0.9rem;">

              <i class="bi bi-check-circle-fill me-1"></i>

              <span class="fw-bold">${clearedCount}</span>

            </div>

            <div class="small text-muted mt-1">클리어</div>

          </div>

          <div class="text-center">

            <div class="badge bg-warning text-white px-3 py-2" style="font-size: 0.9rem;">

              <i class="bi bi-clock-fill me-1"></i>

              <span class="fw-bold">${unclearedCount}</span>

            </div>

            <div class="small text-muted mt-1">미클리어</div>

          </div>

          <div class="d-flex gap-2">

            <button class="btn btn-sm btn-success" onclick="toggleAllRaidClear(true)" style="font-size: 0.8rem;">

              <i class="bi bi-check-all me-1"></i>전체 클리어

            </button>

            <button class="btn btn-sm btn-secondary" onclick="toggleAllRaidClear(false)" style="font-size: 0.8rem;">

              <i class="bi bi-x-circle me-1"></i>전체 해제

            </button>

          </div>

        </div>

      </div>

    </div>

  `;

  container.appendChild(summaryDiv);



  // 파티 카드들을 담을 컨테이너

  const partiesContainer = document.createElement('div');

  partiesContainer.className = 'row';

  

  sortedParties.forEach((party, index) => {

    const partyDiv = document.createElement('div');

    partyDiv.className = 'col-md-6';

    partyDiv.setAttribute('data-party-id', party.id);

    partyDiv.setAttribute('data-party-order', party.order || index + 1);

    

    // 클리어된 파티는 반투명 처리 및 드래그 비활성화

    if (party.cleared) {

      partyDiv.classList.add('cleared-party');

      partyDiv.draggable = false; // 클리어된 파티는 드래그 불가

    } else {

      partyDiv.draggable = true; // 클리어 안된 파티만 드래그 가능

    }

    

    // 드래그 앤 드롭 이벤트 리스너 추가 (클리어 안된 파티만)

    // 이벤트 위임 방식으로 변경하여 메모리 누수 방지

    if (!party.cleared) {

      partyDiv.setAttribute('data-draggable', 'true');

      partyDiv.setAttribute('data-party-id', party.id);

    }

    

    partiesContainer.appendChild(partyDiv);



    // 원정대에서 상세 정보를 가져와서 계산 (이름 또는 id로 조회)

    const validMembers = party.members.filter(m => m !== null);

    const validMembersWithDetails = validMembers.map(m => getCharacterDetailsFromExpedition(m.name || m.id)).filter(m => m !== null);

    const avgCombatPower = validMembersWithDetails.length > 0

      ? Math.round(validMembersWithDetails.reduce((sum, m) => sum + parseCompareNumber(m.combatPower || '0'), 0) / validMembersWithDetails.length)

      : 0;

    const avgDPS = calculateRaidPartyAverageDPS(party);

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

                  <input type="text" class="form-control" id="raidName-${party.id}-${index}" 

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

            <div class="col-md-4">

              <div class="d-flex align-items-center justify-content-end gap-1">

                <!-- 스케줄 순서 입력 -->

                <div class="d-flex align-items-center" style="width: 85px;">

                  <span class="input-group-text input-group-text-sm" style="font-size: 0.65rem; padding: 2px 4px; border-radius: 4px 0 0 4px; border-right: none; background: #f8f9fa; display: flex; align-items: center; justify-content: center; height: 28px; min-width: 30px;">순서</span>

                  <input type="number" 

                         class="form-control form-control-sm text-center" 

                         id="partyOrder-${party.id}-${index}"

                         value="${party.order || index + 1}" 

                         min="1" 

                         max="99"

                         style="font-size: 0.75rem; padding: 2px 3px; height: 28px; border-radius: 0 4px 4px 0; border-left: none; min-width: 35px;"

                         onchange="updatePartyOrder('${party.id}', this.value)"

                         onblur="updatePartyOrder('${party.id}', this.value)"

                         title="스케줄 순서 설정 (1-99)">

                </div>

                <!-- 삭제 버튼 -->

                <button class="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center" onclick="removeRaid('${party.id}')" style="width: 32px; height: 28px; padding: 0; font-size: 0.85rem;" title="파티 삭제">

                  <i class="bi bi-x-lg"></i>

                </button>

              </div>

            </div>

          </div>



          <div class="row align-items-center mt-2">

            <!-- 왼쪽: 전투력 및 서폿 정보 -->

            <div class="col-md-6">

              <div class="d-flex align-items-center gap-1">

                <span class="badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; color: #000000; font-size: 0.65rem; padding: 4px 8px; border-radius: 15px; font-weight: 600; white-space: nowrap;">

                  <i class="bi bi-lightning-fill me-1"></i>

                  <span class="fw-bold">CP</span> ${avgCombatPower.toLocaleString()}

                </span>

                ${avgDPS > 0 ? `
                
                <span class="badge bg-success text-white" style="font-size: 0.6rem; padding: 3px 6px; border-radius: 12px; font-weight: 600; white-space: nowrap;">

                  <i class="bi bi-graph-up me-1"></i>

                  <span class="fw-bold">DPS</span> ${avgDPS.toFixed(1)}억

                </span>

                ` : ''}

                <span id="support-${party.id}-${index}" class="badge ${supportBadge === 'bg-success' ? 'bg-success' : 'bg-warning'} text-white" style="font-size: 0.65rem; padding: 4px 8px; border-radius: 15px; font-weight: 600; white-space: nowrap;">

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

                  <input class="form-check-input" type="checkbox" id="cleared-${party.id}-${index}" 

                         ${party.cleared === true ? 'checked' : ''} 

                         onchange="toggleRaidClear('${party.id}', this.checked)"

                         style="cursor: pointer;">

                  <label class="form-check-label d-flex align-items-center" for="cleared-${party.id}-${index}" 

                         style="font-size: 0.8rem; color: ${party.cleared === true ? '#28a745' : '#6c757d'}; cursor: pointer; font-weight: 500; margin-left: 8px;">

                    <i class="bi ${party.cleared === true ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'} me-2"></i>

                    <span class="${party.cleared === true ? 'text-success' : 'text-secondary'}">클리어</span>

                  </label>

                </div>

                

                <!-- 구분선 -->

                <div class="border-start" style="height: 20px; border-color: #dee2e6;"></div>

                

                <!-- 파티 크기 선택 -->

                <div class="btn-group btn-group-sm" role="group" style="box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size4-${party.id}-${index}" value="4" ${party.size === 4 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 4)">

                  <label class="btn ${party.size === 4 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size4-${party.id}-${index}" style="font-size: 0.75rem; padding: 4px 8px; font-weight: 500; border-top-left-radius: 6px !important; border-bottom-left-radius: 6px !important;">

                    <i class="bi bi-people-fill me-1"></i>4인

                  </label>

                  <input type="radio" class="btn-check" name="partySize-${party.id}" id="size8-${party.id}-${index}" value="8" ${party.size === 8 ? 'checked' : ''} onchange="setRaidSize('${party.id}', 8)">

                  <label class="btn ${party.size === 8 ? 'btn-primary' : 'btn-outline-primary'} text-white" for="size8-${party.id}-${index}" style="font-size: 0.75rem; padding: 4px 8px; font-weight: 500; border-top-right-radius: 6px !important; border-bottom-right-radius: 6px !important;">

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

                  <select class="form-select" id="scheduledWeekday-${party.id}-${index}" 

                          onchange="updateRaidScheduledTime('${party.id}', this.value, document.getElementById('scheduledHour-${party.id}-${index}').value)">

                    <option value="">요일 선택</option>

                    <option value="monday" ${party.scheduledWeekday === 'monday' ? 'selected' : ''}>월요일</option>

                    <option value="tuesday" ${party.scheduledWeekday === 'tuesday' ? 'selected' : ''}>화요일</option>

                    <option value="wednesday" ${party.scheduledWeekday === 'wednesday' ? 'selected' : ''}>수요일</option>

                    <option value="thursday" ${party.scheduledWeekday === 'thursday' ? 'selected' : ''}>목요일</option>

                    <option value="friday" ${party.scheduledWeekday === 'friday' ? 'selected' : ''}>금요일</option>

                    <option value="saturday" ${party.scheduledWeekday === 'saturday' ? 'selected' : ''}>토요일</option>

                    <option value="sunday" ${party.scheduledWeekday === 'sunday' ? 'selected' : ''}>일요일</option>

                  </select>

                  <input type="text" class="form-control clockpicker" id="scheduledHour-${party.id}-${index}" 

                         placeholder="클릭하여 시간 선택" 

                         value="${party.scheduledHour || ''}" 

                         readonly style="cursor: pointer; background: white;"

                         data-party-id="${party.id}">

                  <button class="btn btn-outline-secondary" type="button" onclick="clearRaidScheduledTime('${party.id}')" title="시간 초기화">

                    <i class="bi bi-x-circle"></i>

                  </button>

                </div>

                <div class="input-group input-group-sm" style="flex: 0 0 auto;">

                  <span class="input-group-text">최소 레벨</span>

                  <input type="number" class="form-control" id="minIlvl-${party.id}-${index}" 

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

                  <input type="number" class="form-control" id="minCombatPower-${party.id}-${index}" 

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

            ${Array.from({ length: party.size || 4 }, (_, slotIndex) => {
              const char = party.members?.[slotIndex]; // 🔥 size 기반으로 슬롯 생성, members에서 가져오기

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

                      <div class="fw-bold small" title="${charDetails.name}">${truncateCharacterName(charDetails.name, 8)}</div>

                      <div class="small text-muted">Lv ${charDetails.ilvl || '0'}</div>

                      <div class="small text-muted">CP ${(charDetails.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>

                      ${charDetails.role !== 'support' ? `<div class="small text-success" style="font-size: 0.65rem;">(${calculateDPS(charDetails.combatPower || '0', charDetails.className || '', charDetails.engraving || '')?.toFixed(1)}억)</div>` : ''}

                      <div class="badge ${charDetails.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'} mt-1" style="font-size: 0.7rem;" title="${charDetails.className || '알 수 없음'}">${charDetails.role === 'support' ? '서폿' : '딜러'} (${truncateJobName(charDetails.className || '알 수 없음', 6)})</div>

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



    partiesContainer.appendChild(partyDiv);

  });



  // 최종적으로 partiesContainer를 container에 추가

  container.appendChild(partiesContainer);



  updateSupportCount();

  setupRaidEventListeners();

  

  // ClockPicker 초기화 (모든 파티의 시간 선택기)

  setTimeout(() => {

    sortedParties.forEach(party => {

      if (window.initializeClockPicker) {

        window.initializeClockPicker(party.id);

      }

    });

  }, 100);

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



// 직업명 축약 사전 (전역 변수)

let jobAbbreviations = {};



// 직업명 축약 사전 로드 함수

async function loadJobAbbreviations() {

  try {

    const response = await fetch('data/job-abbreviations.json');

    const data = await response.json();

    jobAbbreviations = data;

  } catch (error) {

    console.error('직업명 축약 사전 로드 실패:', error);

    // 실패 시 빈 객체로 설정 (기본 축약 조건 사용)

    jobAbbreviations = {};

  }

}



// 페이지 로드 시 사전 로드

loadJobAbbreviations();



// 🔥 **새로 추가**: 캐릭터명 길이 제한 함수 (생략 처리)

function truncateCharacterName(text, maxLength = 8) {

  if (!text) return '';

  

  // 캐릭터명은 단순 길이 제한

  if (text.length > maxLength) {

    return text.substring(0, maxLength) + '...';

  }

  

  return text;

}



// 🔥 **새로 추가**: 직업명 축약 함수 (사전 기반)

function truncateJobName(text, maxLength = 8) {

  if (!text) return '';

  // 직업명 축약 사전 적용

  if (jobAbbreviations[text]) {

    return jobAbbreviations[text].abbr; // 새로운 형식: abbr 속성 사용

  }

  // 사전에 없으면 길이별 처리

  if (text.length <= 3) {

    return text; // 3글자까지는 원래대로

  } else {

    return text.substring(0, 2); // 4글자 이상은 앞 2글자

  }

}



// 🔥 **새로 추가**: 직업 아이콘 이름 가져오기 함수

function getJobIconName(className) {

  if (!className) return '';

  

  // 직업명 축약 사전 적용

  if (jobAbbreviations[className]) {

    return jobAbbreviations[className].icon; // 새로운 형식: icon 속성 사용

  }

  

  // 사전에 없으면 기본값 반환 (클래스명을 소문자와 하이픈으로 변환)

  return className.toLowerCase().replace(/\s+/g, '-');

}



// 🔥 **기존 호환성을 위한 함수 (캐릭터명용)

function truncateText(text, maxLength = 8) {

  return truncateCharacterName(text, maxLength);

}



// 원정대 이름 체크 함수 (이모지 포함)

function checkExpeditionName(expeditionName) {

  if (!expeditionName) return '';

  

  // 땡준 값이 있는지 체크 (대소문자 무관)

  if (expeditionName.toLowerCase().includes('땡준')) {

    return `<span class="devil-indicator" title="기만자">😈</span>`;

  }

  

  return '';

}



// 원정대 이름 순수 텍스트 반환 함수

function getExpeditionNameText(expeditionName) {

  if (!expeditionName) return '';

  return expeditionName;

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





// 드래그 앤 드롭 이벤트 설정 (이벤트 위임 방식)

function setupRaidEventListeners() {

  const container = document.getElementById('raidParties');

  if (!container) return;

  

  // 드래그 앤 드롭 이벤트 위임

  container.addEventListener('dragstart', (e) => {

    const partyDiv = e.target.closest('[data-draggable="true"]');

    if (partyDiv && !partyDiv.classList.contains('cleared-party')) {

      // 전역 변수 설정

      draggedPartyElement = partyDiv;

      draggedPartyData = {

        id: draggedPartyElement.getAttribute('data-party-id'),

        order: parseInt(draggedPartyElement.getAttribute('data-party-order'))

      };

      

      draggedPartyElement.classList.add('dragging');

      e.dataTransfer.effectAllowed = 'move';

      e.dataTransfer.setData('text/html', draggedPartyElement.innerHTML);

    }

  });

  

  // 전체 컨테이너에서 dragover 이벤트 처리 (드롭 허용을 위해)

  container.addEventListener('dragover', (e) => {

    // 드래그 가능한 요소 위에 있을 때만 드롭 허용

    const partyDiv = e.target.closest('[data-draggable="true"]');

    if (partyDiv && !partyDiv.classList.contains('cleared-party')) {

      e.preventDefault();

      e.stopPropagation();

      

      // 드래그 중인 파티 위에 시각적 표시

      if (draggedPartyElement && partyDiv !== draggedPartyElement) {

        // 기존 드래그 오버 표시 제거

        document.querySelectorAll('.drag-over').forEach(el => {

          el.classList.remove('drag-over');

        });

        partyDiv.classList.add('drag-over');

      }

    } else {

      // 드래그 가능한 영역이 아니면 드롭 금지

      e.dataTransfer.dropEffect = 'none';

    }

  });

  

  container.addEventListener('drop', (e) => {

    e.preventDefault();

    e.stopPropagation();

    

    const targetElement = e.target.closest('[data-draggable="true"]');

    if (targetElement && draggedPartyElement && targetElement !== draggedPartyElement && 

        !targetElement.classList.contains('cleared-party')) {

      

      // 실제 순서 변경 로직 호출

      const raidId = state.selectedRaid?.id;

      const difficultyId = state.selectedDifficulty?.id;

      

      if (raidId && difficultyId) {

        // partiesContainer를 기준으로 인덱스 계산 - 더 정확한 선택자 사용

        const partiesContainer = container.querySelector('.row:not(.mb-3)');

        if (!partiesContainer) return;

        

        const allParties = Array.from(partiesContainer.children);

        const fromIndex = allParties.indexOf(draggedPartyElement);

        const toIndex = allParties.indexOf(targetElement);

        

        if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {

          reorderParties(raidId, difficultyId, fromIndex, toIndex);

        }

      }

    }

  });

  

  container.addEventListener('dragend', (e) => {

    // 모든 드래그 관련 클래스 제거

    document.querySelectorAll('.drag-over').forEach(el => {

      el.classList.remove('drag-over');

    });

    

    if (draggedPartyElement) {

      draggedPartyElement.style.opacity = '1';

      draggedPartyElement.classList.remove('dragging');

    }

    

    draggedPartyElement = null;

    draggedPartyData = null;

  });



  // 전역 드래그 앤 드롭 이벤트 (기존과 동일)

  document.addEventListener('dragover', handleDragOver);

  document.addEventListener('drop', handleDrop);

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

    slotDiv.className = ''; /* Bootstrap 반응형 클래스 제거 */ 



    const slotClass = slot.length > 0 ? 'expedition-slot-filled' : 'expedition-slot-empty';



    slotDiv.innerHTML = `

      <div class="expedition-slot ${slotClass}" ondrop="handleExpeditionDrop(event, ${index})" ondragover="handleDragOver" ondragleave="handleDragLeave" style="cursor: default; min-height: 100px;">

        <h6 class="text-center mb-1" style="font-size: 0.75rem;">

          <span onclick="event.stopPropagation(); renameExpeditionSlot(${index})" style="cursor: pointer; text-decoration: underline;" title="클릭하여 이름 변경">

            ${state.expeditionSlotNames[index]}${checkExpeditionName(state.expeditionSlotNames[index])}

          </span>

          ${slot.length > 0 ? `<small class="text-success">(${slot.length})</small>` : '<small class="text-muted">(비어있음)</small>'}

        </h6>

        <div class="expedition-slots">

          ${slot.length > 0 ? slot.map((char, charIndex) => {

            // 상세 정보 조회 (원정대 데이터)

            const charDetails = getCharacterDetailsFromExpedition(char.name);

            const role = charDetails?.role || 'dps';

            return `

            <div class="expedition-char ${role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" style="cursor: grab; font-size: clamp(9px, 1.8vw, 20px); position: relative;" title="드래그하여 공격대로 이동">

              <div class="d-flex align-items-center">

                <img src="${charDetails?.image || 'img/default-character.png'}" alt="${char.name}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 6px; flex-shrink: 0;">

                <div class="flex-grow-1">

                  <div class="fw-bold" style="font-size: clamp(8px, 1.1vw, 16px); line-height: 1.2; color: #2c3e50;" title="${char.name}">${truncateCharacterName(char.name, 7)}</div>

                  <div class="small text-warning" style="font-size: clamp(7px, 1.3vw, 14px); font-weight: 600;">Lv${charDetails?.ilvl || '0'}</div>

                  <div class="small text-primary" style="font-size: clamp(6px, 1.1vw, 12px); font-weight: 500;">${(charDetails?.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>

                  ${charDetails?.role !== 'support' ? `<div class="small text-success" style="font-size: clamp(5px, 0.9vw, 10px); font-weight: 400;">(${calculateDPS(charDetails?.combatPower || '0', charDetails?.className || '', charDetails?.engraving || '')?.toFixed(1)}억)</div>` : ''}

                </div>

              </div>

              <div class="badge bg-secondary" style="font-size: clamp(5px, 0.8vw, 10px); position: absolute; top: 2px; right: 2px; z-index: 10; padding: 2px 4px;">${Constraints.getCharacterUsageCount(char.name)}/3</div>

              <img src="img/${getJobIconName(charDetails?.className || '')}.png" alt="${charDetails?.className || ''}" class="job-icon" style="position: absolute; bottom: 2px; right: 2px; width: 16px; height: 16px; border-radius: 2px; z-index: 5;" title="${charDetails?.className || ''}">

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

            ${state.expeditionSlotNames[index]}${checkExpeditionName(state.expeditionSlotNames[index])}

          </span>

          ${slot.length > 0 ? `<small class="text-success">(${slot.length}명)</small>` : '<small class="text-muted">(클릭하여 원정대 추가, 드래하여 공격대로 이동)</small>'}

        </h6>

        <div class="expedition-slots">

          ${slot.length > 0 ? slot.map((char, charIndex) => `

            <div class="expedition-char ${char.role}" draggable="true" ondragstart="handleDragStart(event, '${char.id}', null, null, ${index}, ${charIndex})" ondragend="handleDragEnd(event)" ondrop="handleExpeditionCharacterDrop(event, ${index}, ${charIndex})" ondragover="handleDragOver" ondragleave="handleDragLeave" onclick="event.stopPropagation(); editCharacter(${index}, ${charIndex})" oncontextmenu="handleRightClick(event, '${char.id}', null, null, ${index}, ${charIndex})" style="cursor: pointer; position: relative;" title="좌클릭: 수정, 우클릭: 삭제, 드래그: 공격대로 이동">

              <img src="${char.image || 'img/default-character.png'}" alt="${char.name}" style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 2px; display: block;">

              <div class="flex-grow-1" style="font-size: 0.7rem;">

                <div class="fw-bold">${truncateCharacterName(char.name, 8)}</div>

                <div class="small text-muted">Lv ${char.ilvl || '0'}</div>

                <div class="small text-info">CP ${(char.combatPower || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>

                <div class="badge ${char.role === 'support' ? 'bg-warning text-dark' : 'bg-primary'}" style="font-size: 0.5rem;">${char.role === 'support' ? '서폿' : '딜러'} (${truncateJobName(char.className || '알 수 없음', 6)})</div>

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

