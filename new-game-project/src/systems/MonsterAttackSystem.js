export class MonsterAttackSystem {
  update(state, dt) {
    // Debug: Log actions state
    if (Math.random() < 0.05) { // Log 5% of frames
      console.log(`MonsterAttack Debug - monsterAttacks: ${state.actions.monsterAttacks?.length || 0}, bossAttacks: ${state.actions.bossAttacks?.length || 0}`);
    }

    // Process regular monster attacks (nearest player)
    if (state.actions.monsterAttacks && state.actions.monsterAttacks.length > 0) {
      for (const attack of state.actions.monsterAttacks) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const p of Object.values(state.players)) {
          if (p.isDead) continue;
          const d = Math.hypot(p.x - attack.targetX, p.y - attack.targetY);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = p;
          }
        }
        if (nearest) {
          nearest.hp = Math.max(0, nearest.hp - (attack.damage || 10));
          if (!state.effects) state.effects = [];
          state.effects.push({
            type: 'monsterAttack',
            x: attack.targetX,
            y: attack.targetY,
            duration: 0.3,
            startTime: Date.now()
          });
        }
      }
      state.actions.monsterAttacks = [];
    }

    // Process boss attacks (nearest player)
    if (state.actions.bossAttacks && state.actions.bossAttacks.length > 0) {
      for (const attack of state.actions.bossAttacks) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const p of Object.values(state.players)) {
          if (p.isDead) continue;
          const d = Math.hypot(p.x - attack.targetX, p.y - attack.targetY);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = p;
          }
        }
        if (nearest) {
          nearest.hp = Math.max(0, nearest.hp - (attack.damage || 15));
          if (!state.effects) state.effects = [];
          if (attack.type === 'fullHP') {
            state.effects.push({
              type: 'bossFullHPAttack',
              x: attack.targetX,
              y: attack.targetY,
              duration: 0.6,
              startTime: Date.now()
            });
          } else {
            state.effects.push({
              type: 'bossBasicAttack',
              x: attack.targetX,
              y: attack.targetY,
              duration: 0.4,
              startTime: Date.now()
            });
          }
        }
      }
      state.actions.bossAttacks = [];
    }
  }
}
