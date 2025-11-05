// 전역으로 player 객체 선언
window.player = null;

document.getElementById("createCharacter").addEventListener("click", () => {
  const name = document.getElementById("playerName").value;
  const job = document.getElementById("playerClass").value;
  if (!name) return alert("이름을 입력하세요!");

  player = new Player(name, job);
  document.getElementById("characterSetup").classList.add("hidden");
  document.getElementById("playerInfo").classList.remove("hidden");

  UI.updatePlayerInfo(player);
  UI.updateEventLog(`${player.name}의 모험이 시작됩니다!`);
  QuestSystem.assignRandomQuest(player);
  randomEvent();
});

// 게임 상태 관리
const GameState = {
  IN_TOWN: 'in_town',
  IN_FIELD: 'in_field',
  IN_COMBAT: 'in_combat',
  IN_LOOTING: 'in_looting',
  IN_TRAVEL: 'in_travel',
  IN_STORY: 'in_story'
};

let currentGameState = GameState.IN_TOWN;
let currentTown = null;
let availableEnemies = [];
let townsData = [];

// 마을 데이터 로드
async function loadTownsData() {
  try {
    const response = await fetch('assets/data/towns.json');
    if (!response.ok) throw new Error('마을 데이터를 불러오는데 실패했습니다.');
    const data = await response.json();
    townsData = data.towns || [];
    return townsData;
  } catch (error) {
    console.error('마을 데이터 로드 오류:', error);
    return [];
  }
}

// 레벨에 맞는 적 목록 필터링
async function loadEnemiesForLevel(level) {
  try {
    console.log(`Loading enemies for level ${level}...`);
    const response = await fetch('assets/data/enemies.json');
    if (!response.ok) {
      throw new Error(`Failed to load enemies: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    
    if (!data.enemies || !Array.isArray(data.enemies)) {
      throw new Error('Invalid enemies data format');
    }
    
    // 레벨 범위에 맞는 적 필터링 (플레이어 레벨 ±2 레벨 범위)
    const minLevel = Math.max(1, level - 2);
    const maxLevel = level + 2;
    
    console.log(`Filtering enemies between levels ${minLevel} and ${maxLevel}`);
    
    const filteredEnemies = data.enemies.filter(enemy => {
      const enemyLevel = parseInt(enemy.level) || 1;
      return enemyLevel >= minLevel && enemyLevel <= maxLevel;
    });
    
    if (filteredEnemies.length === 0) {
      console.warn('No enemies found for level range, using all enemies');
      availableEnemies = [...data.enemies]; // 모든 적 사용
    } else {
      availableEnemies = [];
      // 가중치에 따른 등장 확률 계산
      filteredEnemies.forEach(enemy => {
        const weight = parseInt(enemy.spawnWeight) || 10; // 기본 가중치 10
        for (let i = 0; i < weight; i++) {
          availableEnemies.push({...enemy}); // 복사본 추가
        }
      });
    }
    
    console.log(`Loaded ${availableEnemies.length} enemy instances (${new Set(availableEnemies.map(e => e.id)).size} unique types)`);
    return availableEnemies;
  } catch (error) {
    console.error('적 데이터 로드 오류:', error);
    return [];
  }
}

// 랜덤한 적 선택
function getRandomEnemy() {
  // availableEnemies가 비어있으면 로드 시도
  if (availableEnemies.length === 0) {
    // 레벨 1로 기본 적 로드 (에러 방지용)
    loadEnemiesForLevel(1);
    
    // 그래도 없으면 기본 적 생성
    if (availableEnemies.length === 0) {
      console.warn('No enemies available, creating default enemy');
      return {
        id: 'default_enemy',
        name: '야생 동물',
        level: 1,
        hp: 30,
        exp: 10,
        gold: '1d6+2',
        attack: 5,
        defense: 0,
        agility: 10,
        strength: 8,
        drops: [],
        spawnWeight: 10
      };
    }
  }
  
  // 가중치에 따른 랜덤 선택
  const randomIndex = Math.floor(Math.random() * availableEnemies.length);
  const selectedEnemy = availableEnemies[randomIndex];
  
  // 깊은 복사하여 반환 (원본 데이터 보존)
  return JSON.parse(JSON.stringify(selectedEnemy));
}

// 마을로 돌아가기
async function returnToTown(townId = null) {
  // 캐릭터 생성 여부 확인
  if (!window.player) {
    UI.showNotification('캐릭터를 먼저 생성해주세요.', 'error');
    return;
  }
  
  // 전투/루팅 중 확인
  if (currentGameState === GameState.IN_COMBAT || currentGameState === GameState.IN_LOOTING) {
    UI.showNotification('전투 중이거나 아이템을 획득 중에는 마을로 돌아갈 수 없습니다.', 'warning');
    return;
  }
  
  // 마을 데이터 로드 (아직 로드되지 않은 경우)
  if (townsData.length === 0) {
    await loadTownsData();
  }
  
  // 특정 마을로 이동하는 경우
  if (townId) {
    currentTown = townsData.find(town => town.id === townId) || townsData[0];
  } 
  // 현재 마을이 없으면 첫 번째 마을로 이동
  else if (!currentTown && townsData.length > 0) {
    currentTown = townsData[0];
  }
  
  currentGameState = GameState.IN_TOWN;
  updateActionButtons();
  
  if (currentTown) {
    UI.addLog(`[${currentTown.name}] ${currentTown.description}`, 'town');
  } else {
    UI.addLog('[마을] 안전한 마을로 돌아왔습니다.', 'town');
  }
  
  // 적 데이터도 함께 로드
  await loadEnemiesForLevel(window.player?.level || 1);
}

// 필드로 나가기
function goToField() {
  currentGameState = GameState.IN_FIELD;
  updateActionButtons();
  UI.addLog('[필드] 위험한 필드로 나갑니다.', 'field');
}

// 액션 버튼 업데이트
function updateActionButtons() {
  const actionButtons = document.getElementById('actionButtons');
  if (!actionButtons) return;
  
  actionButtons.innerHTML = ''; // Clear existing buttons

  // 전투나 루팅 중에는 버튼 비활성화
  if (currentGameState === GameState.IN_COMBAT || currentGameState === GameState.IN_LOOTING) {
    try {
      const disabledText = currentGameState === GameState.IN_COMBAT ? ' (전투 중)' : ' (아이템 획득 중)';
      const btn1 = createButton(`▶️ 스토리 진행하기${disabledText}`, null, actionButtons);
      const btn2 = createButton(`🏘️ 마을로 돌아가기${disabledText}`, null, actionButtons);
      
      if (btn1) btn1.disabled = true;
      if (btn2) btn2.disabled = true;
      return;
    } catch (error) {
      console.error('Error creating disabled buttons:', error);
      return;
    }
  }

    // Handle field state
  if (currentGameState === GameState.IN_FIELD) {
    // 필드에서의 기본 액션 버튼들
    const fieldActions = [
      { name: '▶️ 스토리 진행하기', action: proceedStory },
      { name: '🏘️ 마을로 돌아가기', action: returnToTown }
    ];
    
    fieldActions.forEach(action => {
      const button = createButton(action.name, action.action, actionButtons);
      button.className = 'action-button';
    });
  }
  // Handle town state
  else if (currentGameState === GameState.IN_TOWN) {
    // 마을 액션 버튼들 추가
    if (currentTown && Array.isArray(currentTown.actions)) {
      currentTown.actions.forEach(action => {
        if (action.disabled) return;
        
        // 버튼 생성
        const buttonText = action.cost ? `${action.name} (${action.cost}G)` : action.name;
        const button = document.createElement('button');
        button.textContent = buttonText;
        button.className = 'action-button';
        
        // 툴팁 추가
        if (action.description) {
          button.title = action.description;
        }
        
        // 클릭 이벤트 추가
        button.onclick = () => handleTownAction(action);
        
        // 골드 부족 시 비활성화
        if (action.cost && window.player && window.player.gold < action.cost) {
          button.disabled = true;
          button.title = `골드가 부족합니다! (필요: ${action.cost}G)`;
        }
        
        actionButtons.appendChild(button);
      });
    }
    
    // Add town travel button if multiple towns exist
    const playerLevel = window.player?.level || 1;
    const otherTowns = townsData.filter(town => 
      town.id !== currentTown?.id && 
      playerLevel >= (town.levelRange?.[0] || 1) &&
      playerLevel <= (town.levelRange?.[1] || 99)
    );
    
    if (otherTowns.length > 0) {
      const travelButton = createButton('🚩 다른 마을로 이동', showTownTravelMenu, actionButtons);
      
      // Add tooltip with available towns
      const availableTowns = otherTowns.map(town => 
        `${town.name} (Lv.${town.levelRange?.[0] || 1}+)`
      ).join('\n');
      
      travelButton.title = `이동 가능한 마을:\n${availableTowns}`;
    }
    
    // Add field exit button at the bottom
    createButton('🌲 필드로 나가기', goToField, actionButtons);
  }
  // Handle field state
  else if (currentGameState === GameState.IN_FIELD) {
    const storyButton = createButton('▶️ 스토리 진행하기', proceedStory, actionButtons);
    const townButton = createButton('🏘️ 마을로 돌아가기', () => returnToTown(), actionButtons);
    
    // 캐릭터 생성 전이나, 전투/루팅/스토리 진행 중에는 버튼 비활성화
    const isActionDisabled = !window.player || 
                           currentGameState === GameState.IN_COMBAT || 
                           currentGameState === GameState.IN_LOOTING ||
                           currentGameState === GameState.IN_STORY;
    
    if (isActionDisabled) {
      const disabledReason = !window.player ? '캐릭터를 먼저 생성해주세요.' :
                           currentGameState === GameState.IN_COMBAT ? '전투 중에는 사용할 수 없습니다.' :
                           currentGameState === GameState.IN_LOOTING ? '아이템을 획득하는 중입니다.' :
                           '스토리 진행 중입니다.';
     
     if (storyButton) {
       storyButton.disabled = true;
       storyButton.title = disabledReason;
     }
     if (townButton) {
       townButton.disabled = true;
       townButton.title = disabledReason;
     }
    }
  }
}

// 마을 액션 처리
function handleTownAction(action) {
  if (!window.player) return;
  
  // 골드 소모가 필요한 경우
  if (action.cost && window.player.gold < action.cost) {
    UI.showNotification(`골드가 부족합니다! (필요: ${action.cost}G)`, 'error');
    return;
  }
  
  // 골드 소모
  if (action.cost) {
    window.player.gold -= action.cost;
  }
  
  // 액션 효과 처리
  switch(action.effect) {
    case 'heal_full':
      window.player.hp = window.player.maxHp;
      UI.showNotification('체력이 완전히 회복되었습니다!', 'success');
      break;
      
    case 'heal_full_xp_boost':
      window.player.hp = window.player.maxHp;
      // TODO: 경험치 보너스 효과 추가
      UI.showNotification('고급 여관에서 푹 쉬었습니다! (다음 전투 경험치 1.5배)', 'success');
      break;
      
    case 'show_quests':
      QuestSystem.assignRandomQuest(window.player);
      break;
      
    case 'train_skills':
      // TODO: 스킬 훈련 로직 추가
      UI.showNotification('기본 전투 기술을 연마했습니다!', 'info');
      break;
      
    case 'start_arena':
      // TODO: 투기장 전투 시작
      UI.showNotification('투기장에 도전합니다!', 'info');
      break;
      
    case 'learn_spells':
      // TODO: 마법 학습 로직 추가
      UI.showNotification('비전 도서관에서 새로운 마법을 연구했습니다!', 'info');
      break;
      
    case 'enchant_item':
      // TODO: 아이템 강화 로직 추가
      UI.showNotification('아이템에 마법을 부여했습니다!', 'info');
      break;
      
    case 'dimension_travel':
      // TODO: 차원 이동 로직 추가
      UI.showNotification('차원의 문을 통해 미지의 세계로 이동합니다...', 'info');
      break;
      
    default:
      if (action.shopType) {
        // 상점 열기
        openShop(action.shopType);
      } else {
        UI.showNotification(`${action.name}을(를) 선택하셨습니다.`, 'info');
      }
  }
  
  // UI 업데이트
  UI.updatePlayerInfo(window.player);
}

// 마을 이동 메뉴 표시
function showTownTravelMenu() {
  const playerLevel = window.player?.level || 1;
  const availableTowns = townsData.filter(town => 
    town.id !== currentTown?.id &&
    playerLevel >= (town.levelRange?.[0] || 1) &&
    playerLevel <= (town.levelRange?.[1] || 99)
  );

  const travelContainer = document.createElement('div');
  travelContainer.className = 'travel-menu';
  travelContainer.innerHTML = `
    <h3>이동할 마을을 선택하세요 (현재 레벨: ${playerLevel})</h3>
    <div class="town-list"></div>
  `;
  
  const townList = travelContainer.querySelector('.town-list');
  
  if (availableTowns.length === 0) {
    townList.innerHTML = '<p>이동할 수 있는 마을이 없습니다. 레벨을 더 올려보세요!</p>';
  } else {
    availableTowns.forEach(town => {
      const townButton = document.createElement('button');
      townButton.className = 'town-button';
      townButton.innerHTML = `
        <strong>${town.name}</strong><br>
        <small>Lv.${town.levelRange?.[0] || 1}~${town.levelRange?.[1] || '∞'}</small>
      `;
      townButton.title = town.description;
      townButton.onclick = () => travelToTown(town.id);
      townList.appendChild(townButton);
    });
  }
  
  // 취소 버튼
  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-button';
  cancelButton.textContent = '취소';
  cancelButton.onclick = () => travelContainer.remove();
  travelContainer.appendChild(cancelButton);
  
  // 기존 메뉴 제거
  const existingMenu = document.querySelector('.travel-menu');
  if (existingMenu) existingMenu.remove();
  
  // 새 메뉴 추가
  document.getElementById('actionButtons').appendChild(travelContainer);
}

// 마을 이동
function travelToTown(townId) {
  const town = townsData.find(t => t.id === townId);
  if (!town) return;
  
  const playerLevel = window.player?.level || 1;
  if (playerLevel < town.levelRange[0]) {
    UI.showNotification(`이 마을은 레벨 ${town.levelRange[0]} 이상부터 방문할 수 있습니다.`, 'warning');
    return;
  }
  
  // 여행 시작 (로딩 또는 애니메이션 효과를 넣을 수 있음)
  UI.showNotification(`${town.name}(으)로 여행을 시작합니다...`, 'info');
  
  // 1초 후에 마을 도착
  setTimeout(() => {
    returnToTown(townId);
  }, 1000);
}

// 스토리 진행
async function proceedStory() {
  if (!window.player) {
    UI.showNotification('캐릭터를 먼저 생성해주세요!', 'warning');
    return;
  }
  
  // 이미 스토리 진행 중이면 무시
  if (currentGameState === GameState.IN_STORY) return;
  
  // 스토리 진행 상태로 설정
  const previousState = currentGameState;
  currentGameState = GameState.IN_STORY;
  updateActionButtons();
    
  try {
  
    // 이벤트 로그 초기화 (이전 내용 지우기)
    const eventLog = document.getElementById('eventLog');
    if (eventLog) {
      eventLog.innerHTML = '';
    }
  
    // 필드에서만 발생할 수 있는 이벤트들
    const fieldEvents = [
    { 
      name: '전투', 
      action: fetchEnemy, 
      weight: 6,  // Increased weight for combat
      message: '적을 만났습니다!',
      type: 'combat',
      logType: 'combat'
    },
    { 
      name: '보물 상자 발견', 
      action: findTreasure, 
      weight: 2,  // Reduced weight for treasure
      message: '보물 상자를 발견했습니다!',
      type: 'treasure',
      logType: 'treasure'
    },
    { 
      name: '회복의 샘', 
      action: () => {
        const healAmount = Math.floor(window.player.maxHp * 0.5);
        const oldHp = window.player.hp;
        window.player.hp = Math.min(window.player.maxHp, window.player.hp + healAmount);
        const actualHeal = window.player.hp - oldHp;
        UI.addLog(`[회복] 체력이 ${actualHeal} 회복되었습니다. (${oldHp} → ${window.player.hp})`, 'heal');
        return `체력이 ${actualHeal} 회복되었습니다.`;
      },
      weight: 3,  // Slightly increased weight for healing
      message: '신비한 회복의 샘을 발견했습니다!',
      type: 'heal',
      logType: 'heal'
    },
    { 
      name: '숨겨진 보물', 
      action: () => {
        const gold = Math.floor(Math.random() * 100) + 50;
        window.player.gold += gold;
        UI.addLog(`[획득] ${gold}G를 발견했습니다! (보유: ${window.player.gold}G)`, 'gold');
        return `보물상자에서 ${gold}골드를 획득했습니다.`;
      },
      weight: 3,  // Slightly increased weight for gold
      message: '땅속에서 반짝이는 것을 발견했습니다!',
      type: 'gold',
      logType: 'gold'
    },
    {
      name: '특별한 발견',
      action: () => {
        // Only 30% chance to actually get an item
        if (Math.random() < 0.3) {
          const items = ['마법의 열매', '고대의 두루마리', '빛나는 수정'];
          const item = items[Math.floor(Math.random() * items.length)];
          if (!window.player.inventory) window.player.inventory = [];
          window.player.inventory.push(item);
          UI.addLog(`[획득] 신비한 ${item}을(를) 발견했습니다!`, 'item');
          return `신비한 ${item}을(를) 발견했습니다!`;
        } else {
          const nothingFound = ['아무것도 발견하지 못했습니다...', '아쉽게도 특별한 것은 없었습니다.', '별다른 것은 보이지 않습니다.'];
          const message = nothingFound[Math.floor(Math.random() * nothingFound.length)];
          UI.addLog(`[발견] ${message}`, 'info');
          return message;
        }
      },
      weight: 1,  // Kept very low weight for special items
      message: '이상한 빛이 보이는 곳이 있습니다...',
      type: 'special',
      logType: 'special'
    }
  ];
  
    const selected = selectRandomEvent(fieldEvents);
    
    // 이벤트 시작 메시지 표시 (이벤트 타입에 따라 다른 스타일 적용)
    const eventType = selected.type ? `[${selected.type.toUpperCase()}] ` : '';
    UI.addLog(`${eventType}${selected.message}`, selected.logType || 'event');
    
    // 이벤트 실행 및 결과 처리
    const result = await selected.action();
    // 결과 메시지가 있고, 해당 액션에서 이미 로그를 남기지 않은 경우에만 추가
    if (result && typeof result === 'string') {
      // 이미 로그에 추가된 메시지가 아니라면 추가
      if (!selected.logType || !result.includes('[')) {
        UI.addLog(`[결과] ${result}`, 'info');
      }
    }
    
    window.player.nextDay();
    UI.updatePlayerInfo(window.player);
    saveGameState();
  } catch (error) {
    console.error('이벤트 실행 중 오류 발생:', error);
    UI.addLog('[오류] 이벤트를 처리하는 중 문제가 발생했습니다.', 'error');
  } finally {
    // 이전 상태로 복원 (전투/루팅 중이면 유지)
    if (currentGameState === GameState.IN_STORY) {
      currentGameState = previousState;
      updateActionButtons();
    }
  }
}

// 보물 상자 발견 이벤트
async function findTreasure() {
  // 이미 루팅 중이면 무시
  if (currentGameState === GameState.IN_LOOTING) return;
  
  // 루팅 상태로 설정
  const previousState = currentGameState;
  currentGameState = GameState.IN_LOOTING;
  updateActionButtons();
  
  // 결과 처리 후 상태 복원을 위한 함수
  const cleanup = () => {
    currentGameState = previousState;
    updateActionButtons();
  };
  
  try {
    const treasures = [
    { 
      name: '작은 보물상자', 
      gold: { min: 10, max: 30 },
      items: [
        { name: '체력 포션', luckThreshold: 12 },
        { name: '마나 포션', luckThreshold: 14 }
      ],
      weight: 10
    },
    { 
      name: '보통 보물상자', 
      gold: { min: 30, max: 70 },
      items: [
        { name: '회복 물약', luckThreshold: 14 },
        { name: '마법 스크롤', luckThreshold: 16 },
        { name: '강화석', luckThreshold: 15 }
      ],
      weight: 5 
    },
    { 
      name: '큰 보물상자', 
      gold: { min: 50, max: 150 },
      items: [
        { name: '희귀한 보석', luckThreshold: 16 },
        { name: '고대의 유물', luckThreshold: 18 },
        { name: '전설의 무기 조각', luckThreshold: 20 }
      ],
      weight: 3 
    },
    { 
      name: '고대의 상자', 
      gold: { min: 100, max: 250 },
      items: [
        { name: '전설의 아이템', luckThreshold: 20 },
        { name: '신의 가호', luckThreshold: 22 },
        { name: '영원한 수호의 반지', luckThreshold: 25 }
      ],
      weight: 1 
    }
  ];
  
  // 가중치에 따라 보물 선택
  const selectedTreasure = selectRandomEvent(treasures);
  const goldAmount = Math.floor(Math.random() * 
    (selectedTreasure.gold.max - selectedTreasure.gold.min + 1)) + selectedTreasure.gold.min;
  
  // 골드 획득 (항상)
  window.player.gold += goldAmount;
  let resultText = `[보물] ${selectedTreasure.name}을(를) 발견했습니다!\n`;
  resultText += `[획득] ${goldAmount}G를 얻었습니다! (보유: ${window.player.gold}G)`;
  
  // 아이템 획득 시도 (보물상자당 1개만)
  const selectedItem = selectedTreasure.items[Math.floor(Math.random() * selectedTreasure.items.length)];
  
  // 주사위 UI 생성
  const diceContainer = document.createElement('div');
  diceContainer.className = 'dice-roll-container';
  
  const resultContainer = DiceUI.createResultContainer();
  const rollButton = DiceUI.createRollButton('🎲 행운의 주사위 굴리기');
  
  // 상태 메시지 표시
  const statusElement = document.createElement('div');
  statusElement.className = 'dice-status';
  statusText = `\n[아이템 획득] ${selectedItem.name} (필요 행운: ${selectedItem.luckThreshold}+)`;
  
  // 이벤트 로그에 추가
  const eventLog = document.getElementById('eventLog');
  eventLog.appendChild(document.createElement('hr'));
  eventLog.appendChild(document.createTextNode(resultText));
  eventLog.appendChild(document.createElement('br'));
  eventLog.appendChild(statusElement);
  eventLog.appendChild(diceContainer);
  
  // 주사위 굴리기 버튼 이벤트
  rollButton.onclick = async () => {
    try {
      // 주사위 굴리기 (d20 + 행운 보너스)
      const luckBonus = Math.floor((window.player.luck || 0) / 2);
      const rollResult = await DiceUI.roll(
        resultContainer, 
        { 
          sides: 20, 
          modifier: luckBonus,
          stat: luckBonus,
          statName: '행운'
        }
      );
      
      // 결과 처리
      if (rollResult >= selectedItem.luckThreshold) {
        // 성공: 아이템 획득
        if (!window.player.inventory) window.player.inventory = [];
        window.player.inventory.push(selectedItem.name);
        
        statusElement.innerHTML = `\n🎉 <strong>성공!</strong> ${selectedItem.name}을(를) 획득했습니다!`;
        statusElement.style.color = '#2e7d32';
        
        // 인벤토리 업데이트
        UI.addLog(`[획득] ${selectedItem.name}을(를) 얻었습니다!`, 'item');
        UI.updatePlayerInfo(window.player);
      } else {
        // 실패
        statusElement.innerHTML = `\n❌ <strong>실패...</strong> 아이템을 얻지 못했습니다. (필요: ${selectedItem.luckThreshold}+)`;
        statusElement.style.color = '#d32f2f';
      }
      
      // 버튼 비활성화
      rollButton.disabled = true;
      rollButton.style.opacity = '0.6';
      
      // 상태 저장
      saveGameState();
      
      // 1초 후에 상태 복원 및 UI 정리
      setTimeout(() => {
        // 주사위 UI 제거
        if (diceContainer.parentNode) {
          diceContainer.parentNode.removeChild(diceContainer);
        }
        
        // 항상 필드 상태로 복원
        currentGameState = GameState.IN_FIELD;
        updateActionButtons();
      }, 1000);
      
    } catch (error) {
      console.error('보물 상자 처리 중 오류 발생:', error);
      // 오류 발생 시에도 필드 상태로 복원
      currentGameState = GameState.IN_FIELD;
      updateActionButtons();
    }
  };
  
  // 주사위 버튼 추가
  diceContainer.appendChild(rollButton);
  diceContainer.appendChild(resultContainer);
  
  // 상태 메시지 업데이트
  statusElement.textContent = statusText;
  
  // 상태 저장
  UI.updatePlayerInfo(window.player);
  saveGameState();
  
  return resultText;
  } catch (error) {
    console.error('보물 상자 처리 중 오류가 발생했습니다:', error);
    UI.addLog('보물 상자 처리 중 오류가 발생했습니다.', 'error');
    currentGameState = previousState;
    updateActionButtons();
    return '보물 상자를 여는 중 문제가 발생했습니다.';
  }
}

// 버튼 생성 헬퍼 함수
function createButton(text, onClick, container) {
  if (!container || !(container instanceof Node)) {
    console.error('Invalid container for button creation');
    return null;
  }
  
  try {
    const button = document.createElement('button');
    button.className = 'action-button';
    button.textContent = text || 'Button';
    
    if (typeof onClick === 'function') {
      button.onclick = onClick;
    }
    
    container.appendChild(button);
    return button;
  } catch (error) {
    console.error('Error creating button:', error);
    return null;
  }
}

// 랜덤 전투 시작
function startRandomEncounter() {
  if (!window.player) return;
  
  const encounters = [
    { name: '전투', action: fetchEnemy, weight: 8 },
    { name: '특별 이벤트', action: specialEvent, weight: 2 }
  ];
  
  const selected = selectRandomEvent(encounters);
  UI.addLog(`[필드] ${selected.name}가 발생했습니다!`, 'event');
  selected.action();
  
  window.player.nextDay();
  UI.updatePlayerInfo(window.player);
  saveGameState();
}

// 랜덤 이벤트 선택
function selectRandomEvent(events) {
  const totalWeight = events.reduce((sum, event) => sum + (event.weight || 1), 0);
  let random = Math.random() * totalWeight;
  
  for (const event of events) {
    if (random < (event.weight || 1)) {
      return event;
    }
    random -= (event.weight || 1);
  }
  
  return events[0];
}

// 특별 이벤트
function specialEvent() {
  const events = [
    {
      message: '빛나는 보물상자를 발견했습니다!',
      action: () => {
        const gold = Math.floor(Math.random() * 100) + 50;
        window.player.gold += gold;
        const message = `[획득] ${gold}G를 발견했습니다! (보유: ${window.player.gold}G)`;
        return { log: message, type: 'gold', message: '빛나는 보물상자에서 값진 보상을 찾았습니다!' };
      }
    },
    {
      message: '신비한 샘을 발견했습니다!',
      action: () => {
        const oldHp = window.player.hp;
        const healAmount = window.player.maxHp - oldHp;
        window.player.hp = window.player.maxHp;
        const message = `[회복] 체력이 ${healAmount} 회복되었습니다! (${oldHp} → ${window.player.hp})`;
        return { log: message, type: 'heal', message: '신비한 샘의 기운이 당신을 감쌌습니다.' };
      }
    },
    {
      message: '수상한 상인을 만났습니다!',
      action: () => {
        // 50% 확률로 아이템 획득
        if (Math.random() < 0.5) {
          const items = ['마법의 열매', '고대의 두루마리', '빛나는 수정'];
          const item = items[Math.floor(Math.random() * items.length)];
          if (!window.player.inventory) window.player.inventory = [];
          window.player.inventory.push(item);
          return { 
            log: `[획득] ${item}을(를) 얻었습니다!`, 
            type: 'item', 
            message: `수상한 상인이 당신에게 ${item}을(를) 주었습니다.`
          };
        } else {
          return { 
            log: '[정보] 상인이 오늘은 줄 게 없다고 합니다...', 
            type: 'info',
            message: '상인이 오늘은 줄 게 없다고 합니다...'
          };
        }
      }
    },
    {
      message: '행운의 동전을 발견했습니다!',
      action: () => {
        const bonusGold = Math.floor(Math.random() * 200) + 50;
        window.player.gold += bonusGold;
        const message = `[행운] ${bonusGold}G를 획득했습니다! (보유: ${window.player.gold}G)`;
        return { log: message, type: 'gold', message: '행운의 여신이 당신에게 미소를 지었습니다!' };
      }
    }
  ];
  
  const event = events[Math.floor(Math.random() * events.length)];
  const result = event.action();
  
  // 로그 메시지 처리
  if (result && typeof result === 'object' && result.log) {
    UI.addLog(result.log, result.type || 'info');
    return result.message || result.log;
  } else if (result && typeof result === 'string') {
    UI.addLog(result, 'info');
  }
  
  // 플레이어 상태 업데이트
  UI.updatePlayerInfo(window.player);
  saveGameState();
  
  return result && result.message ? result.message : result;
}

// 여관에서 휴식
function restAtInn() {
  if (!window.player) return;
  
  const cost = 50;
  if (window.player.gold >= cost) {
    window.player.gold -= cost;
    window.player.hp = window.player.maxHp;
    UI.addLog(`[여관] ${cost}G를 지불하고 체력을 완전히 회복했습니다.`, 'heal');
  } else {
    UI.addLog(`[여관] 돈이 부족합니다. (필요: ${cost}G)`, 'error');
    return;
  }
  
  window.player.nextDay();
  UI.updatePlayerInfo(window.player);
  saveGameState();
}

// 상점 방문
function visitShop() {
  // 상점 로직 구현
  UI.addLog('[상점] 상점 주인: 어서오세요! 필요한 물건이 있으신가요?', 'shop');
  // 여기에 상점 아이템 목록 표시 로직 추가
  
  // 예시 아이템 구매
  const items = [
    { name: '체력 포션', price: 30, effect: '체력 30 회복' },
    { name: '강화석', price: 100, effect: '무기 강화에 사용' },
    { name: '귀환의 돌', price: 200, effect: '마을로 즉시 귀환' }
  ];
  
  const shopContainer = document.createElement('div');
  shopContainer.className = 'shop-container';
  shopContainer.innerHTML = '<h3>🛒 판매 중인 아이템</h3>';
  
  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'shop-item';
    itemEl.innerHTML = `
      <strong>${item.name}</strong>
      <span>${item.effect}</span>
      <span>${item.price}G</span>
      <button onclick="buyItem(${JSON.stringify(item)})">구매</button>
    `;
    shopContainer.appendChild(itemEl);
  });
  
  document.getElementById('eventLog').appendChild(shopContainer);
}

// 아이템 구매 함수 (전역에 노출)
window.buyItem = function(item) {
  if (!window.player) return;
  
  if (window.player.gold >= item.price) {
    window.player.gold -= item.price;
    // 아이템 효과 적용 (예시: 체력 포션)
    if (item.name === '체력 포션') {
      window.player.hp = Math.min(window.player.maxHp, window.player.hp + 30);
      UI.addLog(`[상점] ${item.name}을(를) 구매하여 체력을 30 회복했습니다.`, 'item');
    } else {
      // 인벤토리에 아이템 추가 로직 (구현 필요)
      UI.addLog(`[상점] ${item.name}을(를) 구매했습니다. (${item.price}G)`, 'item');
    }
    UI.updatePlayerInfo(window.player);
    saveGameState();
  } else {
    UI.addLog(`[상점] 골드가 부족합니다. (필요: ${item.price}G)`, 'error');
  }
};

// 프롤로그 표시 (한 번에 전체 텍스트 표시)
function showPrologue() {
  const prologueText = [
    "어느 날, 평화로운 마을 근처에 어둠의 기운이 감돌기 시작했습니다.",
    "마을 사람들은 점차 실종되고, 괴물들의 출몰이 빈번해졌습니다.",
    "당신은 이 사태의 원인을 밝히기 위해 모험을 시작합니다..."
  ];
  
  const eventLog = document.getElementById('eventLog');
  
  // 모든 텍스트를 한 번에 표시
  eventLog.innerHTML = prologueText.join('<br><br>');
  eventLog.scrollTop = eventLog.scrollHeight;
  
  // 바로 게임 시작 메시지 추가
  setTimeout(() => {
    UI.addLog('\n[필드] 모험을 시작합니다!', 'info');
  }, 300);
}

// 게임 시작 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 초기 상태 설정 (필드에서 시작)
  currentGameState = GameState.IN_FIELD;
  updateActionButtons();
  
  // 스토리 진행 버튼 (필드에서만 표시됨)
  const proceedStoryBtn = document.getElementById('proceedStory');
  if (proceedStoryBtn) {
    proceedStoryBtn.addEventListener('click', proceedStory);
  } else {
    console.warn('proceedStory button not found');
  }
  
  // 프롤로그 표시
  showPrologue();
});

// 게임 상태 저장 함수
function saveGameState() {
  if (!window.player) return;
  
  const state = {
    player: {
      // 기본 정보
      name: window.player.name,
      job: window.player.job,
      level: window.player.level,
      exp: window.player.exp,
      gold: window.player.gold,
      days: window.player.days,
      
      // 스탯
      stats: { ...window.player.stats },
      
      // 체력/마나
      hp: window.player.hp,
      maxHp: window.player.maxHp,
      
      // 인벤토리 및 장비
      inventory: JSON.parse(JSON.stringify(window.player.inventory || [])),
      equipment: JSON.parse(JSON.stringify(window.player.equipment || {})),
      
      // 스킬
      skills: {
        active: [...(window.player.skills?.active || [])],
        passive: [...(window.player.skills?.passive || [])]
      },
      
      // 퀘스트
      quests: window.player.quests ? JSON.parse(JSON.stringify(window.player.quests)) : []
    },
    
    // UI 상태
    gameState: currentGameState,
    gameDay: document.getElementById('gameDay')?.textContent || '1일째',
    eventLog: document.getElementById('eventLog')?.innerHTML || ''
  };
  
  try {
    localStorage.setItem('trpg_save', JSON.stringify(state));
    console.log('게임 상태 저장됨');
  } catch (e) {
    console.error('게임 저장 실패:', e);
    UI.showNotification('게임 저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.', 'error');
  }
}

// 게임 상태 불러오기
function loadGameState() {
  try {
    const savedData = localStorage.getItem('trpg_save');
    if (!savedData) return null;
    
    const state = JSON.parse(savedData);
    if (!state || !state.player) return null;
    
    // 플레이어 생성
    const player = new Player(state.player.name, state.player.job);
    
    // 기본 속성 복원
    Object.assign(player, {
      level: state.player.level || 1,
      exp: state.player.exp || 0,
      gold: state.player.gold || 50,
      days: state.player.days || 0,
      hp: Math.min(state.player.hp || player.maxHp, player.maxHp),
      maxHp: state.player.maxHp || player.maxHp,
      stats: { ...player.stats, ...(state.player.stats || {}) },
      inventory: state.player.inventory || [],
      equipment: { ...player.equipment, ...(state.player.equipment || {}) },
      skills: {
        active: state.player.skills?.active || [],
        passive: state.player.skills?.passive || []
      },
      quests: state.player.quests || []
    });
    
    // 게임 상태 복원
    if (state.gameState) {
      currentGameState = state.gameState;
    }
    
    // UI 업데이트
    UI.updatePlayerInfo(player);
    if (state.gameDay) {
      document.getElementById('gameDay').textContent = state.gameDay;
    }
    if (state.eventLog) {
      document.getElementById('eventLog').innerHTML = state.eventLog;
    }
    
    // 플레이어 전역 변수에 할당
    window.player = player;
    
    // 탭 업데이트
    updateActionButtons();
    
    UI.showNotification('게임을 불러왔습니다!', 'success');
    return player;
    
  } catch (e) {
    console.error('게임 불러오기 실패:', e);
    UI.showNotification('저장된 게임을 불러오는데 실패했습니다.', 'error');
    return null;
  }
}

// 저장된 게임이 있는지 확인
function hasSavedGame() {
  return !!localStorage.getItem('trpg_save');
}

// 기존 이벤트 함수들 유지
function randomEvent() {
  // 이 함수는 이제 사용되지 않지만, 기존 코드와의 호환성을 위해 남겨둠
  if (!player) return;
  player.nextDay();
  
  // 랜덤 이벤트 선택
  const events = [
    { name: '전투', action: fetchEnemy },
    { name: '휴식', action: restAtInn },
    { name: '상점', action: visitShop },
    { name: '탐험', action: explore },
    { name: '퀘스트', action: () => QuestSystem.assignRandomQuest(player) }
  ];

  const choiceContainer = document.getElementById('choiceContainer');
  if (choiceContainer) {
    choiceContainer.innerHTML = ''; // Clear previous choices
    events.forEach(e => {
      const btn = document.createElement("button");
      btn.innerText = e.name;
      btn.onclick = e.action;
      btn.className = 'action-button';
      choiceContainer.appendChild(btn);
    });
  }
}

async function fetchEnemy() {
  // 이미 전투 중이면 무시
  if (currentGameState === GameState.IN_COMBAT) return;
  
  // 전투 상태로 설정
  const previousState = currentGameState;
  currentGameState = GameState.IN_COMBAT;
  updateActionButtons();
  
  try {
    UI.addLog('[전투] 적을 발견했습니다!', 'combat');
    
    const enemy = getRandomEnemy();
    if (!enemy) {
      console.error('No valid enemies found for current level');
      UI.updateEventLog('적을 찾을 수 없습니다. 마을로 돌아가세요.');
      return;
    }
    
    const validEnemy = {
      ...enemy,
      maxHp: enemy.hp,
      atk: enemy.attack,
      xpReward: enemy.exp,
      goldReward: typeof enemy.gold === 'string' ? 10 : enemy.gold
    };
    
    // Start combat with the enemy
    await Combat.start(window.player, validEnemy);
    window.player.nextDay();
    UI.updatePlayerInfo(window.player);
  } catch (error) {
    console.error('전투 중 오류 발생:', error);
    UI.addLog('[오류] 전투를 처리하는 중 문제가 발생했습니다.', 'error');
  } finally {
    // 전투가 끝나면 이전 상태로 복원
    if (currentGameState === GameState.IN_COMBAT) {
      currentGameState = previousState;
      updateActionButtons();
    }
  }
}

function restAtInn() {
  player.heal(30);
  player.spendGold(10);
  UI.showNotification("휴식을 취했습니다. HP가 회복되었습니다.");
  UI.updatePlayerInfo(player);
}


function explore() {
  const foundGold = Math.floor(Math.random() * 20) + 5;
  player.gold += foundGold;
  UI.showNotification(`탐험 중 ${foundGold}G를 발견했습니다!`);
  UI.updatePlayerInfo(player);
}
