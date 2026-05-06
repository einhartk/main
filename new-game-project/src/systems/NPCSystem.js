import { getNPCAABB, NPC_SIZE } from '../entities/npc.js';
import { aabbIntersects } from '../physics/aabb.js';

export class NPCSystem {
  constructor({ interactDistance = 40 } = {}) {
    this.interactDistance = interactDistance;
  }

  update(state, dt) {
    if (state.actions.interact) {
      state.actions.interact = false;
      this.tryInteract(state);
    }

    // Handle dialog option selection
    if (state.actions.dialogOption) {
      const option = state.actions.dialogOption;
      state.actions.dialogOption = null;
      this.handleDialogOption(state, option);
    }
  }

  tryInteract(state) {
    // Disable interaction in raid/dungeon zones - only allow in town
    if (state.currentZone !== 'town') {
      state.interactions.targetNpcId = null;
      state.interactions.dialog = null;
      return;
    }

    const p = state.player;
    const px = p.x;
    const py = p.y;

    let closest = null;
    let closestDist2 = this.interactDistance * this.interactDistance;

    for (const npc of state.town.npcs) {
      const dx = npc.x - px;
      const dy = npc.y - py;
      const d2 = dx * dx + dy * dy;

      if (d2 <= closestDist2) {
        closest = npc;
        closestDist2 = d2;
      }
    }

    if (closest) {
      state.interactions.targetNpcId = closest.id;
      state.interactions.dialog = this.getDialog(closest);

      if (closest.role === 'upgrade') {
        // 강화 모달창 열기
        if (window.showUpgradeModal) {
          window.showUpgradeModal();
        }
      }
    } else {
      state.interactions.targetNpcId = null;
      state.interactions.dialog = null;
    }
  }

  getDialog(npc) {
    const role = npc.role;
    switch (role) {
      case 'shop':
        return 'Welcome to my shop! What can I get you?';
      case 'upgrade':
        return 'I can upgrade your gear. Press I to open upgrade panel.';
      case 'info':
        return 'Press E to interact with NPCs. Click to move.';
      default:
        return 'Hello, traveler!';
    }
  }

  handleDialogOption(state, option) {
    if (!state.interactions.dialog) return;

    const targetNpc = state.town.npcs.find(npc => npc.id === state.interactions.targetNpcId);
    if (!targetNpc) return;

    const role = targetNpc.role;
    
    switch (role) {
      case 'shop':
        this.handleShopDialog(state, option);
        break;
      case 'upgrade':
        this.handleUpgradeDialog(state, option);
        break;
      case 'info':
        this.handleInfoDialog(state, option);
        break;
      default:
        // Close dialog on any option for generic NPCs
        state.interactions.dialog = 'Goodbye!';
        setTimeout(() => {
          state.interactions.targetNpcId = null;
          state.interactions.dialog = null;
        }, 1500);
        break;
    }
  }

  handleShopDialog(state, option) {
    switch (option) {
      case 1:
        state.interactions.dialog = 'Here are our finest weapons!';
        break;
      case 2:
        state.interactions.dialog = 'Check out our armor collection!';
        break;
      case 3:
        state.interactions.dialog = 'We have various accessories available!';
        break;
      case 4:
        state.interactions.dialog = 'Thanks for visiting!';
        setTimeout(() => {
          state.interactions.targetNpcId = null;
          state.interactions.dialog = null;
        }, 1500);
        break;
      default:
        state.interactions.dialog = 'Please select an option (1-4).';
        break;
    }
  }

  handleUpgradeDialog(state, option) {
    switch (option) {
      case 1:
        state.interactions.dialog = 'I can upgrade your weapons to make them stronger!';
        if (window.showUpgradeModal) {
          window.showUpgradeModal();
        }
        break;
      case 2:
        state.interactions.dialog = 'Armor upgrades provide better protection!';
        if (window.showUpgradeModal) {
          window.showUpgradeModal();
        }
        break;
      case 3:
        state.interactions.dialog = 'Accessories give you special bonuses!';
        if (window.showUpgradeModal) {
          window.showUpgradeModal();
        }
        break;
      case 4:
        state.interactions.dialog = 'Come back when you need upgrades!';
        setTimeout(() => {
          state.interactions.targetNpcId = null;
          state.interactions.dialog = null;
        }, 1500);
        break;
      default:
        state.interactions.dialog = 'Please select an option (1-4).';
        break;
    }
  }

  handleInfoDialog(state, option) {
    switch (option) {
      case 1:
        state.interactions.dialog = 'Use number keys 1-4 to select dialog options!';
        break;
      case 2:
        state.interactions.dialog = 'Click on the ground to move your character!';
        break;
      case 3:
        state.interactions.dialog = 'Right-click to perform basic attacks!';
        break;
      case 4:
        state.interactions.dialog = 'Good luck on your adventures!';
        setTimeout(() => {
          state.interactions.targetNpcId = null;
          state.interactions.dialog = null;
        }, 1500);
        break;
      default:
        state.interactions.dialog = 'Please select an option (1-4).';
        break;
    }
  }
}
