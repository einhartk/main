export class BossAISystem {
  constructor() {
    this.phaseTriggered = { 75: false, 50: false, 25: false };
    this.currentBoss = null;
  }

  getCurrentBoss() {
    return this.currentBoss;
  }

  setCurrentBoss(boss) {
    this.currentBoss = boss;
  }

  update(state, dt) {
    if (state.currentZone !== 'raid' || !state.boss) return;

    const boss = state.boss;
    const p = state.player;

    // Update current boss reference
    this.setCurrentBoss(boss);

    // Check HP phases for special mechanics
    this.checkPhaseTransitions(state, boss);

    boss.patternTimer += dt;

    // Debug: Log boss state every frame
    if (Math.random() < 0.1) { // Log 10% of frames to avoid spam
      console.log(`Boss Debug - Zone: ${state.currentZone}, Boss HP: ${boss.hp}/${boss.maxHp}, Player at: (${p.x}, ${p.y}), Boss at: (${boss.x}, ${boss.y}), Distance: ${Math.sqrt((p.x - boss.x) ** 2 + (p.y - boss.y) ** 2)}`);
    }

    // Basic attack logic - attack if within range and cooldown is ready
    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Initialize warning state if not exists
    if (!boss.warningState) {
      boss.warningState = null;
      boss.warningTimer = 0;
    }

    // Basic melee attack when close (within 80 units)
    if (distance < 80 && (!boss.attackCooldown || boss.attackCooldown <= 0) && !boss.warningState) {
      // Start warning state
      boss.warningState = 'basic';
      boss.warningTimer = 0.5; // 0.5 second warning
      
      // Add warning before basic attack
      if (!state.effects) {
        state.effects = [];
      }
      state.effects.push({
        type: 'bossBasicWarning',
        x: p.x,
        y: p.y,
        radius: 40,
        ttl: 0.6, // Slightly longer than warning timer
        warningTime: 0.5
      });
      
      // Store attack data for after warning
      boss.pendingAttack = {
        bossId: boss.id,
        targetX: p.x,
        targetY: p.y,
        damage: boss.basicDamage || 15,
        type: 'basic',
        dangerRadius: 40 // Danger zone radius
      };
      
      // Set attack cooldown (1.5 seconds for basic attacks)
      boss.attackCooldown = 1.5;
      
      console.log(`Boss ${boss.id} starting basic attack warning!`);
    }

    // Process warning states
    if (boss.warningState && boss.warningTimer > 0) {
      boss.warningTimer -= dt;
      
      // Debug: Log warning timer progress
      if (Math.random() < 0.2) { // Log 20% of frames
        console.log(`Warning Debug - State: ${boss.warningState}, Timer: ${boss.warningTimer.toFixed(3)}, Pending: ${!!boss.pendingAttack}`);
      }
      
      if (boss.warningTimer <= 0) {
        // Warning complete, check if player is still in danger zone
        if (boss.pendingAttack) {
          const currentDistance = Math.sqrt(
            Math.pow(p.x - boss.pendingAttack.targetX, 2) + 
            Math.pow(p.y - boss.pendingAttack.targetY, 2)
          );
          
          if (currentDistance <= boss.pendingAttack.dangerRadius) {
            // Player is still in danger zone, apply damage
            if (!state.actions.bossAttacks) {
              state.actions.bossAttacks = [];
            }
            state.actions.bossAttacks.push(boss.pendingAttack);
            
            console.log(`Boss ${boss.id} hit player! Distance: ${currentDistance.toFixed(1)}, Damage: ${boss.pendingAttack.damage}`);
          } else {
            // Player dodged the attack
            console.log(`Boss ${boss.id} missed! Player distance: ${currentDistance.toFixed(1)}, Danger radius: ${boss.pendingAttack.dangerRadius}`);
          }
          
          boss.pendingAttack = null;
        }
        boss.warningState = null;
        boss.warningTimer = 0;
      }
    }

    // 100% HP phase - add aggressive patterns
    const hpPercent = (boss.hp / boss.maxHp) * 100;
    if (hpPercent > 95 && (!boss.fullHPPattern || boss.fullHPPattern <= 0) && !boss.warningState) {
      // Start full HP warning state
      boss.warningState = 'fullHP';
      boss.warningTimer = 0.8; // 0.8 second warning
      
      // Add warning before full HP pattern
      if (!state.effects) {
        state.effects = [];
      }
      state.effects.push({
        type: 'bossFullHPWarning',
        x: p.x,
        y: p.y,
        radius: 60,
        ttl: 0.9, // Slightly longer than warning timer
        warningTime: 0.8
      });

      // Store full HP attack data for after warning
      boss.pendingAttack = {
        bossId: boss.id,
        targetX: p.x,
        targetY: p.y,
        damage: Math.floor((boss.basicDamage || 15) * 1.5), // 50% more damage at full HP
        type: 'fullHP',
        dangerRadius: 60 // Larger danger zone for full HP attack
      };

      boss.fullHPPattern = 2.0; // 2 second cooldown for full HP pattern
      console.log(`Boss ${boss.id} starting full HP warning!`);
    }

    // Update full HP pattern cooldown
    if (boss.fullHPPattern && boss.fullHPPattern > 0) {
      boss.fullHPPattern -= dt;
    }

    // Update basic attack cooldown
    if (boss.attackCooldown && boss.attackCooldown > 0) {
      boss.attackCooldown -= dt;
    }

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

      // Improved movement logic - always update target to current player position
      // This prevents boss from becoming "dumb" when player uses movement skills
      if (dist > 80) { // Slightly reduced chase distance for better engagement
        boss.targetX = p.x;
        boss.targetY = p.y;
        // Update facing angle to look at player while chasing
        boss.facingAngle = Math.atan2(dy, dx);
        
        // Add small random offset to prevent predictable movement
        if (Math.random() < 0.1) { // 10% chance per frame
          const randomOffset = 20;
          boss.targetX += (Math.random() - 0.5) * randomOffset;
          boss.targetY += (Math.random() - 0.5) * randomOffset;
        }
      } else {
        // At close range, maintain some movement to avoid being static
        if (Math.random() < 0.05) { // 5% chance per frame to adjust position
          const circleRadius = 30;
          const angle = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * Math.PI / 4;
          boss.targetX = p.x + Math.cos(angle) * circleRadius;
          boss.targetY = p.y + Math.sin(angle) * circleRadius;
        } else {
          boss.targetX = boss.x;
          boss.targetY = boss.y;
        }
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
    const boss = this.getCurrentBoss();
    
    // Basic attack patterns are always available regardless of phase
    const basicPatterns = ['basicAttack'];
    
    // Different patterns for each boss type
    if (boss.id === 'boss-demon') {
      // Demon Lord patterns
      let specialPatterns = [];
      switch (phase) {
        case 1: // 100-80%
          specialPatterns = ['hellFire', 'soulSteal', 'darknessNova'];
          break;
        case 2: // 80-60% - Add teleport
          specialPatterns = ['hellFire', 'soulSteal', 'teleport', 'darknessNova'];
          break;
        case 3: // 60-40% - More aggressive
          specialPatterns = ['demonRage', 'hellFire', 'soulSteal', 'darknessNova'];
          break;
        case 4: // 40-20% - Add shadow clones
          specialPatterns = ['demonRage', 'shadowClones', 'hellFire', 'teleport'];
          break;
        case 5: // 20-0% - Desperate, include life drain
          specialPatterns = ['demonRage', 'lifeDrain', 'shadowClones', 'hellFire'];
          break;
        default:
          specialPatterns = ['hellFire', 'soulSteal', 'darknessNova'];
          break;
      }
      return [...basicPatterns, ...specialPatterns];
    } else {
      // Dragon patterns (default)
      let specialPatterns = [];
      switch (phase) {
        case 1: // 100-75%
          specialPatterns = ['fireBreath', 'tailSwipe', 'roar'];
          break;
        case 2: // 75-50% - Add charge attack
          specialPatterns = ['fireBreath', 'tailSwipe', 'charge', 'roar'];
          break;
        case 3: // 50-25% - More aggressive
          specialPatterns = ['charge', 'groundSlam', 'fireBreath', 'roar'];
          break;
        case 4: // 25-0% - Desperate, fast patterns
          specialPatterns = ['charge', 'groundSlam', 'tailSwipe', 'fireBreath'];
          break;
        default:
          specialPatterns = ['fireBreath', 'tailSwipe', 'roar'];
          break;
      }
      return [...basicPatterns, ...specialPatterns];
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

    // Handle special skills differently
    if (boss.activeSkill === 'summonAdds') {
      this.executeSpecialMechanic(state, boss, 'summonAdds');
      boss.skillPhase = 'casting';
      boss.skillTimer = 0;
      skill.remaining = skill.cooldown;
      return;
    }

    // Demon Lord special skills
    if (boss.id === 'boss-demon') {
      if (boss.activeSkill === 'shadowClones') {
        this.executeShadowClones(state, boss);
        boss.skillPhase = 'casting';
        boss.skillTimer = 0;
        skill.remaining = skill.cooldown;
        return;
      }
      
      if (boss.activeSkill === 'teleport') {
        this.executeTeleport(state, boss);
        boss.skillPhase = 'casting';
        boss.skillTimer = 0;
        skill.remaining = skill.cooldown;
        return;
      }
      
      if (boss.activeSkill === 'lifeDrain') {
        this.executeLifeDrain(state, boss);
        boss.skillPhase = 'casting';
        boss.skillTimer = 0;
        skill.remaining = skill.cooldown;
        return;
      }
    }

    // Default damage skills (fireBreath, hellFire, etc.) - use danger zone detection
    const cx = boss.x;
    const cy = boss.y;
    const r = skill.radius;
    const r2 = r * r;

    const dx = state.player.x - cx;
    const dy = state.player.y - cy;
    const d2 = dx * dx + dy * dy;
    const currentDistance = Math.sqrt(d2);

    // Phase 3+ deals more damage
    let damage = skill.damage;
    if (boss.phase >= 3) damage *= 1.2; // 20% more damage in phase 3+

    // Only apply damage if player is in danger zone (same as warning radius)
    if (currentDistance <= r) {
      state.player.hp = Math.max(0, state.player.hp - damage);
      console.log(`Boss ${boss.id} skill ${boss.activeSkill} hit! Distance: ${currentDistance.toFixed(1)}, Damage: ${damage}`);
    } else {
      console.log(`Boss ${boss.id} skill ${boss.activeSkill} missed! Player distance: ${currentDistance.toFixed(1)}, Skill radius: ${r}`);
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

  // Demon Lord special skill implementations
  executeShadowClones(state, boss) {
    // Create 2 shadow clones that attack after delay
    for (let i = 0; i < 2; i++) {
      const angle = (Math.PI * 2 * i) / 2;
      const cloneX = boss.x + Math.cos(angle) * 200;
      const cloneY = boss.y + Math.sin(angle) * 200;
      
      state.effects.push({
        type: 'shadowClone',
        x: cloneX,
        y: cloneY,
        damage: 30,
        delay: 1.0 + i * 0.5, // Staggered attacks
        ttl: 3.0,
      });
    }
    
    console.log('Demon Lord summons shadow clones!');
  }

  executeTeleport(state, boss) {
    // Teleport to a random position around the player
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 100; // 150-250 units away
    
    const teleportX = state.player.x + Math.cos(angle) * distance;
    const teleportY = state.player.y + Math.sin(angle) * distance;
    
    // Keep within map bounds
    const mapWidth = state.raidMap?.width || 1200;
    const mapHeight = state.raidMap?.height || 800;
    
    boss.x = Math.max(50, Math.min(mapWidth - 50, teleportX));
    boss.y = Math.max(50, Math.min(mapHeight - 50, teleportY));
    boss.targetX = boss.x;
    boss.targetY = boss.y;
    
    // Visual effect
    state.effects.push({
      type: 'teleport',
      x: boss.x,
      y: boss.y,
      ttl: 1.0,
    });
    
    console.log('Demon Lord teleports!');
  }

  executeLifeDrain(state, boss) {
    // Continuous life drain effect
    const drainDuration = 3.0;
    const drainInterval = 0.5; // Drain every 0.5 seconds
    const drainAmount = 10;
    
    let drainCount = 0;
    const maxDrains = Math.floor(drainDuration / drainInterval);
    
    const drainIntervalId = setInterval(() => {
      if (drainCount >= maxDrains || !state.boss || state.boss.hp <= 0) {
        clearInterval(drainIntervalId);
        return;
      }
      
      // Check if player is within range
      const dx = state.player.x - boss.x;
      const dy = state.player.y - boss.y;
      const distance = Math.hypot(dx, dy);
      
      if (distance <= 200) {
        state.player.hp = Math.max(0, state.player.hp - drainAmount);
        
        // Visual effect
        state.effects.push({
          type: 'lifeDrain',
          x: state.player.x,
          y: state.player.y,
          ttl: 0.3,
        });
        
        // Heal boss
        boss.hp = Math.min(boss.maxHp, boss.hp + drainAmount / 2);
      }
      
      drainCount++;
    }, drainInterval * 1000);
    
    console.log('Demon Lord uses life drain!');
  }

  reset() {
    this.phaseTriggered = { 75: false, 50: false, 25: false };
  }
}
