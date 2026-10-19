type EventMap = Record<string, unknown[]>

export class EventEmitter<Events extends { [Key in keyof Events]: unknown[] } = EventMap> {
  private listeners = new Map<
    keyof Events,
    Set<{ listener: unknown; invoke: (args: unknown[]) => void; once: boolean }>
  >()

  private add<Key extends keyof Events>(
    event: Key,
    listener: (...args: Events[Key]) => void,
    once: boolean
  ) {
    const entry = {
      listener,
      invoke: (args: unknown[]) => listener(...(args as Events[Key])),
      once,
    }
    let entries = this.listeners.get(event)
    if (!entries) {
      entries = new Set()
      this.listeners.set(event, entries)
    }
    entries.add(entry)
    return () => {
      entries.delete(entry)
      if (entries.size === 0 && this.listeners.get(event) === entries) this.listeners.delete(event)
    }
  }

  on<Key extends keyof Events>(event: Key, listener: (...args: Events[Key]) => void) {
    return this.add(event, listener, false)
  }

  once<Key extends keyof Events>(event: Key, listener: (...args: Events[Key]) => void) {
    return this.add(event, listener, true)
  }

  off<Key extends keyof Events>(event: Key, listener: (...args: Events[Key]) => void): void {
    const entries = this.listeners.get(event)
    if (!entries) return
    for (const entry of entries) if (entry.listener === listener) entries.delete(entry)
    if (entries.size === 0) this.listeners.delete(event)
  }

  emit<Key extends keyof Events>(event: Key, ...args: Events[Key]): boolean {
    const entries = this.listeners.get(event)
    if (!entries) return false
    // New listeners wait until the next emission; removed listeners are skipped.
    for (const entry of [...entries]) {
      if (!entries.has(entry)) continue
      if (entry.once) {
        entries.delete(entry)
        if (entries.size === 0) this.listeners.delete(event)
      }
      entry.invoke(args)
    }
    return true
  }

  clear(event?: keyof Events): void {
    if (event === undefined) {
      for (const entries of this.listeners.values()) entries.clear()
      this.listeners.clear()
    } else {
      this.listeners.get(event)?.clear()
      this.listeners.delete(event)
    }
  }
}
