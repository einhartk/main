import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  remove,
  get,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js';
import { CharacterFactory } from '../characters/CharacterFactory.js';

export class MultiplayerSystem {
  constructor(rdb, currentUid, playerName, characterType) {
    this.rdb = rdb;
    this.uid = currentUid;
    this.playerName = playerName || 'Player';
    this.characterType = characterType || 'sura';
    this.roomId = null;
    this.isHost = false;
    this.role = 'none';

    this._stateSyncTimer = 0;
    this._inputSyncTimer = 0;
    this._stateSyncInterval = 0.066; // ~15 Hz
    this._inputSyncInterval = 0.05;  // ~20 Hz

    this._unsubState = null;
    this._unsubInputs = null;
    this._unsubMeta = null;

    this._lastSentState = '';
    this._lastSentInput = '';

    this.pendingHostState = null;
    this.pendingRemoteInputs = null;
  }

  /* ---------- Room lifecycle ---------- */

  async createRoom() {
    if (!this.uid) throw new Error('Must be logged in to create room');
    this.roomId = this._generateRoomCode();
    this.isHost = true;
    this.role = 'host';

    const roomRef = ref(this.rdb, `raids/${this.roomId}`);
    await set(roomRef, {
      meta: {
        host: this.uid,
        status: 'waiting',
        maxPlayers: 4,
        createdAt: Date.now(),
      },
      players: {
        [this.uid]: {
          name: this.playerName,
          characterType: this.characterType,
          ready: false,
          joinedAt: Date.now(),
        },
      },
      state: null,
      inputs: null,
    });

    const playerRef = ref(this.rdb, `raids/${this.roomId}/players/${this.uid}`);
    onDisconnect(playerRef).remove();

    this._subscribeMeta();
    return this.roomId;
  }

  async joinRoom(roomId) {
    if (!this.uid) throw new Error('Must be logged in to join room');
    this.roomId = roomId.toUpperCase().trim();
    this.isHost = false;
    this.role = 'client';

    const roomSnap = await get(ref(this.rdb, `raids/${this.roomId}`));
    if (!roomSnap.exists()) throw new Error('Room not found');

    const data = roomSnap.val();
    const playerCount = Object.keys(data.players || {}).length;
    if (playerCount >= 4) throw new Error('Room is full');
    if (data.meta?.status === 'playing') throw new Error('Game already in progress');

    const playerRef = ref(this.rdb, `raids/${this.roomId}/players/${this.uid}`);
    await set(playerRef, {
      name: this.playerName,
      characterType: this.characterType,
      ready: false,
      joinedAt: Date.now(),
    });

    onDisconnect(playerRef).remove();
    this._subscribeToState();
    this._subscribeMeta();
    return true;
  }

  setReady(ready = true) {
    if (!this.roomId || !this.uid) return;
    set(ref(this.rdb, `raids/${this.roomId}/players/${this.uid}/ready`), ready);
  }

  async startGame(state) {
    if (!this.isHost || !this.roomId) return;

    /* Ensure remote player stubs exist in state */
    const playersSnap = await get(ref(this.rdb, `raids/${this.roomId}/players`));
    const players = playersSnap.val() || {};
    for (const [uid, pdata] of Object.entries(players)) {
      if (uid === this.uid) continue;
      if (!state.players[uid]) {
        const rp = CharacterFactory.createCharacter(pdata.characterType || 'sura', {
          x: 120 + Math.random() * 120,
          y: 250 + Math.random() * 40,
          level: 1,
          gold: 0,
        });
        rp.name = pdata.name || 'Player';
        rp.isRemote = true;
        rp.targetX = rp.x;
        rp.targetY = rp.y;
        state.players[uid] = rp;
      }
    }

    set(ref(this.rdb, `raids/${this.roomId}/meta/status`), 'playing');
    this._subscribeToInputs(state);
  }

  /* ---------- GameLoop update ---------- */

  update(state, dt) {
    if (!state.isMultiplayer || !this.roomId) return;

    if (this.isHost) {
      this._hostUpdate(state, dt);
    } else {
      this._clientUpdate(state, dt);
    }

    /* Apply any pending host state (client) */
    if (this.pendingHostState) {
      this._applyHostState(state, this.pendingHostState);
      this.pendingHostState = null;
    }
  }

  _hostUpdate(state, dt) {
    /* Throttled state broadcast */
    this._stateSyncTimer += dt;
    if (this._stateSyncTimer >= this._stateSyncInterval) {
      this._stateSyncTimer = 0;
      this._syncStateToRDB(state);
    }
  }

  _clientUpdate(state, dt) {
    /* Throttled input upload */
    this._inputSyncTimer += dt;
    if (this._inputSyncTimer >= this._inputSyncInterval) {
      this._inputSyncTimer = 0;
      this._syncInputToRDB(state);
    }
  }

  /* ---------- Serialization ---------- */

  _syncStateToRDB(state) {
    if (!this.roomId) return;

    const snapshot = {
      boss: state.boss
        ? {
            hp: state.boss.hp,
            maxHp: state.boss.maxHp,
            x: state.boss.x,
            y: state.boss.y,
            targetX: state.boss.targetX,
            targetY: state.boss.targetY,
            phase: state.boss.phase || 1,
            facingAngle: state.boss.facingAngle || 0,
            isWarning: state.boss.isWarning || false,
            warningTimer: state.boss.warningTimer || 0,
            activeSkill: state.boss.activeSkill || null,
          }
        : null,
      monsters: state.monsters.map((m) => ({
        x: m.x,
        y: m.y,
        hp: m.hp,
        maxHp: m.maxHp,
        targetX: m.targetX,
        targetY: m.targetY,
      })),
      players: {},
      currentZone: state.currentZone,
      time: state.time,
      effects: state.effects.slice(0, 8).map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        radius: e.radius,
        ttl: e.ttl,
        skillKey: e.skillKey,
      })),
    };

    for (const [uid, p] of Object.entries(state.players)) {
      snapshot.players[uid] = {
        x: p.x,
        y: p.y,
        targetX: p.targetX,
        targetY: p.targetY,
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        characterType: p.characterType,
        isDead: p.isDead || false,
        name: p.name || 'Player',
      };
    }

    const json = JSON.stringify(snapshot);
    if (json === this._lastSentState) return;
    this._lastSentState = json;

    set(ref(this.rdb, `raids/${this.roomId}/state`), snapshot);
  }

  _syncInputToRDB(state) {
    if (!this.roomId) return;

    const input = {
      targetX: state.player.targetX,
      targetY: state.player.targetY,
      castSkills: state.actions.castSkills || [],
      basicAttack: state.actions.basicAttack || null,
      useConsumable: state.actions.useConsumable || null,
      useBattleItem: state.actions.useBattleItem || null,
      enterRaid: state.actions.enterRaid || false,
      returnToTown: state.actions.returnToTown || false,
      timestamp: Date.now(),
    };

    const json = JSON.stringify(input);
    if (json === this._lastSentInput) return;
    this._lastSentInput = json;

    set(ref(this.rdb, `raids/${this.roomId}/inputs/${this.uid}`), input);
  }

  /* ---------- Subscriptions ---------- */

  _subscribeToState() {
    if (!this.roomId || this.isHost) return;
    const stateRef = ref(this.rdb, `raids/${this.roomId}/state`);
    this._unsubState = onValue(stateRef, (snap) => {
      this.pendingHostState = snap.val();
    });
  }

  _subscribeToInputs(state) {
    if (!this.roomId || !this.isHost) return;
    const inputsRef = ref(this.rdb, `raids/${this.roomId}/inputs`);
    this._unsubInputs = onValue(inputsRef, (snap) => {
      const data = snap.val() || {};
      if (!state.playerActions) state.playerActions = {};
      for (const [uid, input] of Object.entries(data)) {
        if (uid === this.uid) continue;

        const rp = state.players[uid];
        if (!rp) continue;

        if (input.targetX !== undefined) rp.targetX = input.targetX;
        if (input.targetY !== undefined) rp.targetY = input.targetY;

        state.playerActions[uid] = {
          castSkills: input.castSkills || [],
          basicAttack: input.basicAttack || null,
          useConsumable: input.useConsumable || null,
          useBattleItem: input.useBattleItem || null,
          enterRaid: input.enterRaid || false,
          returnToTown: input.returnToTown || false,
        };
      }
    });
  }

  _subscribeMeta() {
    if (!this.roomId) return;
    const metaRef = ref(this.rdb, `raids/${this.roomId}/meta`);
    this._unsubMeta = onValue(metaRef, (snap) => {
      this.meta = snap.val() || {};
    });
  }

  /* ---------- State application (client) ---------- */

  _applyHostState(state, data) {
    if (!data) return;

    if (data.boss) {
      if (state.boss) {
        Object.assign(state.boss, data.boss);
      } else {
        state.boss = data.boss;
      }
    }

    if (data.monsters) {
      state.monsters = data.monsters.map((m) => ({
        ...m,
        targetX: m.x,
        targetY: m.y,
      }));
    }

    if (data.players) {
      for (const [uid, pdata] of Object.entries(data.players)) {
        if (uid === state.localPlayerId) {
          if (pdata.hp !== undefined) state.player.hp = pdata.hp;
          if (pdata.isDead !== undefined) state.player.isDead = pdata.isDead;
          continue;
        }
        if (!state.players[uid]) {
          state.players[uid] = { ...pdata, isRemote: true };
        } else {
          Object.assign(state.players[uid], pdata);
        }
      }
    }

    if (data.currentZone) state.currentZone = data.currentZone;

    /* Merge host effects (visual only) */
    if (data.effects && Array.isArray(data.effects)) {
      for (const e of data.effects) {
        if (!state.effects.find((ex) => ex.type === e.type && Math.abs(ex.x - e.x) < 2 && Math.abs(ex.y - e.y) < 2)) {
          state.effects.push({ ...e, ttl: e.ttl || 0.3 });
        }
      }
    }
  }

  /* ---------- Cleanup ---------- */

  cleanup() {
    if (this._unsubState) this._unsubState();
    if (this._unsubInputs) this._unsubInputs();
    if (this._unsubMeta) this._unsubMeta();

    if (this.roomId && this.uid) {
      remove(ref(this.rdb, `raids/${this.roomId}/players/${this.uid}`));
    }
    this.roomId = null;
    this.role = 'none';
    this.isHost = false;
  }

  _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }
}
