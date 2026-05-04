export class ZoneSystem {
  constructor(renderer) {
    this.renderer = renderer;
  }

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
    state.player.x = 100;
    state.player.y = 400;
    state.player.targetX = 100;
    state.player.targetY = 400;
    state.interactions.upgradePanelOpen = false;

    state.map = JSON.parse(JSON.stringify(state.raidMap));
    console.log('Enter raid - map:', state.map.width, state.map.height, 'colliders:', state.map.colliders);

    if (this.renderer._scene && this.renderer._scene.cameras.main) {
      const camera = this.renderer._scene.cameras.main;
      camera.setBounds(0, 0, 1200, 800);
      camera.setZoom(1);
      camera.stopFollow();
      camera.scrollX = 0;
      camera.scrollY = 0;
      this.renderer._updateViewportState();
      console.log('Camera set to bounds: 1200x800, zoom: 1');
    }
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

    state.map = {
      width: 960,
      height: 540,
      colliders: [
        { id: 'wall-1', x: 320, y: 160, w: 120, h: 220 },
        { id: 'wall-2', x: 560, y: 320, w: 160, h: 80 },
      ],
    };
    console.log('Return to town - map:', state.map.width, state.map.height, 'colliders:', state.map.colliders);

    if (this.renderer._scene && this.renderer._scene.cameras.main) {
      const camera = this.renderer._scene.cameras.main;
      camera.setBounds(0, 0, 960, 540);
      camera.setZoom(1);
      camera.stopFollow();
      camera.scrollX = 0;
      camera.scrollY = 0;
      this.renderer._updateViewportState();
      console.log('Camera set to bounds: 960x540, zoom: 1');
    }
  }
}
