export class MonsterAttackSystem {
  update(state, dt) {
    // Debug: Log actions state
    if (Math.random() < 0.05) { // Log 5% of frames
      console.log(`MonsterAttack Debug - monsterAttacks: ${state.actions.monsterAttacks?.length || 0}, bossAttacks: ${state.actions.bossAttacks?.length || 0}`);
    }

    // Process regular monster attacks
    if (state.actions.monsterAttacks && state.actions.monsterAttacks.length > 0) {
      for (const attack of state.actions.monsterAttacks) {
        // Apply damage to player
        if (state.player) {
          state.player.hp = Math.max(0, state.player.hp - (attack.damage || 10));
          
          // Create visual effect for attack
          if (!state.effects) {
            state.effects = [];
          }
          
          state.effects.push({
            type: 'monsterAttack',
            x: attack.targetX,
            y: attack.targetY,
            duration: 0.3,
            startTime: Date.now()
          });
        }
      }
      
      // Clear processed attacks
      state.actions.monsterAttacks = [];
    }

    // Process boss attacks
    if (state.actions.bossAttacks && state.actions.bossAttacks.length > 0) {
      for (const attack of state.actions.bossAttacks) {
        // Apply damage to player
        if (state.player) {
          state.player.hp = Math.max(0, state.player.hp - (attack.damage || 15));
          
          // Create visual effect for boss attack
          if (!state.effects) {
            state.effects = [];
          }
          
          // Different effects for different attack types
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
      
      // Clear processed attacks
      state.actions.bossAttacks = [];
    }
  }
}
