export class ZoneSystem {
  constructor() {}

  update(state, dt) {
    if (state.actions.enterRaid) {
      state.actions.enterRaid = false;
      this.enterRaid(state);
    }

    if (state.actions.returnToTown) {
      state.actions.returnToTown = false;
      this.returnToTown(state);
    }
  }

  enterRaid(state) {
    if (state.currentZone === 'raid') return;

    state.currentZone = 'raid';
    state.boss = JSON.parse(JSON.stringify(state.raid.boss));
    state.monsters = [];
    state.player.x = 160;
    state.player.y = 270;
    state.player.targetX = 160;
    state.player.targetY = 270;
    state.interactions.upgradePanelOpen = false;
  }

  returnToTown(state) {
    if (state.currentZone === 'town') return;

    state.currentZone = 'town';
    state.boss = null;
    state.monsters = [];
    state.player.x = 160;
    state.player.y = 270;
    state.player.targetX = 160;
    state.player.targetY = 270;
    state.interactions.upgradePanelOpen = false;
  }
}
