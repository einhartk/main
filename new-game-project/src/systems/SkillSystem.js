import { getPlayerAABB, PLAYER_SIZE } from '../entities/player.js';
import { resolveCollisionsForMovement } from './MovementSystem.js';
import { updatePlayerStats } from '../services/playerStore.js';

export class SkillSystem {
  constructor() {
    this.basicAttackDamage = 10;
    this.basicAttackRange = 25;
  }

  // Get player's total power from equipment
  getPlayerTotalPower(state) {
    let total = 0;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = state.player.equipment[slot];
      if (item) total += item.totalPower;
    }
    return total;
  }

  update(state, dt) {
    tickCooldowns(state, dt);
    tickEffects(state, dt);

    if (state.actions.castSkills && state.actions.castSkills.length > 0) {
      const keys = state.actions.castSkills;
      state.actions.castSkills = [];

      for (const key of keys) {
        tryCastSkill(state, key);
      }
    }

    if (state.actions.basicAttack) {
      const target = state.actions.basicAttack;
      state.actions.basicAttack = null;
      // Apply attackSpeed to basic attack animation duration
      const attackSpeedMultiplier = (state.player.attackSpeed || 100) / 100;
      tryBasicAttack(state, target, this.basicAttackDamage, this.basicAttackRange, attackSpeedMultiplier);
    }
  }
}

// Calculate effect duration based on attack speed (higher = faster = shorter duration)
function getAttackSpeedMultiplier(state) {
  const attackSpeed = state.player.attackSpeed || 100;
  return 100 / attackSpeed; // 100% = 1.0, 140% = ~0.71
}

function tickCooldowns(state, dt) {
  // Handle character-specific gauge updates
  if (state.player.gauge) {
    const gauge = state.player.gauge;
    
    // Sorceress mana regeneration
    if (gauge.type === 'mana' && gauge.regenRate > 0) {
      gauge.current = Math.min(gauge.max, gauge.current + gauge.regenRate * dt);
    }
    
    // Gunslinger buff timer updates
    if (gauge.type === 'hunt') {
      // Update weapon buff timers
      for (const weapon of ['handgun', 'shotgun', 'rifle']) {
        if (gauge.buffs[weapon].active) {
          gauge.buffs[weapon].timeLeft -= dt;
          if (gauge.buffs[weapon].timeLeft <= 0) {
            gauge.buffs[weapon].active = false;
          }
        }
      }
      
      // Update peacekeeper buff
      if (gauge.peacekeeperActive) {
        gauge.peacekeeperTimeLeft -= dt;
        if (gauge.peacekeeperTimeLeft <= 0) {
          gauge.peacekeeperActive = false;
        }
      }
    }
  }
  
  // Skill cooldowns
  for (const key of Object.keys(state.player.skills)) {
    const skill = state.player.skills[key];
    skill.remaining = Math.max(0, skill.remaining - dt);
  }
}

function tryCastSkill(state, key) {
  const skill = state.player.skills[key];
  if (!skill || skill.remaining > 0) return;

  // Z skill (Arden skill) requires max gauge stacks (character-specific)
  if (key === 'z') {
    const gauge = state.player.gauge;
    if (!gauge || gauge.stacks < gauge.maxStacks) {
      return; // Not enough gauge stacks
    }
    // Stacks will be consumed after effect is applied
  }

  // X skill (호신투기) - defensive, doesn't affect gauge
  if (key === 'x') {
    // Apply shield effect
    state.player.shield = 50; // Shield amount
    state.player.shieldDuration = 2.0; // 2 seconds base
    state.effects.push({
      type: 'shield',
      x: state.player.x,
      y: state.player.y,
      radius: 40,
      ttl: 2.0,
    });
    skill.remaining = skill.cooldown;
    return;
  }

  const cx = state.player.x;
  const cy = state.player.y;
  const r = skill.radius;
  const r2 = r * r;

  const targets = [];
  for (const m of state.monsters) {
    const dx = m.x - cx;
    const dy = m.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      const damageDealt = Math.min(skill.damage, m.hp);
      m.hp = Math.max(0, m.hp - skill.damage);
      targets.push({ x: m.x, y: m.y });
      
      // Update statistics
      updatePlayerStats(state, 'damageDealt', { amount: damageDealt });
      
      // Add hit impact effect for monsters
      state.effects.push({
        type: 'hitImpact',
        x: m.x,
        y: m.y,
        radius: 18,
        ttl: 0.2,
      });
      
      // Check if monster died
      if (m.hp <= 0) {
        updatePlayerStats(state, 'monsterKill', { 
          count: 1, 
          gold: Math.floor(Math.random() * 10) + 5 
        });
        
        // Auto-save on monster kill (item drop simulation)
        if (window.saveOnActivity) {
          window.saveOnActivity('monster_kill');
        }
      }
    }
  }

  state.monsters = state.monsters.filter((m) => m.hp > 0);

  if (state.boss) {
    const dx = state.boss.x - cx;
    const dy = state.boss.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      // Calculate back/head attack damage bonus
      let finalDamage = skill.damage;
      let attackPositionType = 'normal';
      
      // Get BossAISystem methods for position calculation
      if (state.boss) {
        const bossAI = state.bossAISystem || { checkAttackPosition: () => ({ isBack: false, isHead: false }) };
        const { isBack, isHead } = bossAI.checkAttackPosition?.(state.boss, state.player.x, state.player.y) || { isBack: false, isHead: false };
        
        // Calculate damage multiplier with position bonuses
        const skillBackAttack = skill.backAttack || false;
        const skillHeadAttack = skill.headAttack || false;
        
        if (isBack && skillBackAttack) {
          finalDamage = Math.floor(finalDamage * 1.25); // Back attack skill: +25%
          attackPositionType = 'back';
        } else if (isHead && skillHeadAttack) {
          finalDamage = Math.floor(finalDamage * 1.20); // Head attack skill: +20%
          attackPositionType = 'head';
        } else if (isBack) {
          finalDamage = Math.floor(finalDamage * 1.10); // Normal skill from back: +10%
          attackPositionType = 'back-partial';
        } else if (isHead) {
          finalDamage = Math.floor(finalDamage * 1.05); // Normal skill from front: +5%
          attackPositionType = 'head-partial';
        }
        
        // Apply boss defense calculation
        if (state.boss) {
          // Calculate player's total power from equipment
          let playerTotalPower = 0;
          for (const slot of ['weapon', 'armor', 'accessory']) {
            const item = state.player.equipment[slot];
            if (item) playerTotalPower += item.totalPower;
          }
          
          const bossDefense = state.boss.defense || 50; // 기본 보스 방어력
          
          // 방어력 감산 공식: damage * (playerPower / (playerPower + bossDefense))
          const defenseMultiplier = playerTotalPower / (playerTotalPower + bossDefense);
          finalDamage = Math.floor(finalDamage * defenseMultiplier);
          
          // 최소 데미지 보장 (항상 1 이상의 데미지)
          finalDamage = Math.max(1, finalDamage);
        }
      }
      
      state.boss.hp = Math.max(0, state.boss.hp - finalDamage);
      targets.push({ 
        x: state.boss.x, 
        y: state.boss.y,
        attackType: attackPositionType
      });
      
      // Add hit impact effect for boss
      const isCritical = attackPositionType === 'back' || attackPositionType === 'head';
      state.effects.push({
        type: isCritical ? 'criticalHit' : 'hitImpact',
        x: state.boss.x,
        y: state.boss.y,
        radius: isCritical ? 25 : 20,
        ttl: isCritical ? 0.4 : 0.2,
      });
      
      // Damage text is now handled in the unified boss damage section below
      
      // Add unified damage floating text effect for boss
      state.effects.push({
        type: 'damageText',
        x: state.boss.x + (Math.random() - 0.5) * 20, // Less spread
        y: state.boss.y - 40 + (Math.random() - 0.5) * 10, // Less spread
        text: Math.floor(finalDamage).toString(),
        ttl: 0.8,
        attackType: attackPositionType,
      });
      
      // Check if boss died
      if (state.boss.hp <= 0) {
        // Give boss rewards
        if (state.boss.rewards) {
          const rewards = state.boss.rewards;
          
          // Gold reward
          if (rewards.gold) {
            state.player.gold += rewards.gold;
            console.log(`보스 클리어! ${rewards.gold} 골드 획득`);
          }
          
          // Experience reward (if implemented)
          if (rewards.exp && state.player.level !== undefined) {
            // Experience system can be implemented later
            console.log(`경험치 ${rewards.exp} 획득`);
          }
          
          // Item rewards (can be implemented later)
          if (rewards.items && rewards.items.length > 0) {
            console.log(`아이템 보상: ${rewards.items.join(', ')}`);
          }
        }
        
        updatePlayerStats(state, 'bossDefeated', { 
          gold: state.boss.rewards?.gold || Math.floor(Math.random() * 50) + 100 
        });
        
        // Auto-save on boss defeat (item drop simulation)
        if (window.saveOnActivity) {
          window.saveOnActivity('boss_defeat');
        }
      }
    }
  }

  // Apply attackSpeed to effect duration (faster attack = shorter animation)
  const atkSpeedMult = getAttackSpeedMultiplier(state);

  const effectType = skill.effectType || 'aoe';
  const effectData = {
    type: effectType,
    skillKey: key,
    x: cx,
    y: cy,
    radius: r,
    ttl: 0.3 * atkSpeedMult,
    targets: targets,
  };

  if (effectType === 'projectile') {
    effectData.ttl = 0.5 * atkSpeedMult;
    effectData.startX = cx;
    effectData.startY = cy;
    // Calculate target position using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Fire projectile in mouse direction with max range
    const maxRange = r * 2;
    const clampedDist = Math.min(dist, maxRange) || maxRange;
    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.targetX = state.player.x + Math.cos(angle) * clampedDist;
    effectData.targetY = state.player.y + Math.sin(angle) * clampedDist;
    effectData.angle = angle;
  } else if (effectType === 'chain') {
    effectData.ttl = 0.4 * atkSpeedMult;
    effectData.chainTargets = targets.slice(0, 3);
    // Calculate direction towards mouse for initial bolt
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;
  } else if (effectType === 'falling') {
    effectData.ttl = 0.6 * atkSpeedMult;
    effectData.startY = cy - 200;
    // Calculate target position using MOUSE position (for meteor impact)
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Clamp to max range
    const maxDist = r;
    const clampedDist = Math.min(dist, maxDist);
    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.targetY = state.player.y + Math.sin(angle) * clampedDist;
  } else if (effectType === 'melee') {
    effectData.ttl = 0.2 * atkSpeedMult;
    effectData.angle = Math.random() * Math.PI * 2;
  } else if (effectType === 'combo') {
    // Q: 맹호권 - 3 rapid punches (mouse direction)
    effectData.ttl = 0.25 * atkSpeedMult;
    effectData.hits = 3;
    effectData.hitInterval = 0.08 * atkSpeedMult;
    effectData.currentHit = 0;
    // Calculate direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;
  } else if (effectType === 'spin') {
    // W: 연환격 - spinning attack (centered on player, 360 degree)
    effectData.ttl = 0.4 * atkSpeedMult;
    effectData.spins = 2;
    effectData.angle = 0; // Spin is 360, angle doesn't matter
  } else if (effectType === 'uppercut') {
    // E: 천마파 - upward arc strike
    effectData.ttl = 0.35 * atkSpeedMult;
    effectData.angle = -Math.PI / 2; // upward
    effectData.arc = Math.PI / 3;
  } else if (effectType === 'pierce') {
    // R: 파천권 - piercing straight strike (mouse direction)
    effectData.ttl = 0.15 * atkSpeedMult;
    // Calculate direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.pierce = true;
  } else if (effectType === 'kick') {
    // V: 폭풍각 - wide sweeping kick (mouse direction)
    effectData.ttl = 0.3 * atkSpeedMult;
    // Calculate direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.kick = true;
  } else if (effectType === 'aoe' || effectType === 'critical') {
    // Generic AoE or critical strike at mouse position
    effectData.ttl = 0.5 * atkSpeedMult;
    // Calculate target position using MOUSE position (for AoE center)
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Clamp distance to skill radius
    const maxDist = r;
    const clampedDist = Math.min(dist, maxDist);
    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.targetX = state.player.x + Math.cos(angle) * clampedDist;
    effectData.targetY = state.player.y + Math.sin(angle) * clampedDist;
    effectData.angle = angle;
    if (effectType === 'critical') {
      effectData.critical = true;
    }
  } else if (effectType === 'fireAoE') {
    // T: 광염권 - fire explosion at mouse position
    effectData.ttl = 0.5 * atkSpeedMult;
    effectData.fire = true;
    // Calculate target position using MOUSE position (for AoE center)
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Clamp distance to skill radius
    const maxDist = r;
    const clampedDist = Math.min(dist, maxDist);
    const angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.targetX = state.player.x + Math.cos(angle) * clampedDist;
    effectData.targetY = state.player.y + Math.sin(angle) * clampedDist;
  } else if (effectType === 'dash') {
    effectData.ttl = 0.3 * atkSpeedMult;
    // Calculate dash direction towards player's target (mouse direction)
    const dx = state.player.targetX - state.player.x;
    const dy = state.player.targetY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dashAngle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.angle = dashAngle;
    effectData.trail = true;

    // Move player in dash direction (fixed distance, NOT affected by movement speed)
    const dashDistance = r * 0.8; // Fixed 80% of skill radius
    const dashMoveX = Math.cos(dashAngle) * dashDistance;
    const dashMoveY = Math.sin(dashAngle) * dashDistance;

    // Apply wall collision - dash stops at walls
    const resolved = resolveCollisionsForMovement(state, state.player, dashMoveX, dashMoveY, getPlayerAABB);
    state.player.x = resolved.x;
    state.player.y = resolved.y;
    // Also update target position to prevent rubber-banding
    state.player.targetX = state.player.x;
    state.player.targetY = state.player.y;
  } else if (effectType === 'counter') {
    // Counter skill - frontal direction towards mouse
    effectData.ttl = 0.4 * atkSpeedMult;
    // Calculate direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;
    effectData.parry = true;
  } else if (effectType === 'defense') {
    effectData.ttl = 2.0 * atkSpeedMult;
    effectData.shield = true;
  } else if (effectType === 'arden') {
    // Z (수라결/아덴스킬): Multi-hit forward barrage - RED punches
    const hits = skill.hits || 10;
    const hitInterval = 0.05 * atkSpeedMult;
    effectData.ttl = hits * hitInterval + 0.3;
    effectData.hits = hits;
    effectData.hitInterval = hitInterval;
    effectData.currentHit = 0;
    effectData.hitDamage = skill.damage;
    effectData.hitTargets = [];

    // Calculate forward direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;

    // Apply multi-hit damage immediately
    applySuraPathDamage(state, effectData, atkSpeedMult);
  } else if (effectType === 'awakening') {
    // V (각성기): Powerful multi-hit - GOLD/PURPLE majestic effect
    const hits = skill.hits || 20;
    const hitInterval = 0.04 * atkSpeedMult; // Faster hits
    effectData.ttl = hits * hitInterval + 0.5;
    effectData.hits = hits;
    effectData.hitInterval = hitInterval;
    effectData.currentHit = 0;
    effectData.hitDamage = skill.damage;
    effectData.hitTargets = [];
    effectData.isAwakening = true; // Flag for different visual

    // Calculate forward direction using MOUSE position
    const mouseX = state.mouse?.x ?? state.player.targetX;
    const mouseY = state.mouse?.y ?? state.player.targetY;
    const dx = mouseX - state.player.x;
    const dy = mouseY - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    effectData.angle = dist > 0 ? Math.atan2(dy, dx) : 0;

    // Apply multi-hit damage immediately
    applySuraPathDamage(state, effectData, atkSpeedMult);
  }

  state.effects.push(effectData);
  skill.remaining = skill.cooldown;
  
  // Track skill usage statistics
  updatePlayerStats(state, 'skillUsed', { skillKey: key });

  // Character-specific gauge system
  const gauge = state.player.gauge;
  const gaugeType = skill.gaugeType;
  
  if (!gauge) return;
  
  // Handle different gauge types based on character
  if (gauge.type === 'arden') {
    // Sura's gauge: alternate between energy(藍) and impact(黃)
    if (gaugeType === 'energy' || gaugeType === 'impact') {
      if (gauge.lastGaugeType !== gaugeType) {
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + 1);
        gauge.lastGaugeType = gaugeType;
      }
    } else if (gaugeType === 'miniSpecial') {
      const gain = skill.suraGain || 5;
      gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + gain);
    } else if (gaugeType === 'special') {
      gauge.stacks = gauge.maxStacks;
      gauge.lastGaugeType = null;
    } else if (gaugeType === 'arden') {
      gauge.stacks = 0;
      gauge.lastGaugeType = null;
    }
  } else if (gauge.type === 'focus') {
    // Lancer's gauge: build focus for criticals
    if (gaugeType === 'red') {
      const gain = skill.focusGain || 1;
      gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + gain);
    } else if (gaugeType === 'special') {
      if (skill.focusGain) {
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + skill.focusGain);
      } else {
        gauge.stacks = gauge.maxStacks;
      }
    } else if (gaugeType === 'focus') {
      const required = skill.requiredFocus || 10;
      if (gauge.stacks >= required) {
        gauge.stacks -= required;
      }
    }
    // Update critical chance
    gauge.criticalChance = Math.min(50, gauge.stacks * 2.5);
  } else if (gauge.type === 'hunt') {
    // Gunslinger: Time to Hunt weapon swapping
    const weaponType = gaugeType;
    
    if (weaponType === 'special') {
      // T (Peacekeeper) or V (Awakening)
      if (skill.name === '피스메이커') {
        gauge.peacekeeperActive = true;
        gauge.peacekeeperTimeLeft = 30;
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + 10);
      } else if (skill.name === '하이 눈') {
        gauge.stacks = gauge.maxStacks;
      }
    } else if (weaponType === 'hunt') {
      // Z skill: Consume all stacks
      const required = skill.requiredStacks || 20;
      if (gauge.stacks >= required) {
        gauge.stacks = 0;
        // Reset buffs
        gauge.buffs.handgun.active = false;
        gauge.buffs.shotgun.active = false;
        gauge.buffs.rifle.active = false;
      }
    } else if (weaponType === 'handgun' || weaponType === 'shotgun' || weaponType === 'rifle') {
      // Weapon skill - Time to Hunt mechanic
      if (gauge.lastWeapon !== weaponType) {
        // Weapon Swap! Apply buff
        gauge.lastWeapon = weaponType;
        
        // Activate corresponding buff
        if (weaponType === 'handgun') {
          gauge.buffs.handgun.active = true;
          gauge.buffs.handgun.timeLeft = 8;
          gauge.buffs.shotgun.active = false;
          gauge.buffs.rifle.active = false;
        } else if (weaponType === 'shotgun') {
          gauge.buffs.shotgun.active = true;
          gauge.buffs.shotgun.timeLeft = 8;
          gauge.buffs.handgun.active = false;
          gauge.buffs.rifle.active = false;
        } else if (weaponType === 'rifle') {
          gauge.buffs.rifle.active = true;
          gauge.buffs.rifle.timeLeft = 8;
          gauge.buffs.handgun.active = false;
          gauge.buffs.shotgun.active = false;
        }
        
        // Gain more stacks on swap (Time to Hunt reward)
        const stackGain = gauge.peacekeeperActive ? 4 : 2;
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + stackGain);
      } else {
        // Same weapon - small stack gain
        const smallGain = gauge.peacekeeperActive ? 2 : 1;
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + smallGain);
      }
    }
  } else if (gauge.type === 'mana') {
    // Sorceress mana system
    if (gaugeType === 'fire' || gaugeType === 'ice' || 
        gaugeType === 'lightning' || gaugeType === 'arcane' ||
        gaugeType === 'ultimate') {
      const cost = skill.manaCost || skill.requiredMana || 0;
      if (gauge.current >= cost) {
        gauge.current -= cost;
      }
    } else if (gaugeType === 'special' && skill.manaRestore) {
      gauge.current = Math.min(gauge.max, gauge.current + skill.manaRestore);
    }
  }
}

function tickEffects(state, dt) {
  for (const e of state.effects) {
    e.ttl -= dt;
  }
  state.effects = state.effects.filter((e) => e.ttl > 0);
}

function tryBasicAttack(state, target, damage, range, attackSpeedMultiplier = 1.0) {
  // Calculate angle from player to mouse pointer
  const px = state.player.x;
  const py = state.player.y;
  const angle = Math.atan2(target.y - py, target.x - px);
  const coneAngle = Math.PI / 6; // 30 degree cone
  const maxRange = 60; // Melee range

  // Check monsters in the cone direction
  for (const m of state.monsters) {
    const dx = m.x - px;
    const dy = m.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxRange) continue;

    const monsterAngle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(monsterAngle - angle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff <= coneAngle) {
      const damageDealt = Math.min(damage, m.hp);
      m.hp = Math.max(0, m.hp - damage);
      
      // Update statistics
      updatePlayerStats(state, 'damageDealt', { amount: damageDealt });
      
      // Add hit impact effect
      state.effects.push({
        type: 'hitImpact',
        x: m.x,
        y: m.y,
        radius: 15,
        ttl: 0.2,
      });
      
      // Add damage floating text effect
      state.effects.push({
        type: 'damageText',
        x: m.x,
        y: m.y - 30,
        text: damage.toString(),
        ttl: 0.8,
      });
      
      // Check if monster died
      if (m.hp <= 0) {
        updatePlayerStats(state, 'monsterKill', { 
          count: 1, 
          gold: Math.floor(Math.random() * 10) + 5 
        });
        
        // Auto-save on monster kill (item drop simulation)
        if (window.saveOnActivity) {
          window.saveOnActivity('monster_kill');
        }
      }
    }
  }

  state.monsters = state.monsters.filter((m) => m.hp > 0);

  // Check boss in the cone direction
  if (state.boss) {
    const dx = state.boss.x - px;
    const dy = state.boss.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= maxRange) {
      const bossAngle = Math.atan2(dy, dx);
      let angleDiff = Math.abs(bossAngle - angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff <= coneAngle) {
        // Apply boss defense calculation for basic attack
        let finalDamage = damage;
        if (state.boss) {
          // Calculate player's total power from equipment
          let playerTotalPower = 0;
          for (const slot of ['weapon', 'armor', 'accessory']) {
            const item = state.player.equipment[slot];
            if (item) playerTotalPower += item.totalPower;
          }
          
          const bossDefense = state.boss.defense || 50; // 기본 보스 방어력
          
          // 방어력 감산 공식: damage * (playerPower / (playerPower + bossDefense))
          const defenseMultiplier = playerTotalPower / (playerTotalPower + bossDefense);
          finalDamage = Math.floor(damage * defenseMultiplier);
          
          // 최소 데미지 보장 (항상 1 이상의 데미지)
          finalDamage = Math.max(1, finalDamage);
        }
        
        const damageDealt = Math.min(finalDamage, state.boss.hp);
        state.boss.hp = Math.max(0, state.boss.hp - finalDamage);
        
        // Update statistics
        updatePlayerStats(state, 'damageDealt', { amount: damageDealt });
        
        // Add hit impact effect for boss
        state.effects.push({
          type: 'hitImpact',
          x: state.boss.x,
          y: state.boss.y,
          radius: 20,
          ttl: 0.2,
        });
        
        // Add damage floating text effect
        state.effects.push({
          type: 'damageText',
          x: state.boss.x,
          y: state.boss.y - 30,
          text: finalDamage.toString(),
          ttl: 0.8,
        });
        
        // Check if boss died
        if (state.boss.hp <= 0) {
          updatePlayerStats(state, 'bossDefeated', { 
            gold: Math.floor(Math.random() * 50) + 100 
          });
        }
      }
    }
  }

  // Directional cone effect
  state.effects.push({
    type: 'basicAttackCone',
    x: px,
    y: py,
    angle: angle,
    range: maxRange,
    coneAngle: coneAngle,
    ttl: 0.15 * attackSpeedMultiplier,
  });
}

function applySuraPathDamage(state, effectData, atkSpeedMult) {
  // 수라결: Apply multiple hits in forward direction
  const px = effectData.x;
  const py = effectData.y;
  const angle = effectData.angle;
  const range = effectData.radius; // Full skill range
  const damagePerHit = effectData.hitDamage;
  const hits = effectData.hits;
  const hitInterval = effectData.hitInterval;

  // Forward cone parameters
  const coneAngle = Math.PI / 4; // 45 degree forward cone

  // Apply each hit with staggered timing
  for (let hitNum = 0; hitNum < hits; hitNum++) {
    const hitDelay = hitNum * hitInterval;

    // Schedule this hit
    setTimeout(() => {
      // Calculate hit position (advancing forward with each hit)
      const hitProgress = (hitNum + 1) / hits; // 0.07 ~ 1.0
      const hitDistance = range * 0.3 + (range * 0.7 * hitProgress); // Start at 30%, reach 100%
      const hitX = px + Math.cos(angle) * hitDistance;
      const hitY = py + Math.sin(angle) * hitDistance;

      // Check monsters in forward cone at this range
      for (const m of state.monsters) {
        const dx = m.x - px;
        const dy = m.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > range) continue;

        // Check if monster is in forward cone
        const monsterAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(monsterAngle - angle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= coneAngle) {
          // Apply damage
          m.hp = Math.max(0, m.hp - damagePerHit);
        }
      }

      // Check boss
      if (state.boss) {
        const dx = state.boss.x - px;
        const dy = state.boss.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= range) {
          const bossAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(bossAngle - angle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

          if (angleDiff <= coneAngle) {
            state.boss.hp = Math.max(0, state.boss.hp - damagePerHit);
          }
        }
      }
    }, hitDelay * 1000); // Convert to milliseconds
  }
}
