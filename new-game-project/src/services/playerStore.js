import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export function makePlayerSaveSnapshot(state) {
  return {
    level: state.player.level ?? 1,
    hp: state.player.hp,
    position: {
      x: state.player.x,
      y: state.player.y,
    },
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

  if (typeof data.level === 'number') state.player.level = data.level;
  if (typeof data.hp === 'number') state.player.hp = data.hp;

  const pos = data.position;
  if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
    state.player.x = pos.x;
    state.player.y = pos.y;
    state.player.targetX = pos.x;
    state.player.targetY = pos.y;
  }
}
