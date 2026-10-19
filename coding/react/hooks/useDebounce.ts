import { useCallback, useEffect, useRef } from "react"
import { useLatest } from "./useLatest.ts"

export function useDebounce<A extends unknown[]>(callback: (...args: A) => void, delay = 300) {
  const latest = useLatest(callback)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const args = useRef<A | undefined>(undefined)
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    args.current = undefined
  }, [])
  const flush = useCallback(() => {
    if (!args.current) return
    const pending = args.current
    cancel()
    latest.current(...pending)
  }, [cancel, latest])
  const run = useCallback(
    (...next: A) => {
      clearTimeout(timer.current)
      args.current = next
      timer.current = setTimeout(flush, delay)
    },
    [delay, flush]
  )
  useEffect(() => cancel, [delay, cancel])
  return { run, cancel, flush }
}
