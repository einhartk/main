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
    size: 4 // 현재 파티 크기
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
    
    container.appendChild(partyDiv);
  });
  
  setupRaidEventListeners();
  updateSupportCount();
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
        
        // 서폿 수 체크 (파티당 1명으로 고정)
        const currentSupports = party.members.filter(m => m?.role === 'support').length;
        if (data.role === 'support' && currentSupports >= 1) {
          console.log(`❌ [DROP ERROR] Support limit reached: ${currentSupports}/1`);
          alert('이 공격대에는 서포터를 1명만 배치할 수 있습니다.');
          return;
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
        
        // 역할 변경
        const oldRole = c.role;
        c.role = c.role === 'dps' ? 'support' : 'dps';
        
        console.log(`📝 [ROLE CHANGE] ${c.name}: ${oldRole} → ${c.role}`);
        
        // UI 업데이트
        renderExpedition();
        renderRaidParties();
      };
      body.appendChild(div);
    });
    
    root.appendChild(col);
  });
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
  // 모든 공격대 파티 초기화
  state.raidParties.forEach(party => {
    party.members.fill(null);
  });
  
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
  allChars.sort((a,b) => parseFloat((b.ilvl||'0').replace(',','')) - parseFloat((a.ilvl||'0').replace(',','')));
  
  // 서포터와 DPS 분리
  const supports = allChars.filter(c => c.role === 'support');
  const dps = allChars.filter(c => c.role === 'dps');
  
  // 각 파티에 서포터 배치 (최대 1명, 1캐릭터당 최대 3공격대 제한)
  state.raidParties.forEach((party, partyIndex) => {
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
        if (!bestSupport || parseFloat(supportChar.ilvl.replace(',', '')) > parseFloat(bestSupport.ilvl.replace(',', ''))) {
          bestSupport = supportChar;
        }
      }
    }
    
    if (bestSupport) {
      party.members[0] = bestSupport;
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
      }
    }
  });
  
  renderRaidParties();
  renderExpedition();
  
  // 결과 요약
  const totalAssigned = state.raidParties.reduce((sum, party) => 
    sum + party.members.filter(m => m !== null).length, 0
  );
  
  alert(`공대 자동 추천 완료!\n총 ${totalAssigned}명의 캐릭터가 배치되었습니다.\n(1공대당 원정대 1캐릭터, 파티당 서폿 1명, 1캐릭터당 최대 3공격대)`);
}

renderExpedition();
initializeRaids(); // 초기 공격대 파티 생성

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