import { onScopeDispose, shallowRef } from "vue"

export type AsyncState<T> =
  | { status: "idle" | "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error }

export function useAsyncState<A extends unknown[], T>(
  task: (signal: AbortSignal, ...args: A) => Promise<T>
) {
  const state = shallowRef<AsyncState<T>>({ status: "idle" })
  let active: AbortController | null = null
  let disposed = false
  const cancel = () => {
    active?.abort()
    active = null
    state.value = { status: "idle" }
  }
  const execute = async (...args: A): Promise<T | undefined> => {
    if (disposed) return
    active?.abort()
    const controller = new AbortController()
    active = controller
    state.value = { status: "loading" }
    try {
      const data = await task(controller.signal, ...args)
      if (!disposed && !controller.signal.aborted) state.value = { status: "success", data }
      return data
    } catch (cause) {
      if (!disposed && !controller.signal.aborted)
        state.value = {
          status: "error",
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }
      return undefined
    }
  }
  onScopeDispose(() => {
    disposed = true
    active?.abort()
  })
  return { state, execute, cancel }
}
