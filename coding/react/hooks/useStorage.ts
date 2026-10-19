import { useCallback, useState, useSyncExternalStore } from "react"

const localChange = "interview-storage-change"

export function useStorage<T>(storage: Storage, key: string, initialValue: T) {
  const [fallback] = useState(() => initialValue)
  const subscribe = useCallback(
    (notify: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea === storage && (event.key === key || event.key === null)) notify()
      }
      window.addEventListener("storage", onStorage)
      window.addEventListener(localChange, notify)
      return () => {
        window.removeEventListener("storage", onStorage)
        window.removeEventListener(localChange, notify)
      }
    },
    [storage, key]
  )
  // A string is a stable snapshot. Parsing here would allocate on every read.
  const raw = useSyncExternalStore(subscribe, () => storage.getItem(key))
  let value = fallback
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      /* Invalid external JSON uses the default. */
    }
  }
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const stored = storage.getItem(key)
      let previous = fallback
      if (stored !== null) {
        try {
          previous = JSON.parse(stored) as T
        } catch {
          /* Keep the default. */
        }
      }
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next
      const serialized = JSON.stringify(resolved)
      if (serialized === undefined) throw new TypeError("Storage values must be JSON serializable")
      storage.setItem(key, serialized)
      window.dispatchEvent(new Event(localChange))
    },
    [storage, key, fallback]
  )
  return [value, setValue] as const
}
