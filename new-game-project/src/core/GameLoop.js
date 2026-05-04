export class GameLoop {
  constructor({ state, renderer, systems }) {
    this.state = state;
    this.renderer = renderer;
    this.systems = systems;
    this._running = false;
    this._lastTs = 0;

    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;

    this.renderer.init(this.state);

    this._lastTs = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
  }

  _tick(ts) {
    if (!this._running) return;

    const dtMs = ts - this._lastTs;
    this._lastTs = ts;

    const dt = Math.min(0.05, Math.max(0, dtMs / 1000));

    for (const system of this.systems) {
      system.update(this.state, dt);
    }

    // Check death conditions
    if (this.state.player.hp <= 0) {
      this.state.player.hp = 0;
      this.state.player.isDead = true;
      // Return to town on death - use ZoneSystem's returnToTown logic
      if (this.state.currentZone === 'raid') {
        // Same as ESC handling in ZoneSystem
        this.state.currentZone = 'town';
        this.state.boss = null;
        this.state.monsters = [];
        this.state.player.x = 160;
        this.state.player.y = 270;
        this.state.player.targetX = 160;
        this.state.player.targetY = 270;
        this.state.player.hp = 100; // Respawn with full HP
        this.state.player.isDead = false;

        // Restore town map
        this.state.map = {
          width: 960,
          height: 540,
          colliders: [
            { id: 'wall-1', x: 320, y: 160, w: 120, h: 220 },
            { id: 'wall-2', x: 560, y: 320, w: 160, h: 80 },
          ],
        };

        // Update camera
        if (this.renderer._scene && this.renderer._scene.cameras.main) {
          const camera = this.renderer._scene.cameras.main;
          camera.setBounds(0, 0, 960, 540);
          camera.setZoom(1);
          camera.stopFollow();
          camera.scrollX = 0;
          camera.scrollY = 0;
          this.renderer._updateViewportState();
        }
      }
    }

    // Check boss death
    if (this.state.boss && this.state.boss.hp <= 0) {
      this.state.boss.hp = 0;
      this.state.boss.isDead = true;
      // Clear boss and monsters on victory
      this.state.boss = null;
      this.state.monsters = [];
    }

    this.renderer.render(this.state, dt);

    requestAnimationFrame(this._tick);
  }
}
