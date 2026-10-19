import { customRef, onScopeDispose } from "vue"

export function useDebouncedRef<T>(initial: T, delay = 300) {
  let value = initial
  let timer: ReturnType<typeof setTimeout> | undefined
  onScopeDispose(() => clearTimeout(timer))
  return customRef<T>((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(next) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (Object.is(next, value)) return
        value = next
        trigger()
      }, delay)
    },
  }))
}
