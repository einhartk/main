export class AISystem {
  update(state, dt) {
    const p = state.player;

    for (const m of state.monsters) {
      // Set target to player position
      m.targetX = p.x;
      m.targetY = p.y;

      // Calculate distance to player
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Attack logic - attack if within range and cooldown is ready
      if (distance < 60 && (!m.attackCooldown || m.attackCooldown <= 0)) {
        // Trigger monster attack
        if (!state.actions.monsterAttacks) {
          state.actions.monsterAttacks = [];
        }
        state.actions.monsterAttacks.push({
          monsterId: m.id,
          targetX: p.x,
          targetY: p.y,
          damage: m.damage || 10
        });

        // Set attack cooldown (1 second)
        m.attackCooldown = 1.0;
      }

      // Update attack cooldown
      if (m.attackCooldown && m.attackCooldown > 0) {
        m.attackCooldown -= dt;
      }
    }
  }
}
