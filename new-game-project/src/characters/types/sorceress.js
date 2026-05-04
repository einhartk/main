// Sorceress (소서리스) - Elemental Mage
// Long-range magic user with elemental spells
// Gauge System: Mana (마나) - Cast spells, regenerate over time

export const sorceress = {
  name: '소서리스',
  description: '원거리 마법사. 불, 얼음, 번개의 원소 마법으로 적을 제압합니다. 마나를 관리하며 강력한 주문을 사용합니다.',
  difficulty: '상급',
  role: '딜러',
  
  size: { w: 26, h: 26 },
  color: 0x9370db, // Medium Purple
  
  baseStats: {
    maxHp: 80,
    movementSpeed: 90,
    attackSpeed: 100,
  },
  
  // Elemental skills with mana cost
  skills: {
    // Fire(불) - High damage, medium cost
    q: { key: 'q', name: '파이어볼', cooldown: 6, remaining: 0, radius: 150, damage: 40, effectType: 'projectile', gaugeType: 'fire', manaCost: 15, description: '불덩이 발사' },
    w: { key: 'w', name: '파이어웨이브', cooldown: 10, remaining: 0, radius: 120, damage: 55, effectType: 'fireAoE', gaugeType: 'fire', manaCost: 25, description: '화염 파동' },
    
    // Ice(얼음) - Control + damage
    e: { key: 'e', name: '아이스볼트', cooldown: 7, remaining: 0, radius: 140, damage: 30, effectType: 'projectile', gaugeType: 'ice', manaCost: 12, slow: true, description: '빙결 볼트' },
    r: { key: 'r', name: '블리자드', cooldown: 14, remaining: 0, radius: 100, damage: 45, effectType: 'aoe', gaugeType: 'ice', manaCost: 35, freeze: true, description: '눈보라' },
    
    // Lightning(번개) - Fast, chain damage
    a: { key: 'a', name: '썬더볼트', cooldown: 5, remaining: 0, radius: 180, damage: 35, effectType: 'chain', gaugeType: 'lightning', manaCost: 18, description: '번개 발사' },
    s: { key: 's', name: '체인라이트닝', cooldown: 11, remaining: 0, radius: 160, damage: 50, effectType: 'chain', gaugeType: 'lightning', manaCost: 30, chainCount: 3, description: '연쇄 번개' },
    
    // Utility
    d: { key: 'd', name: '블링크', cooldown: 8, remaining: 0, radius: 200, damage: 0, effectType: 'dash', gaugeType: 'arcane', manaCost: 20, description: '순간 이동' },
    f: { key: 'f', name: '매직실드', cooldown: 15, remaining: 0, radius: 50, damage: 0, effectType: 'defense', gaugeType: 'arcane', manaCost: 25, description: '마법 보호막' },
    
    // Special
    t: { key: 't', name: '마나회복', cooldown: 20, remaining: 0, radius: 0, damage: 0, effectType: 'buff', gaugeType: 'special', manaRestore: 50, description: '즉시 마나 50 회복' },
    v: { key: 'v', name: '메테오', cooldown: 100, remaining: 0, radius: 250, damage: 200, effectType: 'falling', gaugeType: 'special', manaCost: 80, description: '각성: 메테오 소환' },
    z: { key: 'z', name: '엘리멘탈버스트', cooldown: 0.5, remaining: 0, radius: 200, damage: 100, effectType: 'aoe', gaugeType: 'ultimate', manaCost: 40, requiredMana: 40, description: '40마나 필요: 원소 폭발' },
    x: { key: 'x', name: '텔레포트', cooldown: 12, remaining: 0, radius: 300, damage: 0, effectType: 'dash', gaugeType: 'arcane', manaCost: 35, description: '긴 거리 텔레포트' },
  },
  
  createGauge() {
    return {
      type: 'mana',
      current: 100,
      max: 100,
      regenRate: 5, // Mana per second
    };
  },
  
  onSkillUse(gauge, skill) {
    const gaugeType = skill.gaugeType;
    
    if (gaugeType === 'fire' || gaugeType === 'ice' || 
        gaugeType === 'lightning' || gaugeType === 'arcane') {
      // Spend mana
      const cost = skill.manaCost || 0;
      if (gauge.current >= cost) {
        gauge.current -= cost;
      }
    } else if (gaugeType === 'special') {
      // T skill: Restore mana
      if (skill.manaRestore) {
        gauge.current = Math.min(gauge.max, gauge.current + skill.manaRestore);
      }
      // V skill: Spend large mana
      if (skill.manaCost) {
        if (gauge.current >= skill.manaCost) {
          gauge.current -= skill.manaCost;
        }
      }
    } else if (gaugeType === 'ultimate') {
      // Z skill: Check required mana
      const required = skill.requiredMana || skill.manaCost || 0;
      if (gauge.current >= required) {
        gauge.current -= skill.manaCost || required;
      }
    }
    
    return gauge;
  },
  
  // Mana regeneration per tick
  onTick(gauge, dt) {
    if (gauge.regenRate > 0) {
      gauge.current = Math.min(gauge.max, gauge.current + gauge.regenRate * dt);
    }
    return gauge;
  },
};
