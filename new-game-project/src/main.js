import { GameState } from './state/GameState.js';
import { InputHandler } from './input/InputHandler.js';
import { PhaserRenderer } from './render/PhaserRenderer.js';
import { GameLoop } from './core/GameLoop.js';

import { initFirebase, loginWithGoogle, logout, onAuth } from './services/firebase.js';
import {
  applyLoadedPlayerDataToState,
  loadPlayerData,
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
import { NPCSystem } from './systems/NPCSystem.js';
import { InventorySystem } from './systems/InventorySystem.js';
import { BossAISystem } from './systems/BossAISystem.js';
import { ZoneSystem } from './systems/ZoneSystem.js';

import { createItem, createConsumable, getUpgradeSuccessRate, getUpgradeCost } from './data/items.js';

let state = null;
let loop = null;
let inputHandler = null;
let saveManager = null;

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

// Wait for character selection before starting the game
window.addEventListener('characterSelected', (e) => {
  const selectedCharacter = e.detail.character;
  startGame(selectedCharacter);
});

function startGame(characterType) {
  // Check if already started
  if (state) return;
  
  // Create game state with selected character
  state = new GameState(characterType);
  inputHandler = new InputHandler();
  
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

  const bossAISystem = new BossAISystem();
  
  const systems = [
    new InputSystem(inputHandler),
    new ZoneSystem(renderer),
    new AISystem(),
    bossAISystem,
    new MovementSystem(),
    new SkillSystem(),
    new NPCSystem(),
    new InventorySystem(),
    new CollisionSystem(),
  ];
  
  // Store reference to BossAISystem in state for SkillSystem to access
  state.bossAISystem = bossAISystem;

  loop = new GameLoop({ state, renderer, systems });
  loop.start();
  
  // Load saved data and start auto-save
  loadGameData();
  saveManager.startAutoSave(state);
  
  // Expose upgrade functions to global scope
  exposeUpgradeFunctions();
  
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

const { auth, db } = initFirebase();

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
  } catch (e) {
    console.error('Failed to load user data:', e);
  }
});

async function persistGame() {
  if (!saveManager || !state) return;
  try {
    const result = await saveManager.saveGame(state);
    if (result.success) {
      console.log(`Game saved to ${result.location} storage`);
    }
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

setInterval(persistGame, 60_000); // Save every minute instead of 10 seconds

window.addEventListener('beforeunload', () => {
  void persistGame();
});
