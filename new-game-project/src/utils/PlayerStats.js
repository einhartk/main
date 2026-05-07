// Player Stats Calculator
export function calculatePlayerMaxHp(player) {
  const baseHp = player.maxHp;
  let hpBonus = 0;
  
  // Calculate HP bonus from equipment
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const item = player.equipment[slot];
    if (item && item.totalPower) {
      // Each 100 power gives 10 HP bonus
      hpBonus += Math.floor(item.totalPower / 10);
    }
  }
  
  return baseHp + hpBonus;
}

export function updatePlayerHp(player) {
  const newMaxHp = calculatePlayerMaxHp(player);
  const hpRatio = player.hp / player.maxHp;
  
  player.maxHp = newMaxHp;
  player.hp = Math.floor(newMaxHp * hpRatio); // Maintain HP ratio
}

export function getPlayerHpWithEquipment(player) {
  return {
    current: player.hp,
    max: calculatePlayerMaxHp(player),
    percentage: (player.hp / calculatePlayerMaxHp(player)) * 100
  };
}
