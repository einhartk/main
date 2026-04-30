export class InputBuffer {
  constructor() {
    this._queue = [];
  }

  push(evt) {
    this._queue.push(evt);
  }

  drain() {
    const out = this._queue;
    this._queue = [];
    return out;
  }
}
