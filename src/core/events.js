/** Tiny synchronous event emitter used to decouple game logic from rendering/UI. */
export class Emitter {
  constructor() {
    this.handlers = new Map();
  }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  emit(type, data) {
    const set = this.handlers.get(type);
    if (set) for (const fn of set) fn(data);
    const any = this.handlers.get('*');
    if (any) for (const fn of any) fn(type, data);
  }
}
