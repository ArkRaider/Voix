type Listener<T extends any[]> = (...args: T) => void;

export class EventEmitter<EventMap extends Record<string, any[]>> {
  private listeners: { [K in keyof EventMap]?: Set<Listener<EventMap[K]>> } = {};

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>) {
    if (this.listeners[event]) {
      this.listeners[event]!.delete(listener);
    }
  }

  emit<K extends keyof EventMap>(event: K, ...args: EventMap[K]) {
    if (this.listeners[event]) {
      this.listeners[event]!.forEach(listener => listener(...args));
    }
  }
}
