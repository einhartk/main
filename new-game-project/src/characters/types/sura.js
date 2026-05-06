// Sura (수라) - Martial Artist / Brawler
// Close-range fighter with rapid punches and kicks
// Gauge System: Alternating Energy(藍) / Impact(黃) → Arden stacks

export const sura = {
  name: '수라',
  description: '근접 격투가. 빠른 주먹과 발차기로 적을 압도합니다. 기력(藍)과 충격(黃)을 교대로 사용하여 아덴 게이지를 채웁니다.',
  difficulty: '중급',
  role: '딜러',
  
  size: { w: 28, h: 28 },
  color: 0x4682b4, // Steel Blue
  
  baseStats: {
    maxHp: 100,
    movementSpeed: 100, // Base 100%, max 140%
    attackSpeed: 100,   // Base 100%, max 140%
  },
  
  // Energy(藍) Skills - Punch/Kick attacks
  // Impact(黃) Skills - Movement/Counter
  skills: {
    // Energy(藍) - Blue offensive skills
    q: { key: 'q', name: '맹호권', icon: '👊', cooldown: 8, remaining: 0, radius: 70, damage: 25, effectType: 'combo', gaugeType: 'energy', backAttack: true, description: '연속 3타 주먹 공격' },
    w: { key: 'w', name: '연환격', icon: '🌀', cooldown: 10, remaining: 0, radius: 65, damage: 35, effectType: 'spin', gaugeType: 'energy', description: '회전 공격' },
    e: { key: 'e', name: '천마파', icon: '🦶', cooldown: 12, remaining: 0, radius: 80, damage: 45, effectType: 'uppercut', gaugeType: 'energy', backAttack: true, description: '공중으로 띄우는 어퍼컷' },
    r: { key: 'r', name: '파천권', icon: '☄️', cooldown: 10, remaining: 0, radius: 75, damage: 40, effectType: 'pierce', gaugeType: 'energy', headAttack: true, description: '길게 찌르는 관격' },
    
    // Impact(黃) - Yellow movement/counter skills
    a: { key: 'a', name: '질풍보', icon: '💨', cooldown: 8, remaining: 0, radius: 120, damage: 15, effectType: 'dash', gaugeType: 'impact', description: '돌진 이동기' },
    s: { key: 's', name: '역습격', icon: '🛡️', cooldown: 12, remaining: 0, radius: 60, damage: 30, effectType: 'counter', gaugeType: 'impact', backAttack: true, description: '반격기' },
    d: { key: 'd', name: '섬광보', icon: '⚡', cooldown: 8, remaining: 0, radius: 100, damage: 10, effectType: 'dash', gaugeType: 'impact', description: '빠른 회피 돌진' },
    f: { key: 'f', name: '회피타', icon: '🥊', cooldown: 10, remaining: 0, radius: 50, damage: 20, effectType: 'counter', gaugeType: 'impact', description: '회피 후 반격' },
    
    // Special Skills
    t: { key: 't', name: '광염권', icon: '🔥', cooldown: 30, remaining: 0, radius: 120, damage: 80, effectType: 'fireAoE', gaugeType: 'miniSpecial', suraGain: 5, backAttack: true, description: '초각성: 아덴 +5' },
    v: { key: 'v', name: '용호파', icon: '⭐', cooldown: 60, remaining: 0, radius: 120, damage: 90, effectType: 'awakening', hits: 3, hitInterval: 0.15, gaugeType: 'special', headAttack: true, description: '각성: 3연속 강력한 주먹 (헤드어택)' },
    z: { key: 'z', name: '수라결', icon: '💥', cooldown: 0.5, remaining: 0, radius: 150, damage: 25, effectType: 'arden', hits: 10, gaugeType: 'arden', backAttack: true, description: '아덴스킬: 25스택 필요' },
    x: { key: 'x', name: '호신투기', icon: '🛡️', cooldown: 10, remaining: 0, radius: 50, damage: 0, effectType: 'defense', gaugeType: 'defense', description: '방어 스킬' },
  },
  
  createGauge() {
    return {
      type: 'arden', // Arden gauge system
      stacks: 0,
      maxStacks: 25,
      lastGaugeType: null, // For alternating energy/impact
    };
  },
  
  // Character-specific gauge logic
  onSkillUse(gauge, skill) {
    const gaugeType = skill.gaugeType;
    
    if (gaugeType === 'energy' || gaugeType === 'impact') {
      // Must alternate to gain stack
      if (gauge.lastGaugeType !== gaugeType) {
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + 1);
        gauge.lastGaugeType = gaugeType;
      }
    } else if (gaugeType === 'miniSpecial') {
      // T skill: +5 stacks
      const gain = skill.suraGain || 5;
      gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + gain);
    } else if (gaugeType === 'special') {
      // V skill: Fill to max
      gauge.stacks = gauge.maxStacks;
      gauge.lastGaugeType = null;
    } else if (gaugeType === 'arden') {
      // Z skill: Reset to 0
      gauge.stacks = 0;
      gauge.lastGaugeType = null;
    }
    
    return gauge;
  },
};
