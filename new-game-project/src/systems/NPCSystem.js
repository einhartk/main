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
  }

  tryInteract(state) {
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
        state.interactions.upgradePanelOpen = true;
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
}
