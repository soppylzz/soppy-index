import { onScopeDispose, ref, watch } from "vue"

export function useStorage<T>(storage: Storage, key: string, fallback: T) {
  const read = () => {
    const stored = storage.getItem(key)
    if (stored === null) return fallback
    try {
      return JSON.parse(stored) as T
    } catch {
      return fallback
    }
  }
  const value = ref(read())
  const error = ref<Error | null>(null)
  let syncing = false
  const stop = watch(
    value,
    (next) => {
      if (syncing) return
      try {
        const serialized = JSON.stringify(next)
        if (serialized === undefined)
          throw new TypeError("Storage values must be JSON serializable")
        storage.setItem(key, serialized)
        window.dispatchEvent(new CustomEvent("vue-interview-storage", { detail: { storage, key } }))
        error.value = null
      } catch (cause) {
        error.value = cause instanceof Error ? cause : new Error(String(cause))
      }
    },
    { deep: true, flush: "sync" }
  )
  const sync = () => {
    syncing = true
    try {
      value.value = read()
      error.value = null
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause))
    } finally {
      syncing = false
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === storage && (event.key === key || event.key === null)) sync()
  }
  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<{ storage: Storage; key: string }>).detail
    if (detail.storage === storage && detail.key === key) sync()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener("vue-interview-storage", onLocal)
  onScopeDispose(() => {
    stop()
    window.removeEventListener("storage", onStorage)
    window.removeEventListener("vue-interview-storage", onLocal)
  })
  return { value, error }
}
