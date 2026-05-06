// Lancer (창술사) - Spear Master
// Mid-range fighter with precise spear techniques
// Gauge System: Focus (집중) - Build up for critical strikes

export const lancer = {
  name: '창술사',
  description: '중거리 창 전사. 정확한 창술로 적의 허점을 찌릅니다. 집중 게이지를 쌓아 강력한 크리티컬 공격을 사용합니다.',
  difficulty: '초급',
  role: '딜러',
  
  size: { w: 30, h: 30 },
  color: 0xcd853f, // Peru / Bronze
  
  baseStats: {
    maxHp: 120,
    movementSpeed: 95,
    attackSpeed: 95,
  },
  
  // Red(紅) Skills - Offensive spear techniques
  // White(白) Skills - Defensive/stance skills
  skills: {
    // Red(紅) - Offensive
    q: { key: 'q', name: '철혈창', icon: '🗡️', cooldown: 7, remaining: 0, radius: 100, damage: 35, effectType: 'pierce', gaugeType: 'red', focusGain: 1, backAttack: true, description: '강한 찌르기 (백어택)' },
    w: { key: 'w', name: '연쇄창', icon: '⚔️', cooldown: 9, remaining: 0, radius: 90, damage: 45, effectType: 'combo', gaugeType: 'red', focusGain: 1, backAttack: true, description: '3연속 창 공격 (백어택)' },
    e: { key: 'e', name: '회전격', icon: '🌀', cooldown: 11, remaining: 0, radius: 85, damage: 50, effectType: 'spin', gaugeType: 'red', focusGain: 2, description: '창을 돌려 공격 (360°)' },
    r: { key: 'r', name: '관통창', icon: '➡️', cooldown: 12, remaining: 0, radius: 140, damage: 55, effectType: 'pierce', gaugeType: 'red', focusGain: 2, headAttack: true, description: '길게 관통하는 창격 (헤드어택)' },
    
    // White(白) - Defensive/Stance
    a: { key: 'a', name: '철벽방', icon: '🛡️', cooldown: 8, remaining: 0, radius: 50, damage: 0, effectType: 'defense', gaugeType: 'white', description: '방어 자세' },
    s: { key: 's', name: '반격창', icon: '🔄', cooldown: 10, remaining: 0, radius: 70, damage: 40, effectType: 'counter', gaugeType: 'white', backAttack: true, description: '반격 후 창격 (백어택)' },
    d: { key: 'd', name: '돌진창', icon: '💨', cooldown: 9, remaining: 0, radius: 130, damage: 25, effectType: 'dash', gaugeType: 'white', headAttack: true, description: '창을 앞세운 돌진 (헤드어택)' },
    f: { key: 'f', name: '회피백', icon: '↩️', cooldown: 7, remaining: 0, radius: 60, damage: 0, effectType: 'dash', gaugeType: 'white', description: '뒤로 물러나 회피' },
    
    // Special Skills
    t: { key: 't', name: '집중력', icon: '✨', cooldown: 25, remaining: 0, radius: 0, damage: 0, effectType: 'buff', gaugeType: 'special', focusGain: 5, description: '즉시 집중 +5' },
    v: { key: 'v', name: '창신의 연격', icon: '⭐', cooldown: 60, remaining: 0, radius: 140, damage: 85, effectType: 'awakening', hits: 2, hitInterval: 0.2, gaugeType: 'special', headAttack: true, description: '각성: 2연속 창격 (헤드어택)' },
    z: { key: 'z', name: '필살: Crimson', icon: '🔴', cooldown: 0.5, remaining: 0, radius: 160, damage: 80, effectType: 'critical', gaugeType: 'focus', requiredFocus: 10, backAttack: true, description: '집중 10 필요: 크리티컬 창격 (백어택)' },
    x: { key: 'x', name: '무장해제', icon: '🔓', cooldown: 12, remaining: 0, radius: 80, damage: 20, effectType: 'debuff', gaugeType: 'white', description: '적 방어 감소' },
  },
  
  createGauge() {
    return {
      type: 'focus',
      stacks: 0,
      maxStacks: 20,
      criticalChance: 0, // Increases with focus
    };
  },
  
  onSkillUse(gauge, skill) {
    const gaugeType = skill.gaugeType;
    
    if (gaugeType === 'red') {
      // Offensive skills build focus
      const gain = skill.focusGain || 1;
      gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + gain);
    } else if (gaugeType === 'white') {
      // Defensive skills maintain stance
      // No focus gain, but can use without consuming
    } else if (gaugeType === 'special') {
      // T skill or V awakening
      if (skill.focusGain) {
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + skill.focusGain);
      }
    } else if (gaugeType === 'focus') {
      // Z skill: Consume focus
      const required = skill.requiredFocus || 10;
      if (gauge.stacks >= required) {
        gauge.stacks -= required;
      }
    }
    
    // Update critical chance based on focus
    gauge.criticalChance = Math.min(50, gauge.stacks * 2.5); // Max 50% crit
    
    return gauge;
  },
};
