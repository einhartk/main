export class BossAISystem {
  constructor() {
    this.phaseTriggered = { 75: false, 50: false, 25: false };
  }

  update(state, dt) {
    if (state.currentZone !== 'raid' || !state.boss) return;

    const boss = state.boss;
    const p = state.player;

    // Check HP phases for special mechanics
    this.checkPhaseTransitions(state, boss);

    boss.patternTimer += dt;

    // Patterns based on current phase
    const patterns = this.getPatternsForPhase(boss.phase);
    const patternInterval = this.getPatternIntervalForPhase(boss.phase);

    if (boss.skillPhase === 'idle' && boss.patternTimer >= patternInterval) {
      boss.patternTimer = 0;
      boss.currentPattern = (boss.currentPattern + 1) % patterns.length;
      this.startBossSkill(state, patterns[boss.currentPattern]);
    }

    if (boss.skillPhase === 'warning') {
      boss.skillTimer += dt;
      if (boss.skillTimer >= boss.skills[boss.activeSkill].warningTime) {
        this.executeBossSkill(state);
      }
    }

    if (boss.skillPhase === 'casting') {
      boss.skillTimer += dt;
      if (boss.skillTimer >= 0.4) {
        boss.skillPhase = 'idle';
        boss.activeSkill = null;
        boss.skillTimer = 0;
      }
    }

    // Boss movement - stop during warning phase
    if (boss.skillPhase === 'warning') {
      boss.targetX = boss.x;
      boss.targetY = boss.y;
    } else {
      const dx = p.x - boss.x;
      const dy = p.y - boss.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 100) {
        boss.targetX = p.x;
        boss.targetY = p.y;
        // Update facing angle to look at player while chasing
        boss.facingAngle = Math.atan2(dy, dx);
      } else {
        boss.targetX = boss.x;
        boss.targetY = boss.y;
      }
    }

    for (const skillKey of Object.keys(boss.skills)) {
      const skill = boss.skills[skillKey];
      skill.remaining = Math.max(0, skill.remaining - dt);
    }
  }

  // Check if player is hitting from back or head position
  // Back: 90 degrees behind boss facing direction
  // Head: 45 degrees in front of boss facing direction
  checkAttackPosition(boss, playerX, playerY) {
    const dx = playerX - boss.x;
    const dy = playerY - boss.y;
    const angleToPlayer = Math.atan2(dy, dx);
    
    // Normalize angle difference to [-PI, PI]
    let angleDiff = angleToPlayer - boss.facingAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    const absAngleDiff = Math.abs(angleDiff);
    
    // Back attack: within 90 degrees behind (PI ± PI/4 = 135° ~ 225°)
    // Head attack: within 90 degrees in front (± PI/4 = ±45°)
    // Both set to 90° for balanced gameplay
    const isBack = absAngleDiff > (3 * Math.PI / 4); // > 135 degrees (90° behind)
    const isHead = absAngleDiff < (Math.PI / 4); // < 45 degrees (90° in front)
    
    return { isBack, isHead, angleDiff };
  }

  // Calculate damage with back/head bonuses
  // Back attack: +15% damage
  // Head attack: +10% damage
  calculateDamageWithPosition(baseDamage, isBack, isHead, skillBackAttack, skillHeadAttack) {
    let multiplier = 1.0;
    let attackType = 'normal';
    
    if (isBack && skillBackAttack) {
      multiplier = 1.25; // Back attack skill from behind: +25%
      attackType = 'back';
    } else if (isHead && skillHeadAttack) {
      multiplier = 1.20; // Head attack skill from front: +20%
      attackType = 'head';
    } else if (isBack) {
      multiplier = 1.10; // Normal skill from behind: +10%
      attackType = 'back-partial';
    } else if (isHead) {
      multiplier = 1.05; // Normal skill from front: +5%
      attackType = 'head-partial';
    }
    
    return {
      damage: Math.floor(baseDamage * multiplier),
      multiplier,
      attackType
    };
  }

  checkPhaseTransitions(state, boss) {
    const hpPercent = (boss.hp / boss.maxHp) * 100;

    // Phase 2: 75% - Speed up + new pattern
    if (hpPercent <= 75 && !this.phaseTriggered[75]) {
      this.phaseTriggered[75] = true;
      boss.phase = 2;
      boss.speed = 100; // Speed up
      // Visual effect for phase change
      state.effects.push({
        type: 'bossPhaseChange',
        x: boss.x,
        y: boss.y,
        phase: 2,
        ttl: 2.0,
      });
    }

    // Phase 3: 50% - Enrage + summon adds
    if (hpPercent <= 50 && !this.phaseTriggered[50]) {
      this.phaseTriggered[50] = true;
      boss.phase = 3;
      boss.speed = 120; // Faster
      // Immediately summon adds as special mechanic
      this.executeSpecialMechanic(state, boss, 'summonAdds');
    }

    // Phase 4: 25% - Desperate mode
    if (hpPercent <= 25 && !this.phaseTriggered[25]) {
      this.phaseTriggered[25] = true;
      boss.phase = 4;
      boss.speed = 150; // Maximum speed
      // Heal shield mechanic
      boss.hp = Math.min(boss.maxHp, boss.hp + 500); // Heal 500 HP
      state.effects.push({
        type: 'bossHeal',
        x: boss.x,
        y: boss.y,
        heal: 500,
        ttl: 2.0,
      });
    }
  }

  getPatternsForPhase(phase) {
    // Different patterns for each phase
    switch (phase) {
      case 1: // 100-75%
        return ['fireBreath', 'tailSwipe', 'roar'];
      case 2: // 75-50% - Add charge attack
        return ['fireBreath', 'tailSwipe', 'charge', 'roar'];
      case 3: // 50-25% - More aggressive
        return ['charge', 'groundSlam', 'fireBreath', 'roar'];
      case 4: // 25-0% - Desperate, fast patterns
        return ['charge', 'groundSlam', 'tailSwipe', 'fireBreath'];
      default:
        return ['fireBreath', 'tailSwipe', 'roar'];
    }
  }

  getPatternIntervalForPhase(phase) {
    // Faster patterns in later phases
    switch (phase) {
      case 1: return 3.0;
      case 2: return 2.5;
      case 3: return 2.0;
      case 4: return 1.5;
      default: return 3.0;
    }
  }

  executeSpecialMechanic(state, boss, mechanic) {
    if (mechanic === 'summonAdds') {
      // Summon 3 small monsters
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const dist = 80;
        state.monsters.push({
          id: `add-${Date.now()}-${i}`,
          x: boss.x + Math.cos(angle) * dist,
          y: boss.y + Math.sin(angle) * dist,
          hp: 100,
          maxHp: 100,
          speed: 60,
          damage: 10,
          targetX: state.player.x,
          targetY: state.player.y,
        });
      }
      // Visual effect
      state.effects.push({
        type: 'bossSummon',
        x: boss.x,
        y: boss.y,
        ttl: 1.5,
      });
    }
  }

  startBossSkill(state, skillKey) {
    const boss = state.boss;
    const skill = boss.skills[skillKey];
    if (!skill || skill.remaining > 0) return;

    boss.activeSkill = skillKey;
    boss.skillPhase = 'warning';
    boss.skillTimer = 0;

    state.effects.push({
      type: 'bossWarning',
      skillKey,
      x: boss.x,
      y: boss.y,
      radius: skill.radius,
      ttl: skill.warningTime,
    });
  }

  executeBossSkill(state) {
    const boss = state.boss;
    const skill = boss.skills[boss.activeSkill];

    // Handle summonAdds differently (no damage check)
    if (boss.activeSkill === 'summonAdds') {
      this.executeSpecialMechanic(state, boss, 'summonAdds');
      boss.skillPhase = 'casting';
      boss.skillTimer = 0;
      skill.remaining = skill.cooldown;
      return;
    }

    const cx = boss.x;
    const cy = boss.y;
    const r = skill.radius;
    const r2 = r * r;

    const dx = state.player.x - cx;
    const dy = state.player.y - cy;
    const d2 = dx * dx + dy * dy;

    // Phase 3+ deals more damage
    let damage = skill.damage;
    if (boss.phase >= 3) damage *= 1.2; // 20% more damage in phase 3+

    if (d2 <= r2) {
      state.player.hp = Math.max(0, state.player.hp - damage);
    }

    state.effects.push({
      type: 'bossSkill',
      skillKey: boss.activeSkill,
      x: cx,
      y: cy,
      radius: r,
      ttl: 0.4,
    });

    boss.skillPhase = 'casting';
    boss.skillTimer = 0;
    skill.remaining = skill.cooldown;
  }

  reset() {
    this.phaseTriggered = { 75: false, 50: false, 25: false };
  }
}
