import { onScopeDispose, shallowRef, watch, type Ref } from "vue"

export type RequestState<T> =
  { status: "loading" } | { status: "success"; data: T } | { status: "error"; error: Error }

export function useRequest<P, T>(
  params: Ref<P>,
  request: (params: P, signal: AbortSignal) => Promise<T>
) {
  const state = shallowRef<RequestState<T>>({ status: "loading" })
  const version = shallowRef(0)
  const stop = watch(
    [params, version],
    ([value], _previous, onCleanup) => {
      const controller = new AbortController()
      onCleanup(() => controller.abort())
      state.value = { status: "loading" }
      void Promise.resolve()
        .then(() => request(value, controller.signal))
        .then(
          (data) => {
            if (!controller.signal.aborted) state.value = { status: "success", data }
          },
          (cause: unknown) => {
            if (!controller.signal.aborted)
              state.value = {
                status: "error",
                error: cause instanceof Error ? cause : new Error(String(cause)),
              }
          }
        )
    },
    { immediate: true, flush: "sync" }
  )
  onScopeDispose(stop)
  return {
    state,
    reload: () => {
      version.value++
    },
  }
}
