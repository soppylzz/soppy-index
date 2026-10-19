import { onScopeDispose } from "vue"

export function useThrottle<A extends unknown[]>(callback: (...args: A) => void, delay = 300) {
  let previous: number | undefined
  let pending: A | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
    previous = undefined
  }
  const run = (...args: A) => {
    const now = Date.now()
    const remaining = previous === undefined ? 0 : delay - (now - previous)
    if (remaining <= 0) {
      clearTimeout(timer)
      timer = undefined
      pending = undefined
      previous = now
      callback(...args)
    } else {
      pending = args
      timer ??= setTimeout(() => {
        timer = undefined
        const latest = pending!
        pending = undefined
        previous = Date.now()
        callback(...latest)
      }, remaining)
    }
  }
  onScopeDispose(cancel)
  return { run, cancel }
}
