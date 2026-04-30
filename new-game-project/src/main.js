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

import { createItem, createConsumable } from './data/items.js';

const state = new GameState();
const inputHandler = new InputHandler();

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
  width: 960,
  height: 540,
});

const systems = [
  new InputSystem(inputHandler),
  new ZoneSystem(),
  new AISystem(),
  new BossAISystem(),
  new MovementSystem(),
  new SkillSystem(),
  new NPCSystem(),
  new InventorySystem(),
  new CollisionSystem(),
];

const loop = new GameLoop({ state, renderer, systems });
loop.start();

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
    if (elStatus) elStatus.textContent = 'Auth: signed out';
    if (btnLogin) btnLogin.disabled = false;
    if (btnLogout) btnLogout.disabled = true;
    return;
  }

  if (elStatus) elStatus.textContent = `Auth: ${user.displayName ?? user.email ?? user.uid}`;
  if (btnLogin) btnLogin.disabled = true;
  if (btnLogout) btnLogout.disabled = false;

  try {
    const data = await loadPlayerData(db, user.uid);
    applyLoadedPlayerDataToState(state, data);
  } catch (e) {
    console.error(e);
  }
});

async function persistIfAuthed() {
  if (!currentUid) return;
  const snapshot = makePlayerSaveSnapshot(state);
  try {
    await savePlayerData(db, currentUid, snapshot);
  } catch (e) {
    console.error(e);
  }
}

setInterval(persistIfAuthed, 10_000);

window.addEventListener('beforeunload', () => {
  void persistIfAuthed();
});
