// 탭 전환 기능
function setupTabs() {
  // 탭 버튼 클릭 이벤트
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // 돌아가기 버튼 이벤트
  document.getElementById('backToCharacter')?.addEventListener('click', () => switchTab('character'));
  document.getElementById('backToCharacter2')?.addEventListener('click', () => switchTab('character'));
}

// 탭 전환 함수
function switchTab(tabId) {
  // 모든 탭 컨텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });

  // 선택한 탭 활성화
  const activeTab = document.getElementById(`${tabId}-tab`);
  const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  
  if (activeTab) activeTab.classList.add('active');
  if (activeButton) activeButton.classList.add('active');

  // 탭 전환 시 추가 동작
  if (tabId === 'items') {
    updateEquipmentView();
  } else if (tabId === 'skills') {
    updateSkillsView();
  }
}

// 장비 뷰 업데이트
function updateEquipmentView() {
  const player = window.player;
  if (!player) return;

  // 착용 중인 장비 표시
  if (player.equipment) {
    Object.entries(player.equipment).forEach(([slot, item]) => {
      const slotElement = document.getElementById(`${slot}-slot`);
      if (slotElement) {
        slotElement.textContent = item ? item.name : '-';
      }
    });
  }

  // 인벤토리 아이템 표시
  updateInventoryList();
}

// 인벤토리 목록 업데이트
function updateInventoryList() {
  const player = window.player;
  const itemList = document.getElementById('item-list');
  if (!player || !itemList) return;

  if (player.inventory && player.inventory.length > 0) {
    itemList.innerHTML = player.inventory.map((item, index) => {
      // Ensure item is an object and has required properties
      const itemName = item?.name || '알 수 없는 아이템';
      const itemType = item?.type || 'item';
      const itemValue = item?.value ? `${item.value}G` : '';
      const itemStat = item?.stat ? `+${item.stat.value} ${item.stat.type}` : '';
      
      return `
        <div class="item-card" data-index="${index}">
          <div class="item-icon">${getItemIcon(itemType)}</div>
          <div class="item-details">
            <h4>${itemName}</h4>
            <p>${[itemType, itemValue, itemStat].filter(Boolean).join(' | ')}</p>
          </div>
        </div>`;
    }).join('');
  } else {
    itemList.innerHTML = '<div class="empty-message">인벤토리가 비어있습니다.</div>';
  }
}

// 스킬 뷰 업데이트
function updateSkillsView() {
  const player = window.player;
  if (!player) return;

  const activeSkillsList = document.getElementById('active-skills-list');
  const passiveSkillsList = document.getElementById('passive-skills-list');

  if (!activeSkillsList || !passiveSkillsList) return;

  // 액티브 스킬 표시
  if (player.skills && player.skills.active) {
    activeSkillsList.innerHTML = player.skills.active.map(skill => `
      <div class="skill-card">
        <h5>${skill.icon || '✨'} ${skill.name} <span class="skill-level">Lv.${skill.level || 1}</span></h5>
        <p>${skill.description || '스킬 설명이 없습니다.'}</p>
        <div class="skill-cooldown">${skill.cooldown ? `쿨타임: ${skill.cooldown}턴` : ''}</div>
      </div>
    `).join('');
  } else {
    activeSkillsList.innerHTML = '<div class="empty-message">보유한 액티브 스킬이 없습니다.</div>';
  }

  // 패시브 스킬 표시
  if (player.skills && player.skills.passive) {
    passiveSkillsList.innerHTML = player.skills.passive.map(skill => `
      <div class="skill-card">
        <h5>${skill.icon || '🌟'} ${skill.name} <span class="skill-level">Lv.${skill.level || 1}</span></h5>
        <p>${skill.description || '스킬 설명이 없습니다.'}</p>
      </div>
    `).join('');
  } else {
    passiveSkillsList.innerHTML = '<div class="empty-message">보유한 패시브 스킬이 없습니다.</div>';
  }
}

// 아이템 타입에 따른 아이콘 반환
function getItemIcon(itemType) {
  const icons = {
    'weapon': '⚔️',
    'armor': '🛡️',
    'accessory': '💍',
    'potion': '🧪',
    'material': '📦',
    'quest': '📜',
    'key': '🔑',
    'default': '🎁'
  };

  return icons[itemType.toLowerCase()] || icons['default'];
}

// 문서 로드 시 탭 설정
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTabs);
} else {
  setupTabs();
}

// 전역에서 사용할 수 있도록 내보내기
window.Tabs = {
  switchTab,
  updateEquipmentView,
  updateSkillsView
};
