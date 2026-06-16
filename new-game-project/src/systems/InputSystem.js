export class InputSystem {
  constructor(inputHandler) {
    this.inputHandler = inputHandler;
  }

  update(state, dt) {
    if (this.inputHandler.consumeInteractPressed()) {
      state.actions.interact = true;
    }

    if (this.inputHandler.consumeToggleUpgradePanelPressed()) {
      state.actions.toggleUpgradePanel = true;
    }

    const upgradeSlot = this.inputHandler.consumeUpgradeSlotPressed();
    if (upgradeSlot) {
      console.log(`Upgrade slot pressed: ${upgradeSlot}, Panel open: ${state.interactions.upgradePanelOpen}`);
      if (state.interactions.upgradePanelOpen) {
        state.actions.upgradeSlot = upgradeSlot;
        console.log(`Setting upgradeSlot action: ${upgradeSlot}`);
      }
    }

    // Process consumable keys
    const useConsumable = this.inputHandler.consumeUseConsumablePressed();
    if (useConsumable) {
      // Check if in raid and has remaining uses
      if (state.currentZone === 'raid') {
        const remainingUses = state.maxRaidConsumables - state.raidConsumablesUsed;
        if (remainingUses <= 0) {
          console.log('레이드에서 소모품을 모두 사용했습니다.');
          return; // Don't allow consumable use
        }
      }
      
      // Only process consumable use if no UI panels are open (dialog, upgrade panel, etc.)
      const isUIOpen = state.interactions?.upgradePanelOpen || state.interactions?.dialog;
      
      if (!isUIOpen) {
        state.actions.useConsumable = useConsumable;
      } else if (state.interactions?.dialog) {
        // If dialog is open, treat number keys as dialog options
        state.actions.dialogOption = useConsumable;
      }
    }

    if (this.inputHandler.consumeEnterRaidPressed()) {
      // Only show raid selection if not in raid
      if (state.currentZone !== 'raid' && window.showRaidSelection) {
        window.showRaidSelection();
      }
      // In raid, R key should be treated as skill (handled below in skill processing)
    }

    if (this.inputHandler.consumeReturnToTownPressed()) {
      state.actions.returnToTown = true;
    }

    // Only process skill keys if:
    // 1. In dungeon/raid zone
    // 2. No UI panels are open (upgrade panel, dialog, etc.)
    const isUIOpen = state.interactions?.upgradePanelOpen || state.interactions?.dialog;
    
    const skillKeys = this.inputHandler.consumeSkillKeysPressed();
    if (skillKeys.length > 0 && (state.currentZone === 'dungeon' || state.currentZone === 'raid') && !isUIOpen) {
      state.actions.castSkills = skillKeys;
    }

    const viewport = state._render?.viewport || { left: 0, top: 0, scaleX: 1, scaleY: 1 };
    const canvas = document.querySelector('canvas');
    const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };

    const click = this.inputHandler.consumeClick();
    if (click) {
      const { left, top, scaleX, scaleY } = viewport;

      const worldX = (click.x - canvasRect.left - left) / scaleX;
      const worldY = (click.y - canvasRect.top - top) / scaleY;

      state.player.targetX = clamp(worldX, 0, state.map.width);
      state.player.targetY = clamp(worldY, 0, state.map.height);
    }

    const rightClick = this.inputHandler.consumeRightClick();
    if (rightClick) {
      const { left, top, scaleX, scaleY } = viewport;

      const worldX = (rightClick.x - canvasRect.left - left) / scaleX;
      const worldY = (rightClick.y - canvasRect.top - top) / scaleY;

      state.actions.basicAttack = { x: worldX, y: worldY };
    }

    // Track mouse position for skill aiming
    const mousePos = this.inputHandler.getMousePosition();
    const { left, top, scaleX, scaleY } = viewport;
    state.mouse = {
      x: (mousePos.x - canvasRect.left - left) / scaleX,
      y: (mousePos.y - canvasRect.top - top) / scaleY,
    };

    state.time += dt;
    state.frame += 1;

    // Mirror local actions into playerActions for multiplayer sync
    if (!state.playerActions) state.playerActions = {};
    const localId = state.localPlayerId || 'local';
    state.playerActions[localId] = {
      castSkills: state.actions.castSkills,
      basicAttack: state.actions.basicAttack,
      interact: state.actions.interact,
      toggleUpgradePanel: state.actions.toggleUpgradePanel,
      upgradeSlot: state.actions.upgradeSlot,
      useConsumable: state.actions.useConsumable,
      useBattleItem: state.actions.useBattleItem,
      enterRaid: state.actions.enterRaid,
      returnToTown: state.actions.returnToTown,
      targetX: state.player.targetX,
      targetY: state.player.targetY,
      mouseX: state.mouse?.x ?? state.player.targetX,
      mouseY: state.mouse?.y ?? state.player.targetY,
    };
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
