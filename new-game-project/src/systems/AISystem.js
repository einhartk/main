export class AISystem {
  update(state, dt) {
    const p = state.player;

    for (const m of state.monsters) {
      m.targetX = p.x;
      m.targetY = p.y;
    }
  }
}
