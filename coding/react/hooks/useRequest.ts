import { useCallback, useEffect, useState } from "react"

export type RequestState<T> =
  { status: "loading" } | { status: "success"; data: T } | { status: "error"; error: Error }

export function useRequest<T>(request: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<RequestState<T>>({ status: "loading" })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: "loading" })
    // The signal also guards tasks that ignore cancellation.
    void Promise.resolve()
      .then(() => request(controller.signal))
      .then(
        (data) => {
          if (!controller.signal.aborted) setState({ status: "success", data })
        },
        (cause: unknown) => {
          if (!controller.signal.aborted) {
            setState({
              status: "error",
              error: cause instanceof Error ? cause : new Error(String(cause)),
            })
          }
        }
      )
    return () => controller.abort()
  }, [request, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
