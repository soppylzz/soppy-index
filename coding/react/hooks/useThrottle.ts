import { useCallback, useEffect, useRef } from "react"
import { useLatest } from "./useLatest.ts"

export function useThrottle<A extends unknown[]>(callback: (...args: A) => void, delay = 300) {
  const latest = useLatest(callback)
  const last = useRef<number | undefined>(undefined)
  const args = useRef<A | undefined>(undefined)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    args.current = undefined
    last.current = undefined
  }, [])
  const run = useCallback(
    (...next: A) => {
      const now = Date.now()
      const remaining = last.current === undefined ? 0 : delay - (now - last.current)
      if (remaining <= 0) {
        clearTimeout(timer.current)
        timer.current = undefined
        args.current = undefined
        last.current = now
        latest.current(...next)
      } else {
        args.current = next
        timer.current ??= setTimeout(() => {
          timer.current = undefined
          const pending = args.current!
          args.current = undefined
          last.current = Date.now()
          latest.current(...pending)
        }, remaining)
      }
    },
    [delay, latest]
  )
  useEffect(() => cancel, [delay, cancel])
  return { run, cancel }
}
