import { onScopeDispose, watch, type Ref } from "vue"

export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: Ref<HTMLElement | null>,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void
) {
  const stop = watch(
    target,
    (element, _previous, onCleanup) => {
      if (!element) return
      element.addEventListener(type, listener)
      onCleanup(() => element.removeEventListener(type, listener))
    },
    { immediate: true, flush: "post" }
  )
  onScopeDispose(stop)
  return stop
}
