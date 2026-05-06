import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export function makePlayerSaveSnapshot(state) {
  return {
    // Basic stats
    level: state.player.level ?? 1,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    gold: state.player.gold,
    
    // Position and movement
    position: {
      x: state.player.x,
      y: state.player.y,
    },
    targetPosition: {
      x: state.player.targetX,
      y: state.player.targetY,
    },
    
    // Speed stats
    movementSpeed: state.player.movementSpeed,
    attackSpeed: state.player.attackSpeed,
    
    // Skills and cooldowns
    skills: state.player.skills,
    
    // Equipment
    equipment: state.player.equipment,
    
    // Consumables
    consumableSlots: state.player.consumableSlots,
    
    // Character gauge system
    gauge: state.player.gauge,
    
    // Zone and progress
    currentZone: state.currentZone,
    
    // Statistics
    stats: state.player.stats || {
      monstersKilled: 0,
      damageDealt: 0,
      goldEarned: 0,
      deaths: 0,
      timePlayed: 0,
      skillsUsed: {},
    },
    
    // Timestamp
    savedAt: Date.now(),
  };
}

export async function loadPlayerData(db, uid) {
  const ref = doc(db, 'players', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function savePlayerData(db, uid, snapshot) {
  const ref = doc(db, 'players', uid);
  await setDoc(
    ref,
    {
      ...snapshot,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function applyLoadedPlayerDataToState(state, data) {
  if (!data) return;

  // Basic stats
  if (typeof data.level === 'number') state.player.level = data.level;
  if (typeof data.hp === 'number') state.player.hp = data.hp;
  if (typeof data.maxHp === 'number') state.player.maxHp = data.maxHp;
  if (typeof data.gold === 'number') state.player.gold = data.gold;

  // Position and movement - always respawn at town entrance
  state.player.x = 100;  // 마을 입구 위치 (왼쪽)
  state.player.y = 270;  // 중앙 높이
  state.player.targetX = 100;
  state.player.targetY = 270;

  // Speed stats
  if (typeof data.movementSpeed === 'number') state.player.movementSpeed = data.movementSpeed;
  if (typeof data.attackSpeed === 'number') state.player.attackSpeed = data.attackSpeed;

  // Skills and cooldowns
  if (data.skills) {
    state.player.skills = data.skills;
  }

  // Equipment
  if (data.equipment) {
    state.player.equipment = data.equipment;
  }

  // Consumables
  if (data.consumableSlots) {
    state.player.consumableSlots = data.consumableSlots;
  }

  // Character gauge system
  if (data.gauge) {
    state.player.gauge = data.gauge;
  }

  // Zone and progress - always start in town
  state.currentZone = 'town';

  // Statistics
  if (data.stats) {
    state.player.stats = data.stats;
  }
}

// Auto-save manager
export class AutoSaveManager {
  constructor(db, uid, saveInterval = 30000) { // 30 seconds default
    this.db = db;
    this.uid = uid;
    this.saveInterval = saveInterval;
    this.lastSaveTime = 0;
    this.pendingSave = false;
    this.saveTimer = null;
  }

  startAutoSave(state) {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    this.saveTimer = setInterval(() => {
      this.performAutoSave(state);
    }, this.saveInterval);
  }

  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  async performAutoSave(state) {
    const now = Date.now();
    if (this.pendingSave || now - this.lastSaveTime < this.saveInterval) {
      return;
    }

    this.pendingSave = true;
    try {
      const snapshot = makePlayerSaveSnapshot(state);
      await savePlayerData(this.db, this.uid, snapshot);
      this.lastSaveTime = now;
      console.log('Auto-save completed at', new Date().toISOString());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      this.pendingSave = false;
    }
  }

  async forceSave(state) {
    this.lastSaveTime = 0; // Override the cooldown
    await this.performAutoSave(state);
  }
}

// Statistics tracker
export function updatePlayerStats(state, eventType, data) {
  if (!state.player.stats) {
    state.player.stats = {
      monstersKilled: 0,
      damageDealt: 0,
      goldEarned: 0,
      deaths: 0,
      timePlayed: 0,
      skillsUsed: {},
      bossesDefeated: 0,
      criticalHits: 0,
    };
  }

  const stats = state.player.stats;

  switch (eventType) {
    case 'monsterKill':
      stats.monstersKilled += data.count || 1;
      if (data.gold) stats.goldEarned += data.gold;
      break;
    
    case 'damageDealt':
      stats.damageDealt += data.amount;
      if (data.isCritical) stats.criticalHits += 1;
      break;
    
    case 'goldEarned':
      stats.goldEarned += data.amount;
      break;
    
    case 'death':
      stats.deaths += 1;
      break;
    
    case 'skillUsed':
      const skillKey = data.skillKey;
      if (skillKey) {
        if (!stats.skillsUsed) {
          stats.skillsUsed = {};
        }
        stats.skillsUsed[skillKey] = (stats.skillsUsed[skillKey] || 0) + 1;
      }
      break;
    
    case 'bossDefeated':
      stats.bossesDefeated += 1;
      if (data.gold) stats.goldEarned += data.gold;
      break;
    
    case 'timePlayed':
      stats.timePlayed += data.amount;
      break;
  }
}

// Browser storage manager for temporary saves
export class BrowserStorageManager {
  constructor() {
    this.storageKey = 'lostark_game_save';
    this.tempIdKey = 'lostark_temp_id';
  }

  // Get or create temporary player ID
  getTempPlayerId() {
    let tempId = localStorage.getItem(this.tempIdKey);
    if (!tempId) {
      tempId = 'temp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem(this.tempIdKey, tempId);
    }
    return tempId;
  }

  // Save player data to browser storage
  saveToBrowser(state) {
    try {
      const snapshot = makePlayerSaveSnapshot(state);
      const tempId = this.getTempPlayerId();
      
      const saveData = {
        tempId: tempId,
        data: snapshot,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(saveData));
      console.log('Game saved to browser storage for temp player:', tempId);
      return true;
    } catch (error) {
      console.error('Failed to save to browser storage:', error);
      return false;
    }
  }

  // Load player data from browser storage
  loadFromBrowser() {
    try {
      const saveData = localStorage.getItem(this.storageKey);
      if (!saveData) return null;
      
      const parsed = JSON.parse(saveData);
      
      // Check if save data is valid
      if (!parsed.data || !parsed.tempId) {
        console.warn('Invalid save data in browser storage');
        return null;
      }
      
      console.log('Game loaded from browser storage for temp player:', parsed.tempId);
      return parsed.data;
    } catch (error) {
      console.error('Failed to load from browser storage:', error);
      return null;
    }
  }

  // Clear browser storage (for when user logs in with Firebase)
  clearBrowserStorage() {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.tempIdKey);
      console.log('Browser storage cleared');
    } catch (error) {
      console.error('Failed to clear browser storage:', error);
    }
  }

  // Check if browser storage has save data
  hasBrowserSave() {
    return localStorage.getItem(this.storageKey) !== null;
  }
}

// Hybrid save manager that handles both Firebase and browser storage
export class HybridSaveManager {
  constructor(db, uid = null) {
    this.db = db;
    this.uid = uid;
    this.browserStorage = new BrowserStorageManager();
    this.autoSaveManager = null;
  }

  // Set Firebase user ID (when user logs in)
  setFirebaseUser(uid) {
    this.uid = uid;
    if (this.autoSaveManager) {
      this.autoSaveManager.uid = uid;
    }
    
    // If user just logged in and has browser save, migrate it
    if (uid && this.browserStorage.hasBrowserSave()) {
      this.migrateBrowserSaveToFirebase();
    }
  }

  // Migrate browser save to Firebase
  async migrateBrowserSaveToFirebase() {
    try {
      const browserData = this.browserStorage.loadFromBrowser();
      if (browserData) {
        await savePlayerData(this.db, this.uid, browserData);
        this.browserStorage.clearBrowserStorage();
        console.log('Browser save migrated to Firebase for user:', this.uid);
      }
    } catch (error) {
      console.error('Failed to migrate browser save:', error);
    }
  }

  // Save game data (automatically chooses Firebase or browser storage)
  async saveGame(state) {
    if (this.uid) {
      // Firebase user - save to Firebase
      try {
        const snapshot = makePlayerSaveSnapshot(state);
        await savePlayerData(this.db, this.uid, snapshot);
        console.log('Game saved to Firebase for user:', this.uid);
        return { success: true, location: 'firebase' };
      } catch (error) {
        console.error('Firebase save failed, falling back to browser storage:', error);
        // Fallback to browser storage
        const success = this.browserStorage.saveToBrowser(state);
        return { success, location: 'browser', error };
      }
    } else {
      // No Firebase user - save to browser storage
      const success = this.browserStorage.saveToBrowser(state);
      return { success, location: 'browser' };
    }
  }

  // Load game data (automatically chooses Firebase or browser storage)
  async loadGame() {
    if (this.uid) {
      // Firebase user - try Firebase first
      try {
        const data = await loadPlayerData(this.db, this.uid);
        if (data) {
          console.log('Game loaded from Firebase for user:', this.uid);
          return { success: true, data, location: 'firebase' };
        }
      } catch (error) {
        console.error('Firebase load failed, trying browser storage:', error);
      }
      
      // Fallback to browser storage
      const browserData = this.browserStorage.loadFromBrowser();
      if (browserData) {
        console.log('Game loaded from browser storage as fallback');
        return { success: true, data: browserData, location: 'browser' };
      }
    } else {
      // No Firebase user - load from browser storage
      const browserData = this.browserStorage.loadFromBrowser();
      if (browserData) {
        console.log('Game loaded from browser storage for temp player');
        return { success: true, data: browserData, location: 'browser' };
      }
    }
    
    return { success: false, data: null, location: 'none' };
  }

  // Start auto-save
  startAutoSave(state, saveInterval = 30000) {
    if (this.uid) {
      this.autoSaveManager = new AutoSaveManager(this.db, this.uid, saveInterval);
    } else {
      // For browser storage, implement simple auto-save
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }
      
      this.autoSaveTimer = setInterval(() => {
        this.browserStorage.saveToBrowser(state);
      }, saveInterval);
    }
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.autoSaveManager) {
      this.autoSaveManager.stopAutoSave();
      this.autoSaveManager = null;
    }
    
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // Force save
  async forceSave(state) {
    if (this.autoSaveManager) {
      await this.autoSaveManager.forceSave(state);
    } else {
      await this.saveGame(state);
    }
  }

  // Immediate save for important activities (with smart debouncing)
  async saveOnActivity(state, activityType = 'general') {
    if (!this.lastActivitySave) {
      this.lastActivitySave = {};
    }
    
    const now = Date.now();
    const lastSave = this.lastActivitySave[activityType] || 0;
    
    // Smart debouncing based on activity importance
    let debounceTime = 1000; // Default 1 second
    
    // Different debounce times for different activities
    switch (activityType) {
      case 'raid_entry':
      case 'raid_exit':
      case 'boss_defeat':
        debounceTime = 500; // Very important - 0.5 second
        break;
      case 'upgrade_success':
      case 'upgrade_failed':
        debounceTime = 2000; // Less frequent - 2 seconds
        break;
      case 'equip_item':
      case 'unequip_item':
        debounceTime = 3000; // Even less frequent - 3 seconds
        break;
      case 'monster_kill':
        debounceTime = 5000; // Least frequent - 5 seconds
        break;
    }
    
    if (now - lastSave > debounceTime) {
      this.lastActivitySave[activityType] = now;
      console.log(`Auto-saving on activity: ${activityType} (debounce: ${debounceTime}ms)`);
      await this.forceSave(state);
    }
  }
}
