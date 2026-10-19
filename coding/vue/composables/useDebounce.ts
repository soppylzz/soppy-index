import { onScopeDispose } from "vue"

export function useDebounce<A extends unknown[]>(callback: (...args: A) => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: A | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    pending = undefined
  }
  const flush = () => {
    if (!pending) return
    const args = pending
    cancel()
    callback(...args)
  }
  const run = (...args: A) => {
    clearTimeout(timer)
    pending = args
    timer = setTimeout(flush, delay)
  }
  onScopeDispose(cancel)
  return { run, cancel, flush }
}
