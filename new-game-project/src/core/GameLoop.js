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

    this.renderer.render(this.state, dt);

    requestAnimationFrame(this._tick);
  }
}
