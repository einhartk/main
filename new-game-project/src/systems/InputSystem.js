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
      state.actions.upgradeSlot = upgradeSlot;
    }

    const useConsumable = this.inputHandler.consumeUseConsumablePressed();
    if (useConsumable) {
      state.actions.useConsumable = useConsumable;
    }

    if (this.inputHandler.consumeEnterRaidPressed()) {
      state.actions.enterRaid = true;
    }

    if (this.inputHandler.consumeReturnToTownPressed()) {
      state.actions.returnToTown = true;
    }

    const skillKeys = this.inputHandler.consumeSkillKeysPressed();
    if (skillKeys.length > 0 && (state.currentZone === 'dungeon' || state.currentZone === 'raid')) {
      state.actions.castSkills = skillKeys;
    }

    const viewport = state._render?.viewport;
    if (viewport) {
      const click = this.inputHandler.consumeClick();
      if (click) {
        const { left, top, scaleX, scaleY } = viewport;

        const worldX = (click.x - left) / scaleX;
        const worldY = (click.y - top) / scaleY;

        state.player.targetX = clamp(worldX, 0, state.map.width);
        state.player.targetY = clamp(worldY, 0, state.map.height);
      }

      const rightClick = this.inputHandler.consumeRightClick();
      if (rightClick && (state.currentZone === 'dungeon' || state.currentZone === 'raid')) {
        const { left, top, scaleX, scaleY } = viewport;

        const worldX = (rightClick.x - left) / scaleX;
        const worldY = (rightClick.y - top) / scaleY;

        state.actions.basicAttack = { x: worldX, y: worldY };
      }
    }

    state.time += dt;
    state.frame += 1;
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
