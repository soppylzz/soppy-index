export type ValueObserver<Value> = (value: Value, previous: Value) => void

export class ObservableValue<Value> {
  private value: Value
  private observers = new Set<ValueObserver<Value>>()
  private pending: Array<{ value: Value; previous: Value }> = []
  private notifying = false

  constructor(value: Value) {
    this.value = value
  }

  get(): Value {
    return this.value
  }

  subscribe(observer: ValueObserver<Value>): () => void {
    this.observers.add(observer)
    return () => {
      this.observers.delete(observer)
    }
  }

  set(value: Value): void {
    if (Object.is(value, this.value)) return
    const previous = this.value
    this.value = value
    this.pending.push({ value, previous })
    if (this.notifying) return

    this.notifying = true
    try {
      while (this.pending.length > 0) {
        const change = this.pending.shift()!
        // Nested writes queue notifications behind the current change.
        for (const observer of [...this.observers]) {
          if (this.observers.has(observer)) observer(change.value, change.previous)
        }
      }
    } finally {
      this.pending = []
      this.notifying = false
    }
  }
}
