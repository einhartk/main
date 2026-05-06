// Gunslinger (건슬링어) - Time to Hunt (사냥의 시간) Engraving
// Triple-weapon wielder: Handgun (Pistols), Shotgun, Rifle
// Core Mechanic: Weapon Swapping Buffs
// 
// [Time to Hunt Engraving Mechanics]
// - Handgun Skill -> Crit Rate +15% for 8s (Level 1) / +30% (Level 3)
// - Shotgun Skill -> Crit Damage +30% for 8s (Level 1) / +60% (Level 3)  
// - Rifle Skill -> Atk/Move Speed +15% for 8s (Level 1) / +25% (Level 3)
// - Swapping weapons builds Hunt Gauge faster

export const gunslinger = {
  name: '건슬링어',
  description: '3종 무기 교대 사용. 핸드건(기동/치명), 샷건(근거리 폭발), 라플(원거리 관통). 무기 교대 시 강력한 버프 획득.',
  difficulty: '상급',
  role: '원거리 딜러',
  
  size: { w: 26, h: 26 },
  color: 0xc9a227, // Gold/Yellow (Gunslinger identity color)
  
  baseStats: {
    maxHp: 90,  // Lower HP (ranged)
    movementSpeed: 105, // Fast (handgun mobility)
    attackSpeed: 100,
  },
  
  // Weapon Types:
  // handgun (기동성, 치명타율 버프)
  // shotgun (근거리, 치명타피해 버프)
  // rifle (원거리, 공이속 버프)
  skills: {
    // Handgun Skills (기동/치명)
    q: { key: 'q', name: '퀵 샷', icon: '🔫', cooldown: 4, remaining: 0, radius: 120, damage: 25, effectType: 'projectile', gaugeType: 'handgun', description: '빠른 핸드건 2연사' },
    w: { key: 'w', name: '애프터 쇼크', icon: '💥', cooldown: 8, remaining: 0, radius: 100, damage: 35, effectType: 'projectile', gaugeType: 'handgun', description: '강력한 핸드건 일격' },
    
    // Shotgun Skills (근거리 폭발)
    e: { key: 'e', name: '샷건 도미네이터', icon: '🔫🔫', cooldown: 10, remaining: 0, radius: 80, damage: 50, effectType: 'fireAoE', gaugeType: 'shotgun', description: '샷건 부채꼴 폭발' },
    r: { key: 'r', name: '카타스트로피', icon: '💣', cooldown: 12, remaining: 0, radius: 90, damage: 60, effectType: 'fireAoE', gaugeType: 'shotgun', description: '샷건 원형 범위 공격' },
    
    // Rifle Skills (원거리 관통)
    a: { key: 'a', name: '포커스드 샷', icon: '🎯', cooldown: 11, remaining: 0, radius: 200, damage: 55, effectType: 'pierce', gaugeType: 'rifle', description: '라플 관통 사격' },
    s: { key: 's', name: '타겟 다운', icon: '🎯💥', cooldown: 14, remaining: 0, radius: 220, damage: 70, effectType: 'pierce', gaugeType: 'rifle', description: '라플 고위력 단일 사격' },
    
    // Utility/Movement
    d: { key: 'd', name: '퀵 스텝', icon: '👟', cooldown: 7, remaining: 0, radius: 150, damage: 0, effectType: 'dash', gaugeType: 'handgun', description: '핸드건 자세에서 빠른 이동' },
    f: { key: 'f', name: '플래시 그레네이드', icon: '💥✨', cooldown: 9, remaining: 0, radius: 100, damage: 20, effectType: 'aoe', gaugeType: 'handgun', description: '섬광 수류탄 (기절 효과)' },
    
    // Special Skills
    t: { key: 't', name: '피스메이커', icon: '🔫✨', cooldown: 30, remaining: 0, radius: 0, damage: 0, effectType: 'buff', gaugeType: 'special', description: '30초간 모든 무기 버프 증폭', buffDuration: 30 },
    v: { key: 'v', name: '하이 눈', icon: '👁️', cooldown: 100, remaining: 0, radius: 300, damage: 180, effectType: 'awakening', gaugeType: 'special', description: '각성: 360도 전방 위력 사격' },
    z: { key: 'z', name: '멸망의 탄환', icon: '🔴', cooldown: 0.5, remaining: 0, radius: 180, damage: 40, effectType: 'projectile', gaugeType: 'hunt', requiredStacks: 20, description: '20스택 필요: 모든 무기 동시 발사' },
    x: { key: 'x', name: '롤', icon: '🔄', cooldown: 8, remaining: 0, radius: 80, damage: 0, effectType: 'counter', gaugeType: 'handgun', description: '구르기로 회피' },
  },
  
  createGauge() {
    return {
      type: 'hunt',
      stacks: 0,
      maxStacks: 20,
      lastWeapon: null, // 'handgun' | 'shotgun' | 'rifle'
      
      // Active buffs from Time to Hunt engraving
      buffs: {
        handgun: { active: false, timeLeft: 0, critRate: 15 }, // Crit Rate +15%
        shotgun: { active: false, timeLeft: 0, critDamage: 30 }, // Crit Damage +30%
        rifle: { active: false, timeLeft: 0, speed: 15 }, // Atk/Move Speed +15%
      },
      
      // Peacekeeper buff active
      peacekeeperActive: false,
      peacekeeperTimeLeft: 0,
    };
  },
  
  onSkillUse(gauge, skill) {
    const weaponType = skill.gaugeType;
    
    // Handle special skills
    if (weaponType === 'special') {
      if (skill.name === '피스메이커') {
        gauge.peacekeeperActive = true;
        gauge.peacekeeperTimeLeft = skill.buffDuration || 30;
        // Fill gauge on use
        gauge.stacks = Math.min(gauge.maxStacks, gauge.stacks + 10);
      } else if (skill.name === '하이 눈') {
        // Awakening fills gauge to max
        gauge.stacks = gauge.maxStacks;
      }
      return gauge;
    }
    
    // Handle Hunt skill (Z)
    if (weaponType === 'hunt') {
      const required = skill.requiredStacks || 20;
      if (gauge.stacks >= required) {
        gauge.stacks = 0; // Consume all stacks
        // Reset buffs
        gauge.buffs.handgun.active = false;
        gauge.buffs.shotgun.active = false;
        gauge.buffs.rifle.active = false;
      }
      return gauge;
    }
    
    // Regular weapon skill - Time to Hunt mechanic
    if (weaponType === 'handgun' || weaponType === 'shotgun' || weaponType === 'rifle') {
      // Check if weapon swapped
      if (gauge.lastWeapon !== weaponType) {
        // Weapon Swap! Apply Time to Hunt buff
        gauge.lastWeapon = weaponType;
        
        // Activate corresponding buff
        if (weaponType === 'handgun') {
          gauge.buffs.handgun.active = true;
          gauge.buffs.handgun.timeLeft = 8;
          gauge.buffs.shotgun.active = false; // Override other buffs
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
    
    return gauge;
  },
  
  // Update buff timers
  onTick(gauge, dt) {
    // Update buff durations
    for (const weapon of ['handgun', 'shotgun', 'rifle']) {
      if (gauge.buffs[weapon].active) {
        gauge.buffs[weapon].timeLeft -= dt;
        if (gauge.buffs[weapon].timeLeft <= 0) {
          gauge.buffs[weapon].active = false;
        }
      }
    }
    
    // Update peacekeeper
    if (gauge.peacekeeperActive) {
      gauge.peacekeeperTimeLeft -= dt;
      if (gauge.peacekeeperTimeLeft <= 0) {
        gauge.peacekeeperActive = false;
      }
    }
    
    return gauge;
  },
  
  // Get current active buff for display
  getActiveBuff(gauge) {
    if (gauge.buffs.handgun.active) return { type: 'handgun', name: '핸드건 집중', value: `치명타율 +${gauge.buffs.handgun.critRate}%` };
    if (gauge.buffs.shotgun.active) return { type: 'shotgun', name: '샷건 파괴', value: `치명타피해 +${gauge.buffs.shotgun.critDamage}%` };
    if (gauge.buffs.rifle.active) return { type: 'rifle', name: '라플 정밀', value: `속도 +${gauge.buffs.rifle.speed}%` };
    return null;
  },
};
