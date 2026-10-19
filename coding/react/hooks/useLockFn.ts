import { useCallback, useRef } from "react"
import { useLatest } from "./useLatest.ts"

export function useLockFn<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  const latest = useLatest(fn)
  const pending = useRef<Promise<T> | null>(null)
  return useCallback(
    (...args: A): Promise<T> => {
      if (pending.current) return pending.current
      const task = Promise.resolve().then(() => latest.current(...args))
      const locked = task.finally(() => {
        if (pending.current === locked) pending.current = null
      })
      pending.current = locked
      return locked
    },
    [latest]
  )
}
