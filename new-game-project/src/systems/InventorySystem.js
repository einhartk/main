import { createItem, upgradeItem, getUpgradeCost, calculateUpgradeResult, ITEM_SLOTS, createConsumable } from '../data/items.js';

export class InventorySystem {
  constructor() {}

  update(state, dt) {
    this.tickConsumableCooldowns(state, dt);

    if (state.actions.toggleUpgradePanel) {
      state.actions.toggleUpgradePanel = false;
      state.interactions.upgradePanelOpen = !state.interactions.upgradePanelOpen;
    }

    if (state.actions.upgradeSlot) {
      const slot = state.actions.upgradeSlot;
      state.actions.upgradeSlot = null;
      this.tryUpgrade(state, slot);
    }

    if (state.actions.useConsumable) {
      const slotIndex = state.actions.useConsumable;
      state.actions.useConsumable = null;
      this.tryUseConsumable(state, slotIndex);
    }
  }

  tickConsumableCooldowns(state, dt) {
    for (let i = 0; i < state.player.consumableSlots.length; i++) {
      const item = state.player.consumableSlots[i];
      if (item && item.remaining > 0) {
        item.remaining = Math.max(0, item.remaining - dt);
      }
    }
  }

  addItem(state, slot, templateId) {
    const item = createItem(slot, templateId);
    if (!item) return false;

    state.player.inventory.push(item);
    return true;
  }

  addConsumable(state, slotIndex, templateId) {
    const item = createConsumable(templateId);
    if (!item) return false;

    state.player.consumableSlots[slotIndex - 1] = item;
    return true;
  }

  equipItem(state, itemId) {
    const idx = state.player.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) return false;

    const item = state.player.inventory[idx];
    const currentEquipped = state.player.equipment[item.slot];

    if (currentEquipped) {
      state.player.inventory.push(currentEquipped);
    }

    state.player.equipment[item.slot] = item;
    state.player.inventory.splice(idx, 1);
    
    // Auto-save on equipment change
    if (window.saveOnActivity) {
      window.saveOnActivity('equip_item');
    }
    
    return true;
  }

  unequipItem(state, slot) {
    const item = state.player.equipment[slot];
    if (!item) return false;

    state.player.inventory.push(item);
    state.player.equipment[slot] = null;
    
    // Auto-save on equipment change
    if (window.saveOnActivity) {
      window.saveOnActivity('unequip_item');
    }
    
    return true;
  }

  tryUpgrade(state, slot) {
    const item = state.player.equipment[slot];
    if (!item) return;

    // 최대 레벨 체크
    if (item.level >= 20) {
      // 최대 레벨 도달 메시지 표시
      if (window.saveOnActivity) {
        window.saveOnActivity('upgrade_max_level');
      }
      return;
    }

    const cost = getUpgradeCost(item);
    if (state.player.gold < cost) return;

    state.player.gold -= cost;
    
    // 새로운 강화 시스템 적용
    const upgradeResult = calculateUpgradeResult(item);
    
    if (upgradeResult.success) {
      state.player.equipment[slot] = upgradeItem(item);
      
      // 성공 메시지
      console.log(`강화 성공! ${item.name} Lv.${item.level} → Lv.${upgradeResult.newLevel} (성공률: ${Math.floor(upgradeResult.successRate * 100)}%)`);
      
      // 모달창에 성공 메시지 표시
      if (window.showUpgradeResult) {
        window.showUpgradeResult('success', `강화 성공! ${item.name} Lv.${item.level} → Lv.${upgradeResult.newLevel}`);
      }
      
      if (window.saveOnActivity) {
        window.saveOnActivity('upgrade_success');
      }
    } else {
      // 실패 또는 하락 처리
      if (upgradeResult.type === 'downgrade') {
        // 하락: 레벨 감소 (구간별 스탯 계산 적용)
        const getCumulativeStatBonus = (level) => {
          let totalBonus = 0;
          for (let i = 0; i < level; i++) {
            if (i <= 5) totalBonus += 3;
            else if (i <= 10) totalBonus += 5;
            else if (i <= 15) totalBonus += 7;
            else totalBonus += 9;
          }
          return totalBonus;
        };
        
        const getRarityBonus = (rarity) => {
          switch (rarity) {
            case 'uncommon': return 2;
            case 'rare': return 5;
            case 'epic': return 10;
            case 'legendary': return 15;
            default: return 0;
          }
        };
        
        const downgradedItem = {
          ...item,
          level: upgradeResult.newLevel,
          totalPower: item.basePower + getCumulativeStatBonus(upgradeResult.newLevel) + getRarityBonus(item.rarity)
        };
        state.player.equipment[slot] = downgradedItem;
        
        console.log(`강화 하락! ${item.name} Lv.${item.level} → Lv.${upgradeResult.newLevel} (성공: ${Math.floor(upgradeResult.successRate * 100)}%, 하락: ${Math.floor(upgradeResult.failureRate * 100)}%)`);
        
        // 모달창에 하락 메시지 표시
        if (window.showUpgradeResult) {
          window.showUpgradeResult('downgrade', `강화 하락! ${item.name} Lv.${item.level} → Lv.${upgradeResult.newLevel}`);
        }
        
        if (window.saveOnActivity) {
          window.saveOnActivity('upgrade_downgrade');
        }
      } else {
        // 실패: 변화 없음
        console.log(`강화 실패! ${item.name} Lv.${item.level} 유지 (성공: ${Math.floor(upgradeResult.successRate * 100)}%, 하락: ${Math.floor(upgradeResult.failureRate * 100)}%)`);
        
        // 모달창에 실패 메시지 표시
        if (window.showUpgradeResult) {
          window.showUpgradeResult('failed', `강화 실패! ${item.name} Lv.${item.level} 유지`);
        }
        
        if (window.saveOnActivity) {
          window.saveOnActivity('upgrade_failed');
        }
      }
    }
  }

  tryUseConsumable(state, slotIndex) {
    const item = state.player.consumableSlots[slotIndex - 1];
    if (!item || item.remaining > 0) return;

    // Track consumable usage in raid
    if (state.currentZone === 'raid') {
      state.raidConsumablesUsed++;
      console.log(`레이드 소모품 사용: ${state.raidConsumablesUsed}/${state.maxRaidConsumables}`);
    }

    if (item.templateId === 'potion_hp') {
      state.player.hp = Math.min(100, state.player.hp + item.healAmount);
    } else if (item.templateId === 'potion_mp') {
      // MP not implemented yet
    } else if (item.templateId === 'potion_elixir') {
      state.player.hp = Math.min(100, state.player.hp + item.healAmount);
    } else if (item.templateId === 'potion_berserk') {
      // Berserk effect not implemented yet
    }

    item.remaining = item.cooldown;
  }

  getTotalPower(state) {
    let total = 0;
    for (const slot of ITEM_SLOTS) {
      const item = state.player.equipment[slot];
      if (item) total += item.totalPower;
    }
    return total;
  }
}
