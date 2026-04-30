import { createItem, upgradeItem, getUpgradeCost, ITEM_SLOTS, createConsumable } from '../data/items.js';

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
    return true;
  }

  unequipItem(state, slot) {
    const item = state.player.equipment[slot];
    if (!item) return false;

    state.player.inventory.push(item);
    state.player.equipment[slot] = null;
    return true;
  }

  tryUpgrade(state, slot) {
    const item = state.player.equipment[slot];
    if (!item) return;

    const cost = getUpgradeCost(item);
    if (state.player.gold < cost) return;

    state.player.gold -= cost;
    state.player.equipment[slot] = upgradeItem(item);
  }

  tryUseConsumable(state, slotIndex) {
    const item = state.player.consumableSlots[slotIndex - 1];
    if (!item || item.remaining > 0) return;

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
