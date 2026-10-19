import { useCallback, useEffect, useRef, useState } from "react"
import { useLatest } from "./useLatest.ts"

export type AsyncState<T> =
  | { status: "idle" | "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error }

export function useAsync<A extends unknown[], T>(
  task: (signal: AbortSignal, ...args: A) => Promise<T>
) {
  const latest = useLatest(task)
  const [state, setState] = useState<AsyncState<T>>({ status: "idle" })
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      active.current?.abort()
    }
  }, [])
  const cancel = useCallback(() => {
    active.current?.abort()
    active.current = null
    if (mounted.current) setState({ status: "idle" })
  }, [])
  const run = useCallback(
    async (...args: A): Promise<T | undefined> => {
      if (!mounted.current) return
      active.current?.abort()
      const controller = new AbortController()
      active.current = controller
      setState({ status: "loading" })
      try {
        const data = await latest.current(controller.signal, ...args)
        if (mounted.current && !controller.signal.aborted) setState({ status: "success", data })
        return data
      } catch (cause) {
        if (mounted.current && !controller.signal.aborted) {
          setState({
            status: "error",
            error: cause instanceof Error ? cause : new Error(String(cause)),
          })
        }
        return undefined
      }
    },
    [latest]
  )
  return { state, run, cancel }
}
