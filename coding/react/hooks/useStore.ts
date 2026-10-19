import { useSyncExternalStore } from "react"

export function createStore<T>(initial: T) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setState(update: T | ((previous: T) => T)) {
      const next = typeof update === "function" ? (update as (previous: T) => T)(snapshot) : update
      if (Object.is(next, snapshot)) return
      snapshot = next
      for (const listener of [...listeners]) listener()
    },
  }
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}
