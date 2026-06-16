import { GameState } from './state/GameState.js';
import { InputHandler } from './input/InputHandler.js';
import { PhaserRenderer } from './render/PhaserRenderer.js';
import { GameLoop } from './core/GameLoop.js';

import { initFirebase, loginWithGoogle, logout, onAuth } from './services/firebase.js';
import {
  applyLoadedPlayerDataToState,
  loadPlayerData,
  checkPlayerDataExists,
  makePlayerSaveSnapshot,
  savePlayerData,
  HybridSaveManager,
  BrowserStorageManager,
} from './services/playerStore.js';

import { InputSystem } from './systems/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { AISystem } from './systems/AISystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { SkillSystem } from './systems/SkillSystem.js';
import { MonsterAttackSystem } from './systems/MonsterAttackSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { InventorySystem } from './systems/InventorySystem.js';
import { BossAISystem } from './systems/BossAISystem.js';
import { ZoneSystem } from './systems/ZoneSystem.js';
import { MultiplayerSystem } from './systems/MultiplayerSystem.js';

import { createItem, createConsumable, getUpgradeSuccessRate, getUpgradeCost } from './data/items.js';
import { PerformanceManager } from './utils/PerformanceManager.js';

let state = null;
let loop = null;
let inputHandler = null;
let saveManager = null;
let performanceManager = null;
let multiplayerSystem = null;

// Sync window.multiplayerSystem with module variable
Object.defineProperty(window, 'multiplayerSystem', {
  get: () => multiplayerSystem,
  set: (v) => { multiplayerSystem = v; },
  configurable: true,
});

// Global save function for activity-based auto-saving
async function saveOnActivity(activityType = 'general') {
  if (saveManager && state) {
    await saveManager.saveOnActivity(state, activityType);
  }
}

// Global functions for upgrade UI
window.getUpgradeSuccessRate = null;
window.getUpgradeCost = null;

// Expose upgrade functions to global scope
function exposeUpgradeFunctions() {
  window.getUpgradeSuccessRate = getUpgradeSuccessRate;
  window.getUpgradeCost = getUpgradeCost;
}

// Check for existing save data and prompt user
async function checkExistingSaveData(uid) {
  if (!uid) {
    // Check browser storage for guest users
    return checkBrowserSaveDataExists();
  }
  
  try {
    const hasData = await checkPlayerDataExists(db, uid);
    return hasData;
  } catch (error) {
    console.error('Error checking save data:', error);
    return false;
  }
}

// Show save data confirmation dialog
function showSaveDataDialog(onLoad, onNew) {
  // Create modal dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid rgba(100, 150, 255, 0.3);
    border-radius: 16px;
    padding: 32px;
    color: #d7e3ff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    z-index: 10000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    min-width: 400px;
    text-align: center;
  `;

  dialog.innerHTML = `
    <h2 style="margin: 0 0 16px 0; color: #6496ff; font-size: 24px;">저장된 데이터 발견</h2>
    <p style="margin: 0 0 24px 0; color: #8a9ab0; line-height: 1.5;">
      이전에 저장된 게임 데이터가 있습니다.<br>
      불러오시겠습니까?
    </p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="btn-load-save" style="
        background: linear-gradient(135deg, #6496ff, #4169e1);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      ">불러오기</button>
      <button id="btn-new-game" style="
        background: linear-gradient(135deg, #ff6b6b, #ff5252);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      ">새 게임</button>
    </div>
  `;

  // Add hover effects
  const loadBtn = dialog.querySelector('#btn-load-save');
  const newBtn = dialog.querySelector('#btn-new-game');
  
  loadBtn.addEventListener('mouseenter', () => {
    loadBtn.style.transform = 'scale(1.05)';
    loadBtn.style.boxShadow = '0 4px 20px rgba(100, 150, 255, 0.4)';
  });
  
  loadBtn.addEventListener('mouseleave', () => {
    loadBtn.style.transform = 'scale(1)';
    loadBtn.style.boxShadow = 'none';
  });
  
  newBtn.addEventListener('mouseenter', () => {
    newBtn.style.transform = 'scale(1.05)';
    newBtn.style.boxShadow = '0 4px 20px rgba(255, 107, 107, 0.4)';
  });
  
  newBtn.addEventListener('mouseleave', () => {
    newBtn.style.transform = 'scale(1)';
    newBtn.style.boxShadow = 'none';
  });

  // Add event listeners
  loadBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
    document.body.removeChild(backdrop);
    onLoad();
  });

  newBtn.addEventListener('click', () => {
    document.body.removeChild(dialog);
    document.body.removeChild(backdrop);
    onNew();
  });

  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    backdrop-filter: blur(5px);
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);

  // Auto-focus first button
  loadBtn.focus();
}

// Wait for character selection before starting the game
window.addEventListener('characterSelected', (e) => {
  const selectedCharacter = e.detail.character;
  startGame(selectedCharacter);
});

function startGameWithLoadedData(characterType, loadedData) {
  // Check if already started
  if (state) return;
  
  // Create game state with loaded character type
  state = new GameState(characterType);
  inputHandler = new InputHandler();
  
  // Initialize performance manager
  performanceManager = new PerformanceManager();
  performanceManager.enableMonitoring();
  
  // Set state globally for upgrade UI
  window.state = state;
  
  // Apply loaded data to state
  applyLoadedPlayerDataToState(state, loadedData);
  
  // Initialize hybrid save manager
  saveManager = new HybridSaveManager(db, currentUid);

  const inventorySystem = new InventorySystem();

  // Add initial items if not present in loaded data
  if (!state.player.inventory || state.player.inventory.length === 0) {
    inventorySystem.addItem(state, 'weapon', 'w1');
    inventorySystem.addItem(state, 'armor', 'a1');
    inventorySystem.addItem(state, 'accessory', 'ac1');

    inventorySystem.equipItem(state, state.player.inventory[0].id);
    inventorySystem.equipItem(state, state.player.inventory[0].id);
    inventorySystem.equipItem(state, state.player.inventory[0].id);
  }

  // Add consumables if not present
  if (!state.player.consumableSlots || state.player.consumableSlots.length === 0) {
    inventorySystem.addConsumable(state, 1, 'potion_hp');
    inventorySystem.addConsumable(state, 2, 'potion_hp');
    inventorySystem.addConsumable(state, 3, 'potion_elixir');
    inventorySystem.addConsumable(state, 4, 'potion_berserk');
  }

  const renderer = new PhaserRenderer({
    parentId: 'app',
    width: 1280,
    height: 720,
  });

  // Expose performance manager globally
  window.performanceManager = performanceManager;

  const bossAISystem = new BossAISystem();
  
  const systems = [
    new InputSystem(inputHandler),
    new ZoneSystem(renderer),
    new AISystem(),
    bossAISystem,
    new MovementSystem(),
    new SkillSystem(),
    new MonsterAttackSystem(),
    new NPCSystem(),
    new InventorySystem(),
    new CollisionSystem(),
  ];

  if (multiplayerSystem) {
    systems.push(multiplayerSystem);
  }

  loop = new GameLoop({ state, renderer, systems });
  loop.start();

  // Auto-save every 30 seconds
  if (saveManager && currentUid) {
    saveManager.startAutoSave(state, 30000);
  }

  // Save on activity
  window.saveOnActivity = saveOnActivity;

  // Expose upgrade functions
  exposeUpgradeFunctions();

  // Hide character selection
  hideCharacterSelection();
  
  console.log(`Game started with loaded data for character: ${characterType}`);
}

function showCharacterSelection() {
  const charSelect = document.getElementById('char-select');
  if (charSelect) {
    charSelect.style.display = 'block';
  }
}

function hideCharacterSelection() {
  const charSelect = document.getElementById('char-select');
  if (charSelect) {
    charSelect.style.display = 'none';
  }
}

function startGame(characterType) {
  // Check if already started
  if (state) return;
  
  // Create game state with selected character
  state = new GameState(characterType);
  inputHandler = new InputHandler();
  
  // Initialize performance manager
  performanceManager = new PerformanceManager();
  performanceManager.enableMonitoring();
  
  // Set state globally for upgrade UI
  window.state = state;
  
  // Initialize hybrid save manager
  saveManager = new HybridSaveManager(db, currentUid);

  const inventorySystem = new InventorySystem();

  inventorySystem.addItem(state, 'weapon', 'w1');
  inventorySystem.addItem(state, 'armor', 'a1');
  inventorySystem.addItem(state, 'accessory', 'ac1');

  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);

  inventorySystem.addConsumable(state, 1, 'potion_hp');
  inventorySystem.addConsumable(state, 2, 'potion_hp');
  inventorySystem.addConsumable(state, 3, 'potion_elixir');
  inventorySystem.addConsumable(state, 4, 'potion_berserk');

  const renderer = new PhaserRenderer({
    parentId: 'app',
    width: 1280,
    height: 720,
  });

  // Expose performance manager globally
  window.performanceManager = performanceManager;

  const bossAISystem = new BossAISystem();
  
  const systems = [
    new InputSystem(inputHandler),
    new ZoneSystem(renderer),
    new AISystem(),
    bossAISystem,
    new MovementSystem(),
    new SkillSystem(),
    new MonsterAttackSystem(),
    new NPCSystem(),
    new InventorySystem(),
    new CollisionSystem(),
  ];

  // Add multiplayer system if active
  if (multiplayerSystem) {
    systems.push(multiplayerSystem);
  }

  // Store reference to BossAISystem in state for SkillSystem to access
  state.bossAISystem = bossAISystem;

  loop = new GameLoop({ state, renderer, systems });
  loop.start();

  // Start auto-save (data loading will be handled separately)
  if (saveManager && currentUid) {
    saveManager.startAutoSave(state);
  }
  
  // Expose upgrade functions to global scope
  exposeUpgradeFunctions();
  
  // Hide character selection
  hideCharacterSelection();
  
  console.log(`Game started with character: ${characterType}`);
}

async function loadGameData() {
  try {
    const result = await saveManager.loadGame();
    if (result.success && result.data) {
      applyLoadedPlayerDataToState(state, result.data);
      console.log(`Game loaded from ${result.location} storage`);
    } else {
      console.log('No saved data found, starting fresh game');
    }
  } catch (error) {
    console.error('Failed to load game data:', error);
  }
}

const { auth, db, rdb } = initFirebase();

const elStatus = document.getElementById('auth-status');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

let currentUid = null;

btnLogin?.addEventListener('click', async () => {
  try {
    await loginWithGoogle(auth);
  } catch (e) {
    console.error(e);
    if (elStatus) elStatus.textContent = 'Auth: login failed';
  }
});

btnLogout?.addEventListener('click', async () => {
  try {
    await logout(auth);
  } catch (e) {
    console.error(e);
  }
});

onAuth(auth, async (user) => {
  currentUid = user?.uid ?? null;

  if (!user) {
    if (elStatus) elStatus.textContent = 'Auth: signed out (playing as guest)';
    if (btnLogin) btnLogin.disabled = false;
    if (btnLogout) btnLogout.disabled = true;
    
    // Update save manager for guest mode
    if (saveManager) {
      saveManager.setFirebaseUser(null);
    }
    return;
  }

  if (elStatus) elStatus.textContent = `Auth: ${user.displayName ?? user.email ?? user.uid}`;
  if (btnLogin) btnLogin.disabled = true;
  if (btnLogout) btnLogout.disabled = false;

  // Update save manager for logged in user
  if (saveManager) {
    saveManager.setFirebaseUser(user.uid);
  }

  // Only apply data if game has started
  if (!state) return;

  try {
    const result = await saveManager.loadGame();
    if (result.success && result.data) {
      applyLoadedPlayerDataToState(state, result.data);
      console.log(`Game loaded from ${result.location} storage for user: ${user.uid}`);
    }
  } catch (error) {
    console.error('Failed to load game data:', error);
  }
});

// Initialize game on page load
async function initializeGame() {
  try {
    console.log('Initializing game...');
    
    // Initialize save manager for guest mode initially
    saveManager = new HybridSaveManager(db, null);
    
    // Check if user is already authenticated
    const user = auth.currentUser;
    if (user) {
      currentUid = user.uid;
      saveManager.setFirebaseUser(user.uid);
      console.log('User already authenticated:', user.uid);
    }
    
    // Check for existing save data before showing character selection
    const hasSaveData = await checkExistingSaveData(currentUid);
    console.log('Has save data:', hasSaveData);
    
    if (hasSaveData) {
      console.log('Showing save data dialog...');
      showSaveDataDialog(
        // Load existing data
        async () => {
          try {
            const result = await saveManager.loadGame();
            if (result.success && result.data) {
              // Start game with loaded character type
              const characterType = result.data.characterType || 'sura';
              startGameWithLoadedData(characterType, result.data);
            } else {
              // Fallback to character selection
              showCharacterSelection();
            }
          } catch (error) {
            console.error('Failed to load game data:', error);
            showCharacterSelection();
          }
        },
        // Start new game
        () => {
          showCharacterSelection();
        }
      );
    } else {
      // No save data, show character selection
      console.log('No save data found, showing character selection...');
      showCharacterSelection();
    }
  } catch (error) {
    console.error('Error initializing game:', error);
    // Fallback to character selection
    showCharacterSelection();
  }
}

async function persistGame() {
  if (!saveManager || !state) return;
  try {
    const result = await saveManager.saveGame(state);
    if (result.success) {
      console.log(`Game saved to ${result.location} storage`);
      
      // Debug: Check if data is actually in localStorage
      if (result.location === 'browser') {
        const savedData = localStorage.getItem('lostark_game_save');
        console.log('LocalStorage check:', savedData ? 'Data exists' : 'No data found');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          console.log('Saved data keys:', Object.keys(parsed));
        }
      }
    } else {
      console.log('Game save failed');
    }
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

setInterval(persistGame, 60_000); // Save every minute instead of 10 seconds

window.addEventListener('beforeunload', () => {
  void persistGame();
  if (multiplayerSystem) {
    multiplayerSystem.cleanup();
  }
});

/* ---------- Multiplayer API ---------- */

function getPlayerDisplayName() {
  const user = auth.currentUser;
  return user?.displayName || user?.email || user?.uid || 'Guest';
}

async function createMultiplayerRoom(characterType) {
  if (!auth.currentUser) {
    alert('멀티플레이어는 로그인이 필요합니다.');
    return null;
  }
  try {
    multiplayerSystem = new MultiplayerSystem(rdb, currentUid, getPlayerDisplayName(), characterType);
    const roomId = await multiplayerSystem.createRoom();
    console.log('Room created:', roomId);
    return roomId;
  } catch (e) {
    console.error('Failed to create room:', e);
    alert('방 생성 실패: ' + e.message);
    return null;
  }
}

async function joinMultiplayerRoom(roomCode, characterType) {
  if (!auth.currentUser) {
    alert('멀티플레이어는 로그인이 필요합니다.');
    return false;
  }
  try {
    multiplayerSystem = new MultiplayerSystem(rdb, currentUid, getPlayerDisplayName(), characterType);
    await multiplayerSystem.joinRoom(roomCode);
    console.log('Joined room:', roomCode);
    return true;
  } catch (e) {
    console.error('Failed to join room:', e);
    alert('방 참가 실패: ' + e.message);
    return false;
  }
}

function setMultiplayerReady(ready = true) {
  if (!multiplayerSystem) return;
  multiplayerSystem.setReady(ready);
}

async function startMultiplayerGameFromLobby(characterType) {
  if (!multiplayerSystem || !multiplayerSystem.isHost) {
    alert('방장만 게임을 시작할 수 있습니다.');
    return;
  }

  // Try to load saved character data first
  let savedData = null;
  if (saveManager) {
    try {
      const result = await saveManager.loadGame();
      if (result.success && result.data) {
        savedData = result.data;
        console.log('Loaded saved character data for multiplayer host');
      }
    } catch (e) {
      console.warn('Failed to load saved data, starting fresh:', e);
    }
  }

  // Initialize game state
  state = new GameState(characterType);
  inputHandler = new InputHandler();
  performanceManager = new PerformanceManager();
  performanceManager.enableMonitoring();
  window.state = state;

  // Mark as multiplayer
  state.isMultiplayer = true;
  state.isHost = true;
  state.roomId = multiplayerSystem.roomId;
  state.localPlayerId = currentUid;

  // Apply saved data if available
  if (savedData) {
    applyLoadedPlayerDataToState(state, savedData);
    console.log('Applied saved character data to multiplayer host state');
  }

  // Move local player from 'local' key to uid key
  const localPlayer = state.players['local'];
  delete state.players['local'];
  state.players[currentUid] = localPlayer;

  // Initialize remote players and start RDB sync
  await multiplayerSystem.startGame(state);

  const inventorySystem = new InventorySystem();
  inventorySystem.addItem(state, 'weapon', 'w1');
  inventorySystem.addItem(state, 'armor', 'a1');
  inventorySystem.addItem(state, 'accessory', 'ac1');
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.addConsumable(state, 1, 'potion_hp');
  inventorySystem.addConsumable(state, 2, 'potion_hp');
  inventorySystem.addConsumable(state, 3, 'potion_elixir');
  inventorySystem.addConsumable(state, 4, 'potion_berserk');

  const renderer = new PhaserRenderer({ parentId: 'app', width: 1280, height: 720 });
  window.performanceManager = performanceManager;

  const bossAISystem = new BossAISystem();

  const systems = [
    new InputSystem(inputHandler),
    new ZoneSystem(renderer),
    new AISystem(),
    bossAISystem,
    new MovementSystem(),
    new SkillSystem(),
    new MonsterAttackSystem(),
    new NPCSystem(),
    new InventorySystem(),
    new CollisionSystem(),
    multiplayerSystem,
  ];

  state.bossAISystem = bossAISystem;

  loop = new GameLoop({ state, renderer, systems });
  loop.start();

  exposeUpgradeFunctions();
  hideCharacterSelection();
  hideMultiplayerLobby();

  console.log('Multiplayer game started as host');
}

async function joinMultiplayerGameInProgress(characterType) {
  if (!multiplayerSystem) return;

  // Try to load saved character data first
  let savedData = null;
  if (saveManager) {
    try {
      const result = await saveManager.loadGame();
      if (result.success && result.data) {
        savedData = result.data;
        console.log('Loaded saved character data for multiplayer');
      }
    } catch (e) {
      console.warn('Failed to load saved data, starting fresh:', e);
    }
  }

  // Create state with character type (will be overridden by saved data if available)
  state = new GameState(characterType);
  inputHandler = new InputHandler();
  performanceManager = new PerformanceManager();
  performanceManager.enableMonitoring();
  window.state = state;

  state.isMultiplayer = true;
  state.isHost = false;
  state.roomId = multiplayerSystem.roomId;
  state.localPlayerId = currentUid;

  // Apply saved data if available and matches character type
  if (savedData) {
    applyLoadedPlayerDataToState(state, savedData);
    console.log('Applied saved character data to multiplayer state');
  }

  // Move local player from 'local' key to uid key
  const localPlayer = state.players['local'];
  delete state.players['local'];
  state.players[currentUid] = localPlayer;

  const inventorySystem = new InventorySystem();
  inventorySystem.addItem(state, 'weapon', 'w1');
  inventorySystem.addItem(state, 'armor', 'a1');
  inventorySystem.addItem(state, 'accessory', 'ac1');
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.equipItem(state, state.player.inventory[0].id);
  inventorySystem.addConsumable(state, 1, 'potion_hp');
  inventorySystem.addConsumable(state, 2, 'potion_hp');
  inventorySystem.addConsumable(state, 3, 'potion_elixir');
  inventorySystem.addConsumable(state, 4, 'potion_berserk');

  const renderer = new PhaserRenderer({ parentId: 'app', width: 1280, height: 720 });
  window.performanceManager = performanceManager;

  const bossAISystem = new BossAISystem();

  const systems = [
    new InputSystem(inputHandler),
    new ZoneSystem(renderer),
    new AISystem(),
    bossAISystem,
    new MovementSystem(),
    new SkillSystem(),
    new MonsterAttackSystem(),
    new NPCSystem(),
    new InventorySystem(),
    new CollisionSystem(),
    multiplayerSystem,
  ];

  state.bossAISystem = bossAISystem;

  loop = new GameLoop({ state, renderer, systems });
  loop.start();

  exposeUpgradeFunctions();
  hideCharacterSelection();
  hideMultiplayerLobby();

  console.log('Multiplayer game started as client');
}

function leaveMultiplayerRoom() {
  if (multiplayerSystem) {
    multiplayerSystem.cleanup();
    multiplayerSystem = null;
  }
}

// Expose to window for UI access
window.createMultiplayerRoom = createMultiplayerRoom;
window.joinMultiplayerRoom = joinMultiplayerRoom;
window.setMultiplayerReady = setMultiplayerReady;
window.startMultiplayerGameFromLobby = startMultiplayerGameFromLobby;
window.joinMultiplayerGameInProgress = joinMultiplayerGameInProgress;
window.leaveMultiplayerRoom = leaveMultiplayerRoom;
