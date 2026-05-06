export const ITEM_SLOTS = ['weapon', 'armor', 'accessory'];
export const CONSUMABLE_SLOTS = [1, 2, 3, 4];

export const ITEM_TEMPLATES = {
  weapon: [
    { id: 'w1', name: 'Iron Sword', basePower: 10, rarity: 'common' },
    { id: 'w2', name: 'Steel Sword', basePower: 25, rarity: 'uncommon' },
    { id: 'w3', name: 'Mithril Sword', basePower: 50, rarity: 'rare' },
  ],
  armor: [
    { id: 'a1', name: 'Leather Armor', basePower: 8, rarity: 'common' },
    { id: 'a2', name: 'Chain Mail', basePower: 20, rarity: 'uncommon' },
    { id: 'a3', name: 'Plate Armor', basePower: 40, rarity: 'rare' },
  ],
  accessory: [
    { id: 'ac1', name: 'Copper Ring', basePower: 5, rarity: 'common' },
    { id: 'ac2', name: 'Silver Ring', basePower: 15, rarity: 'uncommon' },
    { id: 'ac3', name: 'Gold Ring', basePower: 30, rarity: 'rare' },
  ],
};

export const CONSUMABLE_TEMPLATES = {
  potion_hp: { id: 'potion_hp', name: 'HP Potion', healAmount: 50, cooldown: 30 },
  potion_mp: { id: 'potion_mp', name: 'MP Potion', healAmount: 30, cooldown: 30 },
  potion_elixir: { id: 'potion_elixir', name: 'Elixir', healAmount: 100, cooldown: 60 },
  potion_berserk: { id: 'potion_berserk', name: 'Berserk', damageBoost: 20, duration: 10, cooldown: 120 },
};

export function createItem(slot, templateId, level = 0) {
  const templates = ITEM_TEMPLATES[slot];
  const template = templates.find((t) => t.id === templateId);
  if (!template) return null;

  // 희귀도에 따른 초기 보너스
  let rarityBonus = 0;
  switch (template.rarity) {
    case 'uncommon':
      rarityBonus = 2;
      break;
    case 'rare':
      rarityBonus = 5;
      break;
    case 'epic':
      rarityBonus = 10;
      break;
    case 'legendary':
      rarityBonus = 15;
      break;
    default: // common
      rarityBonus = 0;
  }

  // 구간별 누적 스탯 보너스 적용
  const cumulativeStatBonus = getCumulativeStatBonus(level);
  const totalPower = template.basePower + cumulativeStatBonus + rarityBonus;

  return {
    id: `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    templateId,
    slot,
    name: template.name,
    basePower: template.basePower,
    rarity: template.rarity,
    level,
    totalPower: totalPower,
  };
}

export function createConsumable(templateId) {
  const template = CONSUMABLE_TEMPLATES[templateId];
  if (!template) return null;

  return {
    id: `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    templateId,
    name: template.name,
    ...template,
    remaining: 0,
  };
}

// 구간별 스탯 증가량 계산
function getStatBonusForLevel(level) {
  // 레벨 구간별로 다른 증가량 적용
  if (level <= 5) {
    return 3; // 1-5레벨: 낮은 증가량 (초기)
  } else if (level <= 10) {
    return 5; // 6-10레벨: 중간 증가량 (중기)
  } else if (level <= 15) {
    return 7; // 11-15레벨: 높은 증가량 (후기)
  } else {
    return 9; // 16-20레벨: 최고 증가량 (최종)
  }
}

// 누적 스탯 보너스 계산
function getCumulativeStatBonus(level) {
  let totalBonus = 0;
  for (let i = 0; i < level; i++) {
    totalBonus += getStatBonusForLevel(i);
  }
  return totalBonus;
}

export function upgradeItem(item) {
  // 최대 레벨 체크
  if (item.level >= 20) {
    return {
      ...item,
      upgradeFailed: true,
      reason: 'MAX_LEVEL'
    };
  }
  
  const newLevel = item.level + 1;
  
  // 희귀도에 따른 추가 보너스
  let rarityBonus = 0;
  switch (item.rarity) {
    case 'uncommon':
      rarityBonus = 2;
      break;
    case 'rare':
      rarityBonus = 5;
      break;
    case 'epic':
      rarityBonus = 10;
      break;
    case 'legendary':
      rarityBonus = 15;
      break;
    default: // common
      rarityBonus = 0;
  }
  
  // 구간별 누적 스탯 보너스 적용
  const cumulativeStatBonus = getCumulativeStatBonus(newLevel);
  const totalPower = item.basePower + cumulativeStatBonus + rarityBonus;
  
  return {
    ...item,
    level: newLevel,
    totalPower: totalPower,
  };
}

export function getUpgradeCost(item) {
  // 레벨에 따른 기본 비용 증가
  const baseCost = 100;
  const costPerLevel = 150;
  const levelMultiplier = Math.pow(1.5, item.level); // 지수적 비용 증가
  
  // 등급에 따른 비용 배수
  let rarityMultiplier = 1.0;
  switch (item.rarity) {
    case 'uncommon':
      rarityMultiplier = 1.5; // +50%
      break;
    case 'rare':
      rarityMultiplier = 2.0; // +100%
      break;
    case 'epic':
      rarityMultiplier = 3.0; // +200%
      break;
    case 'legendary':
      rarityMultiplier = 5.0; // +400%
      break;
    default: // common
      rarityMultiplier = 1.0;
  }
  
  const baseCostWithLevel = baseCost + (costPerLevel * levelMultiplier);
  return Math.floor(baseCostWithLevel * rarityMultiplier);
}

export function getUpgradeSuccessRate(item) {
  // 레벨에 따른 성공률: 최대 25%에서 시작해 최종 3%까지
  const maxSuccessRate = 0.25; // 최대 25%
  const minSuccessRate = 0.03; // 최소 3%
  
  // 레벨 0~19에 대한 성공률 계산 (선형 감소)
  const levelProgress = item.level / 19; // 0~1 사이의 진행률
  const successRate = maxSuccessRate - (maxSuccessRate - minSuccessRate) * levelProgress;
  
  // 희귀도에 따른 추가 페널티
  let rarityPenalty = 0;
  switch (item.rarity) {
    case 'uncommon':
      rarityPenalty = 0.02; // -2%
      break;
    case 'rare':
      rarityPenalty = 0.05; // -5%
      break;
    case 'epic':
      rarityPenalty = 0.08; // -8%
      break;
    case 'legendary':
      rarityPenalty = 0.12; // -12%
      break;
  }
  
  const finalRate = Math.max(minSuccessRate, successRate - rarityPenalty);
  return finalRate;
}

export function getUpgradeFailureRate(item) {
  // 하락 확률은 성공률의 1/4
  const successRate = getUpgradeSuccessRate(item);
  return successRate * 0.25;
}

export function calculateUpgradeResult(item) {
  const successRate = getUpgradeSuccessRate(item);
  const failureRate = getUpgradeFailureRate(item);
  const random = Math.random();
  
  let result;
  if (random < successRate) {
    // 성공
    result = {
      success: true,
      successRate: successRate,
      newLevel: item.level + 1,
      cost: getUpgradeCost(item),
      type: 'success'
    };
  } else if (random < successRate + failureRate) {
    // 하락
    const newLevel = Math.max(0, item.level - 1);
    result = {
      success: false,
      successRate: successRate,
      failureRate: failureRate,
      newLevel: newLevel,
      cost: getUpgradeCost(item),
      type: 'downgrade',
      levelLost: item.level - newLevel
    };
  } else {
    // 실패 (변화 없음)
    result = {
      success: false,
      successRate: successRate,
      failureRate: failureRate,
      newLevel: item.level,
      cost: getUpgradeCost(item),
      type: 'failed'
    };
  }
  
  return result;
}

