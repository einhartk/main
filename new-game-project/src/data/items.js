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

  return {
    id: `${templateId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    templateId,
    slot,
    name: template.name,
    basePower: template.basePower,
    rarity: template.rarity,
    level,
    totalPower: template.basePower + level * 5,
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

export function upgradeItem(item) {
  return {
    ...item,
    level: item.level + 1,
    totalPower: item.basePower + (item.level + 1) * 5,
  };
}

export function getUpgradeCost(item) {
  return 100 + item.level * 150;
}
