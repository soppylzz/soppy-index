import { onScopeDispose, shallowRef, watch, type Ref } from "vue"

export function useIntersectionObserver(
  target: Ref<Element | null>,
  options: IntersectionObserverInit = {}
) {
  const entry = shallowRef<IntersectionObserverEntry | null>(null)
  const supported = typeof IntersectionObserver !== "undefined"
  const stop = watch(
    target,
    (element, _previous, onCleanup) => {
      entry.value = null
      if (!element || !supported) return
      let active = true
      const observer = new IntersectionObserver((entries) => {
        if (active) entry.value = entries.find((item) => item.target === element) ?? null
      }, options)
      observer.observe(element)
      onCleanup(() => {
        active = false
        observer.disconnect()
      })
    },
    { immediate: true, flush: "post" }
  )
  onScopeDispose(stop)
  return { entry, supported, stop }
}
